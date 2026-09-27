# Dependency and license inventory

Batch 06 inventory, verified against the built wheel and the locked local test
environment on 2026-09-24.

| Dependency | Use | License | Distributed in the wheel |
| --- | --- | --- | --- |
| Sphinx (>=7) | Python extension host | BSD-2-Clause | No; installed separately by pip |
| math.js 10.6.4 | Browser math answer comparison | Apache-2.0 | Yes, `_static/sphinx_yaq/math.js` |
| esbuild 0.28.2 | Builds the classic browser bundle | MIT | No |
| Vitest 4.1.11 and V8 coverage 4.1.11 | JavaScript tests | MIT | No |
| jsdom 27.4.0 | Runtime integration tests | MIT | No |
| Playwright Test 1.63.0 | Browser tests | Apache-2.0 | No |

Sphinx's Python dependencies and the transitive Node test/build dependencies
are resolved by their respective package managers; `package-lock.json` pins
the Node graph. The wheel includes the YAQ-generated `yaq.js`, the local CSS,
and math.js only. It does not include jQuery, Watch.JS, js-cookie, Firebase,
or Font Awesome. The demo uses Sphinx's Alabaster theme to avoid the old theme's
jQuery and Font Awesome assets.

The math.js distribution contains dormant `Function`/`new Function` fallback
expressions for older global-object detection. The Chromium CSP test executes
math grading with `script-src 'self'` and no `unsafe-eval` successfully; it
does not exercise every math.js code path. Replacing or narrowing math.js is
reserved for Batch 08's mathematical grammar work.
