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
  if (pathname === "/favicon.ico") {
    response.writeHead(204).end();
    return;
  }
  if (pathname === "/csp-fixture") {
    const question = Buffer.from(JSON.stringify({ type: "SC", values: "safe,<img src=x onerror=alert(1)>", answer: "safe", explanation: "<script>alert(2)</script>" })).toString("base64");
    const mathQuestion = Buffer.from(JSON.stringify({ type: "FB", flags: "math", answer: "2", "displayed-answer": "<svg onload=alert(1)>" })).toString("base64");
    const model = JSON.stringify({ uid: "csp-quiz", title: "<script>alert(1)</script>" }).replaceAll("'", "&#39;");
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'");
    response.end(`<!doctype html><html><head><link rel="stylesheet" href="/_static/sphinx_yaq/css/yaq.css"><script defer src="/_static/sphinx_yaq/math.js"></script><script defer src="/_static/sphinx_yaq/yaq.js"></script></head><body><div class="yaq" data-model='${model}'><p>Preserved <em>nested prose</em> <span class="yaq-q" data-model="${question}"></span></p><p>Math <span class="yaq-q" data-model="${mathQuestion}"></span></p></div><button type="button" class="yaq-spoiler-inline yaq-spoiler-inline-hidden">Hint</button></body></html>`);
    return;
  }
  const requested = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const file = resolve(root, `.${requested}`);
  if (!file.startsWith(`${root}${sep}`) || !existsSync(file)) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
  createReadStream(file).pipe(response);
}).listen(4173, "127.0.0.1");
