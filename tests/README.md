# Characterization test suite

These tests capture the behavior of the imported implementation during its
packaging and refactoring. Production files live under `src/sphinx_yaq`.

## JavaScript tests

Install the locked Node dependencies and run Vitest:

```console
npm ci
npm run test:js
```

The integration tests load the vendored math.js and the generated
`yaq.js` bundle into an isolated jsdom window. Each test closes
that window so runtime state cannot leak into the next test. The suite
characterizes all three question types and every documented
matching flag, including retry, reveal, reset, multi-quiz, malformed-math,
empty-answer, and special-character behavior.

Direct Node tests import the pure grading and aggregate-state modules from
`frontend/src/`. Vitest reports source coverage for those extracted production
modules. `npm run test:js` first verifies that the packaged browser bundle is
byte-for-byte current with its source; rebuild it with `npm run build:js` after
editing frontend source.

The storage unit and integration tests cover versioned save/load behavior,
path and quiz isolation, debouncing, all restored answer states, restart
removal, definition compatibility, corrupt data, denied storage, and quota
failure.

## Real-browser reload test

Build the demo and run the Playwright test against its generated HTML:

```console
python -m sphinx -E -b html examples/demo/source examples/demo/build/html
npm run test:e2e
```

The test uses installed Chrome or Edge on Windows when available, otherwise
Playwright's Chromium, and verifies persistence through an actual page reload
without unexpected browser-console errors.

Tests deliberately record the remaining known current behavior:

- the prose-documented `regexp` flag is ignored because the runtime checks for
  `regex`; and
- an undeclared mathematical variable receives generic error text rather than
  the available unknown-variable message.

These assertions should be deliberately updated when those behaviors are fixed.

## Python/Sphinx tests

Install the Python test dependencies and run pytest:

```console
python -m pip install -r requirements-test.txt
python -m pytest
```

The six tests use Sphinx's own pytest fixtures to build small documentation
roots. They verify emitted HTML, encoded question models, copied assets,
spoilers, every example form from the legacy quiz guide, important Unicode and
escaping cases, and the current behavior of deferring malformed question JSON
to the browser.

## Installed-wheel smoke test

After `python -m build`, run:

```console
python scripts/smoke_test_wheel.py
```

The script creates a temporary virtual environment, installs the wheel, and
builds a minimal HTML fixture outside the repository. It verifies that the
extension import and namespaced assets come from the installed wheel rather
than the source checkout. Pass `--sphinx VERSION` to verify a specific Sphinx
version, including the declared lower bound.
