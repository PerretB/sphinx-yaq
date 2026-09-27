# Project instructions

## Purpose and scope

This repository contains sphinx-yaq, a pip-installable Sphinx extension for
interactive self-assessment quizzes. Public documentation lives in `docs/`;
test setup is documented in `tests/README.md`.

## Fixed product constraints

- Support HTML Sphinx builders only. Unsupported builders must fail early with a clear error; do not implement non-HTML rendering.
- Do not add Firebase, authentication, cloud synchronization, or cookie persistence.
- Persist progress locally with versioned, namespaced `localStorage` only.
- Preserve the existing `quiz` and `spoiler` authoring syntax unless a requested change explicitly revises it.
- Treat quizzes as self-assessment. Correct answers remain client-side and are not secure examination data.

## Scope and behavior

- Implement only the requested scope.
- Preserve behavior unless the requested work identifies an intentional correction.
- Add or update a failing test before an intentional behavior change.
- Keep the repository usable and its demo buildable.
- Keep the package independent of external source checkouts.

## Repository layout

The layout is:

- Python package: `src/sphinx_yaq/`
- Editable JavaScript source: `frontend/src/`
- JavaScript unit/component tests: `frontend/tests/`
- Python and Sphinx tests: `tests/python/` and `tests/roots/`
- Browser tests: `tests/e2e/`
- Demonstration project: `examples/demo/`
- Generated package assets: `src/sphinx_yaq/_static/sphinx_yaq/`

Edit JavaScript in `frontend/src/`, not the generated bundle. Rebuild the package asset and verify that generated output is current.

## Baseline behavior

The test suite records the current behavior. Some tests intentionally record known defects. When fixing one of those defects:

1. identify the characterization test;
2. replace its old expectation with the intended contract;
3. add focused lower-level tests where possible;
4. mention the intentional compatibility change in the handover and changelog.

Do not delete a failing characterization test merely to make a refactor pass.

## Testing

Run the narrowest relevant tests while iterating, then run both main suites before completing implementation work:

```text
npm run test:js
python -m pytest
```

Install dependencies when needed with:

```text
npm ci
python -m pip install -r requirements-test.txt
```

For packaging-related changes, also run:

```text
npm run build:js
python -m build
python scripts/smoke_test_wheel.py
```

Additional rules:

- Do not hide or broadly suppress Sphinx deprecation warnings; resolve them in the relevant implementation.
- Measure JavaScript coverage on importable production modules.
- Use Sphinx's real test application for integration behavior rather than mocking all Sphinx internals.
- For behavior spanning generated HTML and browser runtime, add a browser-level test.
- Report skipped tests, warnings, and unavailable validations explicitly.

## Python and Sphinx guidelines

- Use public Sphinx and Docutils APIs.
- Keep model parsing and validation separate from directives and visitors.
- Return valid `(nodes, messages)` tuples from roles on every path.
- Produce source-aware author diagnostics instead of raw exceptions for invalid quiz declarations.
- Keep parser state document-local; do not mutate `config.config_values` as runtime state.
- Serialize data with standard JSON and proper HTML attribute escaping.
- Namespace packaged assets under `sphinx_yaq/`.
- Declare parallel safety only after it is verified by implementation and tests.

## JavaScript guidelines

- Prefer pure functions for grading and state transitions.
- Keep DOM rendering, persistence, and grading in separate modules.
- Use standard DOM APIs; do not reintroduce jQuery or Watch.JS.
- Do not interpolate model-derived strings into HTML. Use `textContent`, `.value`, and DOM attribute APIs.
- Do not add inline event handlers or extension-owned remote runtime assets.
- Keep state transitions deterministic and synchronously testable.
- Use semantic native controls and preserve keyboard/accessibility behavior.
- Handle one quiz's initialization failure without breaking other quizzes.

## Persistence guidelines

- `localStorage` is the only persistence backend.
- Storage must be optional from the runtime's perspective: denial, corruption, or quota failure must not prevent quiz use.
- Stored payloads require an explicit schema version.
- Keys must be namespaced by extension, schema, document scope, and quiz ID.
- Never add authentication, user accounts, telemetry, remote writes, Firebase, or other cloud services.
- Never store DOM fragments, functions, correct-answer definitions, or derived watcher metadata.

## Security and accessibility

- Treat titles, choices, explanations, IDs, and answer display strings as text, not trusted HTML.
- Preserve only nested content already rendered by Sphinx as document markup.
- Keep the final runtime compatible with a restrictive same-origin Content Security Policy.
- Use native buttons and form controls with accessible names.
- Provide textual feedback in addition to color or icons.
- Add keyboard and automated accessibility tests for accessibility changes.

## Documentation and handover

For completed implementation work, report:

- behavior and files changed;
- intentional compatibility changes;
- tests and build commands run with results;
- warnings or validations not run;
- remaining limitations and recommended follow-up work.

## Repository safety

- Preserve unrelated user changes.
- Do not rewrite Git history or perform destructive cleanup.
- Do not commit unless the user explicitly asks for a commit.
- Do not edit generated archives or vendored minified dependencies as a substitute for changing their source or build process.

## Public documentation

Public English Sphinx documentation lives in `docs/`.
Build public docs with `python -m sphinx -W -E -b html docs docs/_build/html`.
