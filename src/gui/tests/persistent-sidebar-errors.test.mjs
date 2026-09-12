/* global window, document, api */
// Browser event/DOM boundary: clearing notices on the next job or failing to
// remount them loses the failed node details this test asserts. No live service.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

test('right sidebar retains failed node details across jobs, remount and reload until dismissed', { timeout: 30000 }, async () => {
  const module = await readFile(new URL('../../../web/js/persistent-errors.js', import.meta.url), 'utf8');
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/errors.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/errors.js' ? module : `<div data-testid="properties-panel"><header>Workflow Overview</header><main>Current progress</main></div><script type="module">import {installPersistentErrors} from '/errors.js'; window.api = new EventTarget(); installPersistentErrors(api); window.ready=true;</script>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => window.ready);
    assert.equal(await page.locator('[data-qm-persistent-errors]').count(), 0);
    await page.evaluate(() => {
      const detail = { prompt_id: 'failed-workflow-A', node_id: '12', node_type: 'Load Image', exception_type: 'ValueError', exception_message: '<img src=x onerror="window.injected=true"> file missing' };
      api.dispatchEvent(new CustomEvent('execution_error', { detail }));
      api.dispatchEvent(new CustomEvent('execution_error', { detail }));
      api.dispatchEvent(new CustomEvent('execution_start', { detail: { prompt_id: 'different-workflow-B' } }));
    });
    const notice = page.locator('[data-qm-persistent-errors]');
    assert.equal(await notice.count(), 1);
    assert.match(await notice.innerText(), /Load Image · Node 12/);
    assert.match(await notice.innerText(), /failed-workflow-A/);
    assert.match(await notice.innerText(), /file missing/);
    assert.equal(await notice.locator('article').count(), 1);
    assert.equal(await notice.locator('img').count(), 0);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.equal(await page.locator('main').innerText(), 'Current progress');
    await page.evaluate(() => {
      document.querySelector('[data-testid="properties-panel"]').remove();
      const panel=document.createElement('div');panel.dataset.testid='properties-panel';
      panel.innerHTML='<header>Another workflow</header><main>Other graph</main>';document.body.append(panel);
    });
    await page.waitForFunction(() => document.querySelector('[data-testid="properties-panel"] [data-qm-persistent-errors]'));
    assert.match(await notice.innerText(), /failed-workflow-A/);
    await page.reload();
    await page.waitForFunction(() => window.ready);
    assert.match(await notice.innerText(), /file missing/);
    await page.getByRole('button', { name: 'Dismiss error for node 12' }).click();
    assert.equal(await notice.count(), 0);
    await page.reload();
    await page.waitForFunction(() => window.ready);
    assert.equal(await notice.count(), 0);
    await page.addInitScript(() => Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Disabled', 'SecurityError'); } }));
    await page.reload();
    await page.waitForFunction(() => window.ready);
    await page.evaluate(() => api.dispatchEvent(new CustomEvent('execution_error', { detail: { prompt_id: 'no-storage', node_id: '7', node_type: 'Sampler', exception_message: 'Memory notice' } })));
    assert.match(await notice.innerText(), /Memory notice/);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
