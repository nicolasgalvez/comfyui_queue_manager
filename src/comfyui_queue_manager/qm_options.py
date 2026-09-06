from datetime import datetime

from .qm_db import write_query, read_single, read_query
import json


# Options manager with caching
class QM_Options:
    def __init__(self):
        # cache for options
        self.__options = {}

    def set(self, key, value=None):
        write_query(
            """
            INSERT INTO options(key, value)
            VALUES(?, ?)
            ON CONFLICT(key) DO UPDATE
              SET value = excluded.value;
        """,
            (key, json.dumps(value)),
        )
        self.__options[key] = value

    def get(self, key, default=None, with_timestamp=False):
        if key in self.__options:
            if with_timestamp:
                return self.__options[key]
            else:
                return self.__options[key][0]

        value = read_single(
            """
                SELECT value, updated_at FROM options
                WHERE key = ?
            """,
            (key,),
        )

        if value is None:
            return_value = default
            timestamp = datetime.now()
        else:
            return_value = json.loads(value[0]) if value else default
            timestamp = value[1]

        self.__options[key] = (return_value, timestamp)

        if with_timestamp:
            return return_value, timestamp
        else:
            return return_value

    def get_all(self):
        options = read_query(
            """
                SELECT key, value, updated_at FROM options
            """
        )

        if options is None:
            return {}

        for key, value, updated_at in options:
            self.__options[key] = (json.loads(value), updated_at)

        # return without timestamps
        return {k: v[0] for k, v in self.__options.items()}
