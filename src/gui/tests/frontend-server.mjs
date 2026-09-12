import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const root = new URL('../../../web/.gui/', import.meta.url);

export async function serveFrontend() {
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
  return server;
}
