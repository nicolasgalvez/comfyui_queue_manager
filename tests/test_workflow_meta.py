"""API prompts submitted without ComfyUI's own workflow UI metadata must not crash the queue.

comfyui-mcp and bare API clients (curl) submit prompts whose extra_data either has no
extra_pnginfo at all, or has extra_pnginfo.workflow without "workflow_name"/"id". Before this
fix, qm_queue.py indexed those keys directly in five places (queue_put, queue_get, import_queue)
and raised KeyError - in queue_get's case inside ComfyUI's own prompt_worker thread, which then
dies and stops executing anything until ComfyUI is restarted. This file fails on the pre-fix code
with those same KeyErrors and passes once workflow_meta() supplies placeholders instead.

ComfyUI is the external boundary: its queue and server are minimal stand-ins, mirroring
test_execution_errors.py's stub pattern. The plugin's queue_put/queue_get/import_queue code
runs unchanged, against a temporary sqlite database. No live ComfyUI instance is used.
"""
import heapq
from pathlib import Path
import sys
import tempfile
import threading
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

external_modules = {name: ModuleType(name) for name in ("execution", "server", "folder_paths")}
external_modules["execution"].PromptQueue = SimpleNamespace()
prompt_server = SimpleNamespace(instance=None)
external_modules["server"].PromptServer = prompt_server

with patch.dict(sys.modules, external_modules):
    from src.comfyui_queue_manager import qm_db
    from src.comfyui_queue_manager.qm_queue import QM_Queue, workflow_meta


class WorkflowMetaHelperTest(unittest.TestCase):
    """The helper itself, isolated from any ComfyUI/queue machinery."""

    def test_no_extra_pnginfo_at_all_returns_placeholders(self):
        self.assertEqual(workflow_meta({}), ("(unnamed)", ""))
        self.assertEqual(workflow_meta(None), ("(unnamed)", ""))

    def test_workflow_present_without_workflow_name_returns_placeholders(self):
        # comfyui-mcp's case: extra_pnginfo.workflow exists but lacks workflow_name/id.
        extra_data = {"extra_pnginfo": {"workflow": {"nodes": []}}}
        self.assertEqual(workflow_meta(extra_data), ("(unnamed)", ""))

    def test_full_metadata_is_returned_byte_for_byte(self):
        extra_data = {"extra_pnginfo": {"workflow": {"workflow_name": "My Workflow", "id": "wf-1"}}}
        self.assertEqual(workflow_meta(extra_data), ("My Workflow", "wf-1"))


class QueueApiPromptsTest(unittest.TestCase):
    """Exercises queue_put / queue_get / import_queue directly, as ComfyUI calls them."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.original_db_path = qm_db.DB_PATH
        qm_db.DB_PATH = Path(self.temp.name) / "queue.db"
        qm_db.init_schema()

        lock = threading.RLock()
        self.heap = []
        self.task_counter = 0

        def fake_put(item):
            with lock:
                heapq.heappush(self.heap, item)

        def fake_get(timeout=None):
            with lock:
                if not self.heap:
                    return None
                item = heapq.heappop(self.heap)
                self.task_counter += 1
                return item, self.task_counter

        self.native = SimpleNamespace(
            mutex=lock,
            not_empty=threading.Condition(lock),
            queue=self.heap,
            task_counter=0,
            currently_running={},
            get=fake_get,
            put=fake_put,
            get_current_queue=lambda: None,
            get_tasks_remaining=lambda: 0,
            task_done=lambda *args: None,
        )
        prompt_server.instance = SimpleNamespace(
            prompt_queue=self.native,
            number=0,
            queue_updated=lambda: None,
            send_sync=lambda *args: None,
            user_manager=SimpleNamespace(settings=SimpleNamespace(get_settings=lambda _: {})),
        )
        options = SimpleNamespace(
            get=lambda key, default=False, timestamp=False: (None, None) if timestamp else default
        )
        self.queue = QM_Queue(SimpleNamespace(options=options))

    def tearDown(self):
        qm_db.get_conn().close()
        del qm_db._local.conn
        qm_db.DB_PATH = self.original_db_path
        self.temp.cleanup()

    def db_row(self, prompt_id):
        row = qm_db.read_single("SELECT name, workflow_id FROM queue WHERE prompt_id = ?", (prompt_id,))
        return tuple(row) if row is not None else None

    def test_queue_put_without_workflow_name_stores_placeholder_and_dispatches(self):
        # extra_pnginfo.workflow present, but no workflow_name/id - comfyui-mcp's shape.
        item = [1, "mcp-prompt", {}, {"extra_pnginfo": {"workflow": {"nodes": []}}}]

        self.queue.queue_put(item)  # must not raise KeyError

        row = self.db_row("mcp-prompt")
        self.assertEqual(row, ("(unnamed)", ""))
        # Queue was empty and not paused, so it should have been dispatched onto the native heap too.
        self.assertEqual(len(self.heap), 1)

    def test_queue_get_does_not_crash_on_bare_api_item_with_no_extra_pnginfo(self):
        # No extra_pnginfo at all - a bare curl POST /prompt. queue_put bypasses the DB for this
        # (existing behaviour) and puts it straight on the native heap.
        item = (1, "bare-prompt", {}, {})
        self.queue.queue_put(item)
        self.assertEqual(len(self.heap), 1)

        result = self.queue.queue_get(timeout=0)  # must not raise KeyError; prompt_worker must survive

        self.assertIsNotNone(result)
        self.assertEqual(result[0], item)

    def test_queue_get_does_not_crash_on_item_missing_workflow_name(self):
        item = [1, "mcp-prompt", {}, {"extra_pnginfo": {"workflow": {"nodes": []}}}]
        self.queue.queue_put(item)
        self.assertEqual(len(self.heap), 1)

        result = self.queue.queue_get(timeout=0)  # must not raise KeyError

        self.assertIsNotNone(result)

    def test_import_queue_without_workflow_name_stores_placeholder(self):
        items = [[1, "imported-prompt", {}, {"extra_pnginfo": {"workflow": {"nodes": []}}}]]

        total, count = self.queue.import_queue(items, status=0)  # must not raise KeyError

        self.assertEqual((total, count), (1, 1))
        row = self.db_row("imported-prompt")
        self.assertEqual(row, ("(unnamed)", ""))

    def test_existing_behaviour_is_unchanged_for_full_metadata(self):
        item = [1, "full-prompt", {}, {"extra_pnginfo": {"workflow": {"workflow_name": "My Workflow", "id": "wf-1"}}}]

        self.queue.queue_put(item)

        row = self.db_row("full-prompt")
        self.assertEqual(row, ("My Workflow", "wf-1"))


if __name__ == "__main__":
    unittest.main()
