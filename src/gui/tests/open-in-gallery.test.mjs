// Exercise the real built UI: with `open_in_gallery` on (the default), clicking a
// completed output opens the built-in gallery overlay. With it off, the click opens
// the output's own `/api/view` URL in a new tab - the same way ComfyUI's native
// "Open Image" does - for both the cover thumbnail and grid items. No live backend.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { serveFrontend } from './frontend-server.mjs';

const item = [1, 'prompt-1', {}, {
  db_id: 1,
  extra_pnginfo: { workflow: { id: 'test-workflow', workflow_name: 'Test workflow' } },
  total_files: 1,
  outputs: { '1': { images: [{ filename: 'test.png', subfolder: '', type: 'output' }] } },
}];

async function openCompletedTab(server, openInGallery) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('**/*', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/queue_manager/options') return route.fulfill({ json: {
      splash_screen: '1', __version__: '1', Gallery: { ShowImages: true }, open_in_gallery: openInGallery,
    } });
    if (path === '/queue_manager/queue') return route.fulfill({ json: {
      running: [], pending: [item], info: { page: 0, page_size: 20, last_page: 0, total: 1 },
    } });
    if (path.startsWith('/api/') || path.startsWith('/queue_manager/')) return route.fulfill({ json: {} });
    return route.continue();
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await page.getByTitle('Open gallery').first().waitFor();
  return { browser, page };
}

test('open_in_gallery on opens the built-in gallery', { timeout: 30000 }, async () => {
  const server = await serveFrontend();
  let browser;
  try {
    const result = await openCompletedTab(server, true);
    browser = result.browser;
    await result.page.getByTitle('Open gallery').first().click();
    await expect(result.page.getByRole('button', { name: 'Close (Esc)' })).toBeVisible();
    await expect(result.page.locator('body')).toHaveClass(/gallery-open/);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('open_in_gallery off opens the output the ComfyUI way, in a new tab', { timeout: 30000 }, async () => {
  const server = await serveFrontend();
  let browser;
  try {
    const result = await openCompletedTab(server, false);
    browser = result.browser;
    const [popup] = await Promise.all([
      result.page.context().waitForEvent('page'),
      result.page.getByTitle('Open gallery').first().click(),
    ]);
    await popup.waitForLoadState('domcontentloaded').catch(() => {});
    assert.match(popup.url(), /\/api\/view\?filename=test\.png(&|$)/);
    // The gallery must not have opened as a side effect.
    await expect(result.page.locator('body')).not.toHaveClass(/gallery-open/);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});

// The footer switch itself must be two real buttons (toggle semantics via aria-pressed),
// clickable anywhere on their box, not an onClick hung on a 24px <svg>. Fails while the
// icons are bare <svg onClick> inside title divs: getByRole('button') finds nothing.
test('the open-mode switch is a pair of aria-pressed buttons and pressing one persists it', { timeout: 30000 }, async () => {
  const server = await serveFrontend();
  let browser;
  const posts = [];
  try {
    const result = await openCompletedTab(server, true);
    browser = result.browser;
    const page = result.page;
    await page.route('**/queue_manager/options', async route => {
      if (route.request().method() === 'POST') { posts.push(route.request().postDataJSON()); return route.fulfill({ json: { success: true } }); }
      return route.fallback();
    });
    const gallery = page.getByRole('button', { name: 'Open outputs in the built-in gallery' });
    const newTab = page.getByRole('button', { name: 'Open outputs in a new tab' });
    await expect(gallery).toHaveAttribute('aria-pressed', 'true');
    await expect(newTab).toHaveAttribute('aria-pressed', 'false');
    // click the button's edge, well outside the glyph
    await newTab.click({ position: { x: 2, y: 2 } });
    await expect(newTab).toHaveAttribute('aria-pressed', 'true');
    await expect(gallery).toHaveAttribute('aria-pressed', 'false');
    assert.deepEqual(posts, [{ key: 'open_in_gallery', value: false }]);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
