import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const root = resolve("examples/demo/build/html");
if (!existsSync(resolve(root, "quiz/index.html"))) {
  throw new Error(
    "The generated demo is missing. Build it with: python -m sphinx -E -b html examples/demo/source examples/demo/build/html",
  );
}

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

createServer((request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const requested = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const file = resolve(root, `.${requested}`);
  if (!file.startsWith(`${root}${sep}`) || !existsSync(file)) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
  createReadStream(file).pipe(response);
}).listen(4173, "127.0.0.1");
