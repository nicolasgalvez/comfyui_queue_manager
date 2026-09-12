// Exercise the real built UI against failed-job API responses. No live backend.
import { test } from 'node:test';
import { chromium, expect } from '@playwright/test';
import { serveFrontend } from './frontend-server.mjs';

test('failed jobs show the reason, node and traceback after reload', { timeout: 30000 }, async () => {
  const server = await serveFrontend();
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.route('**/*', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/queue_manager/options') return route.fulfill({ json: { splash_screen: '1', __version__: '1' } });
      if (path === '/queue_manager/queue') return route.fulfill({ json: {
        running: [], pending: [[1, 'failed-job', {}, {
          db_id: 1, extra_pnginfo: { workflow: { id: 'workflow', workflow_name: 'Failing workflow' } },
          execution_status: { status_str: 'error', error: {
            node_id: '12', node_type: 'KSampler', exception_type: 'RuntimeError',
            exception_message: 'CUDA out of memory <script>not executable</script>',
            traceback: ['File sampler.py, line 42\n', 'RuntimeError: CUDA out of memory'],
          } },
        }]], info: { page: 0, page_size: 20, last_page: 0, total: 1 },
      } });
      if (path.startsWith('/api/') || path.startsWith('/queue_manager/')) return route.fulfill({ json: {} });
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    for (let visit = 0; visit < 2; visit++) {
      await page.getByRole('button', { name: 'Completed', exact: true }).click();
      await expect(page.getByText('Failed', { exact: true })).toBeVisible();
      await expect(page.getByText('RuntimeError: CUDA out of memory <script>not executable</script>', { exact: true })).toBeVisible();
      await expect(page.getByText('Node 12 · KSampler', { exact: true })).toBeVisible();
      await page.getByText('Show traceback', { exact: true }).click();
      await expect(page.locator('pre')).toContainText('File sampler.py, line 42');
      if (visit === 0) await page.reload();
    }
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
