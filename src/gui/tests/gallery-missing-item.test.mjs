// Issue #9: the gallery is built from the queue's `pending` list only, but a Completed
// row can also come from `running` (a job with partial outputs). Clicking View on such a
// row opens the gallery on an item that is not in the gallery data. It must not crash
// the panel: it shows another item. Fails on main with the pageerror
// "Cannot read properties of null (reading 'queueItem')". No live backend.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { serveFrontend } from './frontend-server.mjs';

const makeItem = (id, filename) => [id, `prompt-${id}`, {}, {
  db_id: id,
  extra_pnginfo: { workflow: { id: `wf-${id}`, workflow_name: `Workflow ${id}` } },
  total_files: 1,
  outputs: { '1': { images: [{ filename, subfolder: '', type: 'output' }] } },
}];

test('opening the gallery on an item missing from the gallery data shows another item', { timeout: 30000 }, async () => {
  const server = await serveFrontend();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route('**/*', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/queue_manager/options') return route.fulfill({ json: {
        splash_screen: '1', __version__: '1', Gallery: { ShowImages: true }, open_in_gallery: true,
      } });
      if (path === '/queue_manager/queue') return route.fulfill({ json: {
        running: [makeItem(1, 'running.png')], pending: [makeItem(2, 'pending.png')],
        info: { page: 0, page_size: 20, last_page: 0, total: 2 },
      } });
      if (path.startsWith('/api/') || path.startsWith('/queue_manager/')) return route.fulfill({ json: {} });
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    await page.getByTitle('Open gallery').first().waitFor();
    // the first row is the running job, which the gallery data does not contain
    await page.getByRole('button', { name: 'View', exact: true }).first().click();
    await expect(page.locator('body')).toHaveClass(/gallery-open/);
    await page.waitForTimeout(500);
    assert.deepEqual(pageErrors, []);
    await expect(page.locator('.gallery-page .image-box header')).toContainText('Workflow 2');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
