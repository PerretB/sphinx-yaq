# Project instructions

## Purpose and scope

This repository is the target for migrating a legacy Sphinx extension for interactive HTML quizzes into a pip-installable package.

Repository roles are fixed for the migration:

- Target repository: `D:\sphinx-yaq`. Make all refactoring, packaging, CI, release, and Git changes here.
- Legacy reference: `C:\Users\perre\Dropbox\cours\demoSphinx`. Inspect and run it as the behavioral oracle, but do not reorganize or fix its production implementation unless the user explicitly requests that separate work.
- Copy or reimplement required source, tests, and demo material into this repository. Do not make the migration depend on modifying the legacy reference in place.

Use these files according to the task:

- `docs/migration_plan.md` for architecture, priorities, and the final definition of done.
- `docs/migration_status.md` for the current batch, completed work, active decisions, and blockers.
- `docs/migration_batches/` for the implementation contract of a specific batch.
- `tests/README.md` for the current characterization-test setup.
- `docs/technical_description.md` for existing behavior and architecture.

Read only the documents relevant to the requested work. Do not load every migration document for a small isolated task.

## Fixed product constraints

- Support HTML Sphinx builders only. Unsupported builders must eventually fail early with a clear error; do not implement non-HTML rendering.
- Remove Firebase, authentication, cloud synchronization, and cookie persistence completely.
- Persist progress locally with versioned, namespaced `localStorage` only.
- Preserve the existing `quiz` and `spoiler` authoring syntax until a batch explicitly changes it.
- Treat quizzes as self-assessment. Correct answers remain client-side and are not secure examination data.

## Batch discipline

- Implement only the requested batch or explicitly named subset.
- Do not begin later migration phases opportunistically.
- Preserve behavior unless the active batch identifies an intentional correction.
- Add or update a failing test before an intentional behavior change.
- Keep the target repository usable and its copied demo buildable at every completed batch.
- Update `docs/migration_status.md` when a batch materially advances, a decision is made, or a blocker is discovered.
- Do not mark a batch complete until all of its acceptance criteria and validation commands pass.

## Current and target organization

The target repository starts as a minimal Git repository. During migration, inspect `docs/migration_status.md` before assuming that a listed target path has been created.

The target layout is:

- Python package: `src/sphinx_yaq/`
- Editable JavaScript source: `frontend/src/`
- JavaScript unit/component tests: `frontend/tests/`
- Python and Sphinx tests: `tests/python/` and `tests/roots/`
- Browser tests: `tests/e2e/`
- Demonstration project: `examples/demo/`
- Generated package assets: `src/sphinx_yaq/_static/sphinx_yaq/`

After JavaScript modules and a build step exist, edit `frontend/src/`, not the generated bundle. Rebuild the package asset and verify that generated output is current.

## Baseline behavior

The pre-refactoring characterization suite is the initial source of truth. Some tests intentionally record known defects. When fixing one of those defects:

1. identify the characterization test;
2. replace its old expectation with the intended contract;
3. add focused lower-level tests where possible;
4. mention the intentional compatibility change in the handover and changelog.

Do not delete a failing characterization test merely to make a refactor pass.

## Testing

Run the narrowest relevant tests while iterating, then run both baseline suites before completing a batch:

```text
npm run test:js
python -m pytest
```

Install dependencies when needed with:

```text
npm ci
python -m pip install -r requirements-test.txt
```

When packaging/build commands are introduced, completed packaging-related batches must also run:

```text
npm run build:js
python -m build
```

Additional rules:

- Do not hide or broadly suppress Sphinx deprecation warnings; resolve them in the appropriate batch.
- Do not claim meaningful JavaScript coverage while production code is loaded only through the legacy eval-based harness. Enable source coverage after modules are importable.
- Use Sphinx's real test application for integration behavior rather than mocking all Sphinx internals.
- For behavior spanning generated HTML and browser runtime, add a browser-level test when the e2e harness becomes available.
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
- Add keyboard and automated accessibility tests in the accessibility batch.

## Documentation and handover

For completed implementation work, report:

- behavior and files changed;
- intentional compatibility changes;
- tests and build commands run with results;
- warnings or validations not run;
- changes to `docs/migration_status.md`;
- the next recommended batch, without starting it.

Keep `docs/migration_plan.md` stable as the architectural source of truth. Put day-to-day progress and decisions in `docs/migration_status.md`.

## Repository safety

- Preserve unrelated user changes.
- Do not rewrite Git history or perform destructive cleanup.
- Do not commit unless the user explicitly asks for a commit.
- Do not edit generated archives or vendored minified dependencies as a substitute for changing their source or build process.
