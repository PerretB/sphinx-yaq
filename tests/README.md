# Characterization test suite

These tests capture the behavior of the current implementation before its
packaging and refactoring. Production files under `source/Sphinx_ext` are not
modified by the test harness.

## JavaScript tests

Install the locked Node dependencies and run Vitest:

```console
npm ci
npm run test:js
```

The 22 tests load the existing vendored jQuery, Watch.JS, js-cookie, math.js,
and `yaq.js` files into an isolated jsdom window. Each test closes that window
so the interval created by Watch.JS does not leak into the next test. The suite
characterizes all three question types and every documented matching flag,
including retry, reveal, reset, multi-quiz, malformed-math, empty-answer, and
special-character behavior.

Code coverage is intentionally not reported yet: the legacy runtime is loaded
as an evaluated browser script, so Vitest would report coverage for the test
harness rather than meaningful coverage for `yaq.js`. Coverage should be added
after the runtime is split into importable modules during refactoring.

Tests deliberately record known current behavior rather than desirable future
behavior:

- a wrong true/false answer is terminal and cannot reveal the solution;
- duplicate quiz identifiers are accepted;
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
