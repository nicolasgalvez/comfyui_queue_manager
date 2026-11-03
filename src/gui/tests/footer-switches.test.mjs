// The Completed-tab footer controls must be real buttons that work when clicked at the
// edge of their box (not only on the 24px glyph) and expose their state through
// aria-pressed. Fails while they are bare <svg onClick> elements: getByRole('button') finds none.
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

async function withFooter(fn) {
  const server = await serveFrontend();
  const browser = await chromium.launch();
  const posts = [];
  try {
    const page = await browser.newPage();
    await page.route('**/*', async route => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      if (path === '/queue_manager/options') {
        if (req.method() === 'POST') { posts.push(req.postDataJSON()); return route.fulfill({ json: { success: true } }); }
        return route.fulfill({ json: { splash_screen: '1', __version__: '1', Gallery: { ShowImages: true },
          open_in_gallery: true, thumb_mode: 'grid', thumb_size: 150 } });
      }
      if (path === '/queue_manager/queue') return route.fulfill({ json: {
        running: [], pending: [item], info: { page: 0, page_size: 20, last_page: 0, total: 1 } } });
      if (path.startsWith('/api/') || path.startsWith('/queue_manager/')) return route.fulfill({ json: {} });
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    await page.getByRole('group', { name: 'Thumbnails' }).waitFor();
    await fn(page, posts);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

test('thumbnail-mode switch: three aria-pressed buttons, each works from its box edge', { timeout: 30000 }, async () => {
  await withFooter(async (page, posts) => {
    const group = page.getByRole('group', { name: 'Thumbnails' });
    const none = group.getByRole('button', { name: 'No thumbnails' });
    const cover = group.getByRole('button', { name: 'Cover image only' });
    const grid = group.getByRole('button', { name: 'Show all outputs' });
    await expect(grid).toHaveAttribute('aria-pressed', 'true');
    await expect(none).toHaveAttribute('aria-pressed', 'false');
    await none.click({ position: { x: 2, y: 2 } });
    await expect(none).toHaveAttribute('aria-pressed', 'true');
    await expect(grid).toHaveAttribute('aria-pressed', 'false');
    await cover.click({ position: { x: 2, y: 2 } });
    await expect(cover).toHaveAttribute('aria-pressed', 'true');
    await expect(none).toHaveAttribute('aria-pressed', 'false');
    await grid.click({ position: { x: 2, y: 2 } });
    await expect(grid).toHaveAttribute('aria-pressed', 'true');
    assert.deepEqual(posts, [
      { key: 'thumb_mode', value: 'none' },
      { key: 'thumb_mode', value: 'cover' },
      { key: 'thumb_mode', value: 'grid' },
    ]);
  });
});

test('thumbnail size step icons are labelled buttons that change the size', { timeout: 30000 }, async () => {
  await withFooter(async (page, posts) => {
    await page.getByRole('button', { name: 'Larger thumbnails' }).click();
    await page.getByRole('button', { name: 'Smaller thumbnails' }).click();
    await expect.poll(() => posts.length).toBe(2);
    assert.deepEqual(posts, [
      { key: 'thumb_size', value: 160 },
      { key: 'thumb_size', value: 150 },
    ]);
  });
});
