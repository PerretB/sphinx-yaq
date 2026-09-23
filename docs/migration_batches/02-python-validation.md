# Batch 02 — Python parsing, validation, and safe output

## Objective

Move model errors from the browser to the Sphinx build, eliminate unsafe/manual serialization, enforce document-scoped quiz IDs, and make HTML-only support explicit.

## Prerequisites

- Batch 01 complete and wheel-install test passing.
- Existing authoring examples represented in tests.

## In scope

- Add typed normalized models for `TF`, `FB`, and `SC` questions.
- Parse the Docutils role's text with `json.loads`; remove fixed slicing of raw role syntax.
- Validate required fields, types, flags, option combinations, sizes, choices, answers, and math variable intervals.
- Produce document/line-aware system messages for author errors.
- Enforce unique quiz identifiers within a document.
- Replace `config.config_values` parsing flags with document-local context using public APIs and guaranteed cleanup.
- Serialize models using standard JSON and proper HTML attribute escaping.
- Escape titles, IDs, choice labels, and spoiler plain text appropriately.
- Add an early builder guard that raises a clear error for non-HTML formats.
- Ensure roles always return `(nodes, messages)`.
- Return accurate extension metadata; keep `parallel_read_safe` false unless verified.

## Out of scope

- Browser-runtime redesign.
- localStorage.
- Accessibility overhaul.
- Comparison-algorithm changes.

## Required behavior changes

- Malformed JSON fails during the Sphinx build.
- Unsupported question types and invalid options fail during the build.
- Duplicate IDs fail during the build.
- Non-HTML builders fail early with a deliberate HTML-only message.
- HTML-like title/value strings render as text rather than executable markup.

Update the corresponding old characterization tests deliberately; do not delete them without replacement.

## Validation

```text
npm run test:js
python -m pytest
python -m build
```

Include Sphinx fixtures for every validation error and an unsupported-builder smoke test.

## Acceptance criteria

- Valid legacy examples build unchanged in meaning.
- Invalid declarations produce source-aware diagnostics.
- No visitor constructs JSON through string replacement or interpolation.
- Duplicate IDs are caught before browser execution.
- Unsupported builders fail with the documented message.
- Parser state cannot leak after a failed nested parse.
- Installed-wheel HTML build still passes.

## Suggested Codex prompt

> Implement only Batch 02 from `docs/migration_batches/02-python-validation.md`. Add test-led build-time parsing, validation, safe serialization, document-scoped duplicate-ID detection, and explicit HTML-only enforcement. Preserve valid legacy content and do not redesign the JavaScript runtime. Run all suites and update `docs/migration_status.md` with each intentional compatibility change.

