# Add custom API routes, using router
from .qm_gallery import QM_Gallery
from .qm_options import QM_Options

from .qm_queue import QM_Queue
from .qm_server import QM_Server
from .qm_db import init_schema


class QueueManager:
    def __init__(self, __version__):
        init_schema()
        self.options = QM_Options()
        self.queue = QM_Queue(self)
        self.gallery = QM_Gallery(self)
        self.server = QM_Server(self, __version__)

        return
