import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT || 4173);
export const APP_MODULE_PATHS = ['app', 'domain', 'focus', 'insights', 'daily-plan', 'storage'].map(name => `/src/${name}.js`);
const files = new Map([
  ['/', ['index.html', 'text/html']],
  ['/styles.css', ['styles.css', 'text/css']],
  ...APP_MODULE_PATHS.map(path => [path, [path.slice(1), 'text/javascript']])
]);

export async function handleRequest(req, res) {
  const file = files.get(new URL(req.url, 'http://localhost').pathname);
  if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(new URL(file[0], import.meta.url));
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Unable to load this page'); }
}

export function createFocusDeskServer() {
  return http.createServer(handleRequest);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  createFocusDeskServer().listen(port, '127.0.0.1', () => console.log(`Focus Desk is available at http://127.0.0.1:${port}`));
}
