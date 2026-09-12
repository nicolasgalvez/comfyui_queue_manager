"""Exercise completion -> persisted queue listing with a temporary database.

ComfyUI is the external boundary: its queue and server are minimal stand-ins.
The plugin's completion handler, persistence and listing code run unchanged.
No live ComfyUI instance or database is accessed.
"""
from pathlib import Path
import sys
import tempfile
import threading
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

external_modules = {name: ModuleType(name) for name in ('execution', 'server', 'folder_paths')}
external_modules['execution'].PromptQueue = SimpleNamespace()
prompt_server = SimpleNamespace(instance=None)
external_modules['server'].PromptServer = prompt_server

with patch.dict(sys.modules, external_modules):
    from src.comfyui_queue_manager import qm_db
    from src.comfyui_queue_manager.qm_queue import QM_Queue


class ExecutionErrorsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.original_db_path = qm_db.DB_PATH
        qm_db.DB_PATH = Path(self.temp.name) / 'queue.db'
        qm_db.init_schema()
        lock = threading.RLock()
        self.native = SimpleNamespace(
            mutex=lock, not_empty=threading.Condition(lock), currently_running={},
            get=lambda: None, put=lambda item: None, get_current_queue=lambda: None,
            get_tasks_remaining=lambda: 0, task_done=self.finish,
        )
        prompt_server.instance = SimpleNamespace(
            prompt_queue=self.native, number=0, queue_updated=lambda: None,
            send_sync=lambda *args: None,
            user_manager=SimpleNamespace(settings=SimpleNamespace(get_settings=lambda _: {})),
        )
        options = SimpleNamespace(get=lambda key, default=False, timestamp=False: (None, None) if timestamp else default)
        self.queue = QM_Queue(SimpleNamespace(options=options))
        self.item = [1, 'failed-prompt', {}, {'extra_pnginfo': {'workflow': {'id': 'workflow', 'workflow_name': 'Failing workflow'}}}]
        self.queue.import_queue([self.item], status=1)
        self.native.currently_running[1] = self.item

    def finish(self, item_id, *args):
        self.completion_args = (item_id, *args)
        self.native.currently_running.pop(item_id, None)

    def tearDown(self):
        qm_db.get_conn().close()
        del qm_db._local.conn
        qm_db.DB_PATH = self.original_db_path
        self.temp.cleanup()

    def completed(self):
        return self.queue.get_current_queue(page_size=20, route='completed')[1][0][3]

    def test_failed_job_retains_error_after_reopening_database(self):
        error = {'node_id': '12', 'node_type': 'KSampler', 'exception_type': 'RuntimeError',
                 'exception_message': 'CUDA out of memory', 'traceback': ['Traceback line'],
                 'current_inputs': {'secret': 'must not be stored'}}
        self.native.task_done(1, {'outputs': {}}, ('error', False, [('execution_error', error)]))
        qm_db.get_conn().close()
        del qm_db._local.conn
        result = self.completed().get('execution_status', {})
        self.assertEqual(result.get('status_str'), 'error')
        self.assertEqual(result['error']['exception_message'], 'CUDA out of memory')
        self.assertEqual(result['error']['node_id'], '12')
        self.assertEqual(result['error']['traceback'], ['Traceback line'])
        self.assertNotIn('current_inputs', result['error'])

    def test_error_without_outputs_or_details_still_marks_job_failed(self):
        self.native.task_done(1, None, ('error', False, []))
        self.assertEqual(self.completed()['execution_status'], {'status_str': 'error', 'error': None})

    def test_successful_rerun_replaces_old_error(self):
        self.native.task_done(1, {'outputs': {}}, ('error', False, [
            ('execution_error', {'exception_message': 'old failure'})]))
        self.native.currently_running[1] = self.item
        self.native.task_done(1, {'outputs': {}}, ('success', True, [
            ('execution_start', {'timestamp': 1000}),
            ('execution_success', {'timestamp': 3500}),
        ]))
        rows = self.queue.get_current_queue(page_size=20, route='completed')[1]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][3]['execution_status'], {'status_str': 'success', 'error': None})
        self.assertEqual(rows[0][3]['execution_time'], 2.5)

    def test_interruption_is_distinct_from_failure(self):
        self.native.task_done(1, {}, ('error', False, [('execution_interrupted', {'node_id': '12'})]))
        self.assertEqual(self.completed()['execution_status']['status_str'], 'interrupted')

    def test_unknown_status_is_not_presented_as_a_failure(self):
        self.native.task_done(1, {'outputs': {}}, None)
        self.assertIsNone(self.completed()['execution_status'])

    def test_deleted_job_still_finishes_native_queue_with_processor(self):
        self.queue.delete_items(['failed-prompt'])
        status = ('error', False, [])
        processor = lambda prompt: prompt
        self.native.task_done(1, {}, status, processor)
        self.assertEqual(self.completion_args, (1, {}, status, processor))
        self.assertEqual(self.native.currently_running, {})
        self.assertEqual(self.queue.get_current_queue(page_size=20, route='completed')[1], [])


if __name__ == '__main__':
    unittest.main()
