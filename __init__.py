# SIML: Enable option to toggle logging
import re
import pathlib

from .src.comfyui_queue_manager.qm_log import qm_log


def get_version() -> str:
    try:
        toml_path = pathlib.Path(__file__).resolve().parent / "pyproject.toml"
        content = toml_path.read_text(encoding="utf-8")

        # version in [project] section
        match = re.search(r'\[project\].*?version\s*=\s*"([^"]+)"', content, re.DOTALL)
        if match:
            return match.group(1)

        qm_log.info("Version not found in `pyproject.toml`")
        return "unknown"
    except Exception as e:
        qm_log.error(f"Error reading version: {e}")
        return "unknown"


__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
]


__version__ = get_version()


from .src.comfyui_queue_manager.queue_manager import QueueManager
from .src.comfyui_queue_manager.nodes import NODE_CLASS_MAPPINGS
from .src.comfyui_queue_manager.nodes import NODE_DISPLAY_NAME_MAPPINGS


# When the server is fully started, restore the queue from the shadow copy
# async def on_ready(app):
#     # TODO: Add a setting to enable/disable this feature
#     restore_queue()
# PromptServer.instance.app.on_startup.append(on_ready)

queueManager = QueueManager(__version__)
WEB_DIRECTORY = "./web"
