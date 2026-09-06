import logging
import os, sys

# ANSI colour codes
_YELLOW = "\033[33m"
_RESET = "\033[0m"


class QMLogger(logging.LoggerAdapter):
    """
    Adds a yellow “[Queue Manager]” prefix to every log record.
    Falls back to non-coloured prefix if the output stream
    isn’t a TTY (so logfiles stay clean).
    """

    def __init__(self, logger: logging.Logger):
        super().__init__(logger, extra={})
        self._prefix = f"{_YELLOW}[Queue Manager]{_RESET}" if os.isatty(sys.stderr.fileno()) else "[Queue Manager]"

    def process(self, msg, kwargs):
        # Inject the prefix
        return f"{self._prefix} {msg}", kwargs


qm_log = QMLogger(logging.getLogger(__name__))
