import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { JSDOM, VirtualConsole } from "jsdom";

const HERE = dirname(fileURLToPath(import.meta.url));
const STATIC = resolve(HERE, "../../src/sphinx_yaq/_static/sphinx_yaq");

const RUNTIME_FILES = [
  resolve(STATIC, "lib/jquery-3.2.1.min.js"),
  resolve(STATIC, "lib/watch.js"),
  resolve(STATIC, "lib/js.cookie.js"),
  resolve(STATIC, "math.js"),
  resolve(STATIC, "yaq.js"),
];

const RUNTIME_SOURCES = RUNTIME_FILES.map((path) => readFileSync(path, "utf8"));

export function encodeQuestion(model) {
  return Buffer.from(JSON.stringify(model), "utf8").toString("base64");
}

export function quizMarkup({
  uid = "quiz-1",
  title = "Fixture quiz",
  questions,
}) {
  const fields = questions
    .map(
      (question, index) =>
        `<p>Question ${index + 1}: <span class="yaq-q" data-model="${encodeQuestion(question)}"></span></p>`,
    )
    .join("");

  return `<div class="yaq" data-model='${JSON.stringify({ title, uid })}'>${fields}</div>`;
}

export async function settle(window, cycles = 8) {
  for (let index = 0; index < cycles; index += 1) {
    await new Promise((resolvePromise) => window.setTimeout(resolvePromise, 0));
  }
}

export async function loadRuntime(markup) {
  const jsdomErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => jsdomErrors.push(error));

  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, {
    pretendToBeVisual: true,
    runScripts: "outside-only",
    url: "https://example.test/course/index.html",
    virtualConsole,
  });

  for (const source of RUNTIME_SOURCES) {
    dom.window.eval(source);
  }

  if (dom.window.document.readyState === "loading") {
    await new Promise((resolvePromise) => {
      dom.window.document.addEventListener("DOMContentLoaded", resolvePromise, {
        once: true,
      });
    });
  }

  await settle(dom.window);

  return {
    dom,
    document: dom.window.document,
    jsdomErrors,
    window: dom.window,
    close() {
      dom.window.close();
    },
  };
}

export function button(document, label) {
  const match = [...document.querySelectorAll(".yaq-footer .yaq-button")].find(
    (element) => element.textContent.trim() === label,
  );

  if (!match) {
    throw new Error(`Button not found: ${label}`);
  }

  return match;
}

export function isDisplayed(element) {
  return element.style.display !== "none" && !element.classList.contains("yaq-hidden");
}
