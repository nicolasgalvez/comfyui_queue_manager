from .qm_db import read_single, read_query


class QM_Gallery:
    def __init__(self, queue_manager):
        return

    def get(self, item_id, file_name, subfolder=None):
        # Get completed item from queue by ID
        row = read_single(
            """
            SELECT updated_at
            FROM queue
            WHERE id = ?
            """,
            (item_id,),
        )

        if row is None:
            return None
        updated_at = row[0]

        # Get 100 items from completed queue that have outputs; 50 after the current time, 50 before
        rows = read_query(
            # language=SQL
            """
            WITH first_slice AS (
                SELECT *
                FROM   queue
                WHERE  id = :id
                   OR (id <> :id AND updated_at >= :cut)
                ORDER  BY updated_at
                LIMIT  50
            ),
            second_slice AS (
                SELECT *
                FROM   queue
                WHERE  updated_at < :cut
                ORDER  BY updated_at DESC
                LIMIT  50
            )

            SELECT * FROM first_slice
            UNION ALL
            SELECT * FROM second_slice
            ORDER BY updated_at DESC;

            """,
            {
                "id": item_id,
                "cut": updated_at,
            },
        )

        # return rows as a list of dictionaries
        return [
            {
                "id": row["id"],
                "updated_at": row["updated_at"],
                "number": row["number"],
            }
            for row in rows
        ]
