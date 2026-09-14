"""The `open_in_gallery` option must round-trip through the options API like `show_gallery_ui`.

qm_server.py hardcodes an `allowed_options` dict (with defaults) that both the GET and POST
`/queue_manager/options` handlers consult: GET fills in missing keys with defaults and POST
rejects any key not present in the dict, additionally type-checking booleans for
`queue_paused`/`show_gallery_ui`. Before wiring in the new "open outputs the ComfyUI way"
feature, `open_in_gallery` is absent from `allowed_options`, so this file fails on the
pre-change code: GET omits the key entirely and POST rejects it with "Option not allowed".
It passes once `open_in_gallery` is added next to `show_gallery_ui` with the same default
(True) and the same boolean validation.

ComfyUI is the external boundary: `server.PromptServer` is a minimal stand-in that only
captures the route handlers QM_Server registers via decorators, plus the bits of
`PromptServer.instance` its constructor touches (`app.middlewares`, `user_manager`).
The plugin's QM_Server code runs unchanged. No live ComfyUI instance is used.
"""
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

external_modules = {name: ModuleType(name) for name in ("execution", "server", "folder_paths")}
external_modules["execution"].PromptQueue = SimpleNamespace()
prompt_server = SimpleNamespace(instance=None)
external_modules["server"].PromptServer = prompt_server


class FakeRoutes:
    """Captures handlers registered via @routes.get(path) / @routes.post(path)."""

    def __init__(self):
        self.handlers = {}

    def get(self, path):
        def register(fn):
            self.handlers[("GET", path)] = fn
            return fn
        return register

    def post(self, path):
        def register(fn):
            self.handlers[("POST", path)] = fn
            return fn
        return register

    def delete(self, path):
        def register(fn):
            self.handlers[("DELETE", path)] = fn
            return fn
        return register


class FakeGetRequest:
    def __init__(self, query=None):
        self.query = query or {}


class FakePostRequest:
    def __init__(self, payload):
        self._payload = payload

    async def json(self):
        return self._payload


class FakeOptions:
    """Stands in for QueueManager's persisted options store."""

    def __init__(self):
        self._values = {}

    def get(self, key, default=None):
        return self._values.get(key, default)

    def get_all(self):
        return dict(self._values)

    def set(self, key, value):
        self._values[key] = value


with patch.dict(sys.modules, external_modules):
    from src.comfyui_queue_manager import qm_server as qm_server_module


class OpenInGalleryOptionTest(unittest.TestCase):
    def setUp(self):
        self.routes = FakeRoutes()
        self.options = FakeOptions()
        prompt_server.instance = SimpleNamespace(
            routes=self.routes,
            app=SimpleNamespace(middlewares=SimpleNamespace(insert=lambda index, mw: None)),
            user_manager=SimpleNamespace(),
        )
        queue_manager = SimpleNamespace(queue=SimpleNamespace(), gallery=SimpleNamespace(), options=self.options)
        with patch.dict(sys.modules, external_modules):
            self.server = qm_server_module.QM_Server(queue_manager, "0.0.0")
        self.get_options = self.routes.handlers[("GET", "/queue_manager/options")]
        self.set_options = self.routes.handlers[("POST", "/queue_manager/options")]

    def _json_body(self, response):
        return __import__("json").loads(response.body.decode())

    def test_open_in_gallery_is_an_allowed_option_defaulting_true(self):
        self.assertIn("open_in_gallery", self.server.allowed_options)
        self.assertEqual(self.server.allowed_options["open_in_gallery"], True)

    def test_get_all_options_fills_in_the_default_when_unset(self):
        import asyncio
        response = asyncio.run(self.get_options(FakeGetRequest()))
        body = self._json_body(response)
        self.assertEqual(body["open_in_gallery"], True)

    def test_post_sets_open_in_gallery_and_get_reflects_it(self):
        import asyncio
        set_response = asyncio.run(self.set_options(FakePostRequest({"key": "open_in_gallery", "value": False})))
        self.assertEqual(self._json_body(set_response), {"success": True})

        get_response = asyncio.run(self.get_options(FakeGetRequest(query={"key": "open_in_gallery"})))
        self.assertEqual(self._json_body(get_response), {"open_in_gallery": False})

    def test_post_rejects_non_boolean_value(self):
        import asyncio
        response = asyncio.run(self.set_options(FakePostRequest({"key": "open_in_gallery", "value": "nope"})))
        self.assertEqual(response.status, 400)


if __name__ == "__main__":
    unittest.main()
