// Exercise the real built UI: an API-submitted prompt (comfyui-mcp, bare curl)
// carries an extra_pnginfo.workflow without workflow_name. The row list and the
// gallery header must show "(unnamed)" instead of rendering nothing/"undefined",
// while a workflow that does carry a name is shown unchanged. No live backend.
import { test } from 'node:test';
import { chromium, expect } from '@playwright/test';
import { serveFrontend } from './frontend-server.mjs';

const apiItem = [1, 'api-prompt', {}, {
  db_id: 1,
  // No workflow_name: how comfyui-mcp/curl submissions arrive.
  extra_pnginfo: { workflow: { id: 'api-workflow' } },
  total_files: 1,
  outputs: { '1': { images: [{ filename: 'api.png', subfolder: '', type: 'output' }] } },
}];

const namedItem = [2, 'ui-prompt', {}, {
  db_id: 2,
  extra_pnginfo: { workflow: { id: 'ui-workflow', workflow_name: 'My Workflow' } },
  total_files: 1,
  outputs: { '1': { images: [{ filename: 'ui.png', subfolder: '', type: 'output' }] } },
}];

async function openCompletedTab(server) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('**/*', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/queue_manager/options') return route.fulfill({ json: {
      splash_screen: '1', __version__: '1', Gallery: { ShowImages: true }, open_in_gallery: true,
    } });
    if (path === '/queue_manager/queue') return route.fulfill({ json: {
      running: [], pending: [apiItem, namedItem], info: { page: 0, page_size: 20, last_page: 0, total: 2 },
    } });
    if (path.startsWith('/api/') || path.startsWith('/queue_manager/')) return route.fulfill({ json: {} });
    return route.continue();
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await page.getByTitle('Open gallery').first().waitFor();
  return { browser, page };
}

test('an API-submitted prompt without workflow_name is labeled "(unnamed)" in the row list', { timeout: 30000 }, async () => {
  const server = await serveFrontend();
  let browser;
  try {
    const result = await openCompletedTab(server);
    browser = result.browser;
    await expect(result.page.getByRole('button', { name: '(unnamed)', exact: true })).toBeVisible();
    await expect(result.page.getByRole('button', { name: 'My Workflow', exact: true })).toBeVisible();
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('the gallery header shows "(unnamed)" for that same prompt, and the real name otherwise', { timeout: 30000 }, async () => {
  const server = await serveFrontend();
  let browser;
  try {
    const result = await openCompletedTab(server);
    browser = result.browser;
    const galleries = result.page.getByTitle('Open gallery');

    await galleries.first().click();
    await expect(result.page.locator('.image-box header')).toContainText('(unnamed)');
    await result.page.getByRole('button', { name: 'Close (Esc)' }).click();

    await galleries.nth(1).click();
    await expect(result.page.locator('.image-box header')).toContainText('My Workflow');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
