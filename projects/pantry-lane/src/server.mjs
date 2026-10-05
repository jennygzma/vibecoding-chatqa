import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
export const ASSETS = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/app.mjs", "app.mjs"],
  ["/style.css", "style.css"],
  ["/src/inventory.mjs", "../src/inventory.mjs"],
  ["/src/recipes.mjs", "../src/recipes.mjs"],
  ["/src/menu.mjs", "../src/menu.mjs"],
  ["/src/shopping.mjs", "../src/shopping.mjs"],
  ["/src/storage.mjs", "../src/storage.mjs"],
]);
const contentType = (file) => file.endsWith(".css") ? "text/css; charset=utf-8" : file.endsWith(".mjs") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8";

export function createServer() {
  return http.createServer((request, response) => {
    const route = new URL(request.url, "http://127.0.0.1").pathname;
    if (request.method !== "GET" || !ASSETS.has(route)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    const file = path.resolve(publicRoot, ASSETS.get(route));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "Content-Type": contentType(file), "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(response);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4184);
  createServer().listen(port, "127.0.0.1", () => console.log(`Pantry Lane is available at http://127.0.0.1:${port}`));
}
