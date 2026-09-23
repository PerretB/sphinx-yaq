# Batch 03 — JavaScript module extraction without behavior changes

## Objective

Create importable, directly testable JavaScript modules for grading and state computation while preserving current observable behavior, including known runtime defects scheduled for Batch 04.

## Prerequisites

- Batch 02 complete.
- Python-generated model schema stable enough for the new modules.

## In scope

- Create `frontend/src/` and `frontend/tests/`.
- Extract pure answer comparison into `grading.js`.
- Extract state constants and aggregate-state calculation into `model.js`.
- Introduce a reproducible browser build producing the packaged `quiz.js`.
- Add meaningful source coverage for importable modules.
- Keep a compatibility integration layer so the current UI continues to work.
- Make the generated bundle deterministic and verify it is current in CI or a test script.

## Out of scope

- Fixing TF terminal behavior.
- Replacing watcher-driven rendering.
- Adding localStorage.
- Removing jQuery/Watch.JS.
- Changing grading semantics.

## Implementation guidance

- First write table-driven tests representing current comparison outcomes.
- Inject sources of nondeterminism in APIs, but preserve current production behavior until Batch 08.
- Keep the old jsdom characterization suite as an integration safety net.
- Do not hand-edit the generated package bundle.

## Validation

```text
npm run test:js
npm run build:js
python -m pytest
python -m build
```

Rebuild assets and verify the working bundle matches generated output.

## Acceptance criteria

- Grading and state modules can be tested without jsdom.
- Production-source coverage is reported for the extracted modules.
- Existing browser behavior remains characterized and passing.
- Packaged bundle is reproducible and included in the wheel.
- Known TF and duplicate-runtime quirks are not silently changed in this batch.

## Suggested Codex prompt

> Implement Batch 03 from `docs/migration_batches/03-js-module-extraction.md`. Extract pure grading and state modules with direct tests and a reproducible build, while preserving current observable behavior. Keep known runtime defects unchanged for Batch 04. Run all JavaScript, Sphinx, and package validations and update `docs/migration_status.md`.

