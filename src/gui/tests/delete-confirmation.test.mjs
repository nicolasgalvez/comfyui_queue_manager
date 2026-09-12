// Browser/API boundary: removing a confirmation must allow an unapproved request
// and fail this test. Every backend request is intercepted; no live stack is used.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const root = new URL('../../../web/.gui/', import.meta.url);

test('delete controls require consent before sending any mutation', { timeout: 60000 }, async () => {
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname
        .replace('/extensions/comfyui_queue_manager/.gui/', '/');
      const file = pathname === '/' ? 'index.html' : pathname.slice(1);
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript'
        : file.endsWith('.css') ? 'text/css' : 'text/html');
      res.end(await readFile(new URL(file, root)));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch();
    for (const scenario of ['pending', 'running', 'external', 'clear', 'archive', 'completed', 'filtered', 'gallery']) {
      const page = await browser.newPage();
      const mutations = [];
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const item = [1, 'prompt-1', {}, {
        db_id: 1,
        extra_pnginfo: { workflow: { id: 'test-workflow', workflow_name: 'Test workflow' } },
        total_files: 1,
        outputs: { '1': { images: [{ filename: 'test.png', subfolder: '', type: 'output' }] } },
      }];
      if (scenario === 'external') delete item[3].extra_pnginfo;
      await page.route('**/*', async route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (!path.startsWith('/api/') && !path.startsWith('/queue_manager/')) return route.continue();
        if (request.method() !== 'GET') {
          mutations.push({ path, method: request.method(), body: request.postDataJSON(), url: request.url() });
          return route.fulfill({ json: { success: true } });
        }
        if (path === '/queue_manager/options') return route.fulfill({ json: {
          splash_screen: '1.0.0', __version__: '1.0.0', Gallery: { ShowImages: true },
        } });
        if (path === '/queue_manager/queue') return route.fulfill({ json: {
          running: ['running', 'external'].includes(scenario) ? [item] : [],
          pending: ['running', 'external'].includes(scenario) ? [] : [item],
          info: { page: 0, page_size: 20, last_page: 1, total: 21 },
        } });
        return route.fulfill({ body: '' });
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.getByRole('button', { name: 'Delete', exact: true }).waitFor();
      let button = page.getByRole('button', { name: 'Delete', exact: true });
      let message = /Delete this workflow/;
      let expectedPath = '/api/queue';
      if (['running', 'external'].includes(scenario)) {
        message = /Stop the running job/;
        expectedPath = '/api/interrupt';
      } else if (['archive', 'completed', 'gallery'].includes(scenario)) {
        await page.getByRole('button', { name: scenario === 'archive' ? 'Archive' : 'Completed', exact: true }).first().click();
        button = page.getByRole('button', { name: scenario === 'archive' ? 'Delete All Archive' : 'Delete All Completed Jobs', exact: true });
        message = scenario === 'archive' ? /all archived workflows across all pages/ : /all completed jobs across all pages/;
        expectedPath = '/queue_manager/queue';
      } else if (scenario === 'clear') {
        button = page.getByRole('button', { name: 'Delete All Pending', exact: true });
        message = /all pending workflows across all pages/;
      } else if (scenario === 'filtered') {
        await page.getByRole('button', { name: 'Test workflow', exact: true }).click();
        button = page.getByRole('button', { name: 'Delete All *', exact: true });
        message = /matching the current filters.*across all pages/;
        expectedPath = '/queue_manager/queue';
      }
      if (scenario === 'gallery') {
        await page.getByTitle('Open gallery').click();
        await page.locator('.media-actions button').first().click();
        button = page.getByRole('button', { name: 'Delete workflow', exact: true });
        message = /Delete this workflow/;
        expectedPath = '/api/queue';
      }
      const before = mutations.length;
      for (const consent of [false, true]) {
        const dialogHandled = page.waitForEvent('dialog', { timeout: 3000 }).then(async dialog => {
          assert.equal(dialog.type(), 'confirm');
          assert.match(dialog.message(), message, scenario);
          await (consent ? dialog.accept() : dialog.dismiss());
        });
        await button.click();
        await dialogHandled;
        if (consent) {
          await page.waitForTimeout(100);
          assert.equal(mutations.length, before + 1, scenario);
          assert.equal(mutations.at(-1).path, expectedPath, scenario);
          if (expectedPath === '/api/queue') assert.deepEqual(mutations.at(-1).body,
            scenario === 'clear' ? { clear: true } : { delete: ['prompt-1'] });
          if (scenario === 'filtered') assert.match(mutations.at(-1).url, /test-workflow/);
        } else {
          await page.waitForTimeout(100);
          assert.equal(mutations.length, before, scenario);
          assert.equal(await button.isVisible(), true, scenario);
        }
      }
      assert.deepEqual(errors, [], scenario);
      await page.close();
    }
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
