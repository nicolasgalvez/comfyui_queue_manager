// Browser/API boundary: "Delete Selected" must not send its request before the
// user confirms. Removing the confirmation lets the dismissed click through and
// fails this test. The footer is collapsed by default; hiding the selection
// buttons with it leaves selection mode with nothing to click and fails it too. Every
// backend request is intercepted; no live stack is used.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { serveFrontend } from './frontend-server.mjs';

test('Delete Selected asks for consent before sending the selection', { timeout: 30000 }, async () => {
  const server = await serveFrontend();
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    const mutations = [];
    const item = id => [id, `prompt-${id}`, {}, {
      db_id: id, extra_pnginfo: { workflow: { id: 'workflow', workflow_name: `Workflow ${id}` } },
    }];
    await page.route('**/*', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (!path.startsWith('/api/') && !path.startsWith('/queue_manager/')) return route.continue();
      if (request.method() !== 'GET') {
        mutations.push({ path, body: request.postDataJSON() });
        return route.fulfill({ json: { success: true } });
      }
      if (path === '/queue_manager/options') return route.fulfill({ json: { splash_screen: '1', __version__: '1' } });
      if (path === '/queue_manager/queue') return route.fulfill({ json: {
        running: [], pending: [item(1), item(2)], info: { page: 0, page_size: 20, last_page: 0, total: 2 },
      } });
      return route.fulfill({ json: {} });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByRole('button', { name: 'Select queue items' }).click();
    await page.getByRole('checkbox', { name: 'Select all visible jobs' }).check();
    const button = page.getByRole('button', { name: 'Delete Selected' });
    const selection = () => mutations.filter(mutation => mutation.path === '/queue_manager/selection');

    for (const consent of [false, true]) {
      const dialogHandled = page.waitForEvent('dialog', { timeout: 3000 }).then(async dialog => {
        assert.equal(dialog.type(), 'confirm');
        assert.match(dialog.message(), /Delete the 2 selected items\? This cannot be undone\./);
        await (consent ? dialog.accept() : dialog.dismiss());
      });
      await button.click();
      await dialogHandled;
      await page.waitForTimeout(100);
      assert.equal(selection().length, consent ? 1 : 0);
    }
    assert.equal(selection()[0].body.action, 'delete');
    assert.deepEqual(selection()[0].body.ids, [1, 2]);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
