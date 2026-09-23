# Batch 06 — Legacy dependency removal and DOM security

## Objective

Remove remaining legacy browser dependencies and ensure model-derived values are never interpreted as HTML or executable code.

## Prerequisites

- Batch 05 complete.
- Explicit runtime and storage modules in place.

## In scope

- Remove jQuery and both bundled copies.
- Remove any remaining Watch.JS, js-cookie, Firebase, and Font Awesome files/references.
- Use standard DOM APIs for selection, events, classes, attributes, and animation behavior.
- Replace HTML-string UI construction with `createElement`, `textContent`, `.value`, and attribute APIs.
- Remove inline `onclick` and other inline handlers.
- Provide local textual or inline-SVG feedback without remote assets.
- Preserve Sphinx-rendered nested prose while treating model strings as text.
- Remove dead persistence/modal styles and unused options.
- Add injection/escaping fixtures and Content Security Policy-oriented checks.
- Inventory retained third-party dependencies and licenses.

## Out of scope

- Full accessibility redesign, although new DOM must not block it.
- Grading semantic changes.
- New product features.

## Validation

```text
npm run test:js
npm run build:js
python -m pytest
python -m build
```

Search generated HTML and package assets for removed dependencies, remote extension resources, inline handlers, and unsafe code patterns.

## Acceptance criteria

- No jQuery, Watch.JS, js-cookie, Firebase, or Font Awesome runtime remains.
- No extension-owned CDN request is required.
- Model titles/choices/explanations containing markup render as text.
- Extension code uses no inline event handlers or `eval`/`new Function`.
- A restrictive same-origin CSP does not block normal operation, subject to documented math-library constraints.
- Wheel contains only intended runtime assets.

## Suggested Codex prompt

> Implement Batch 06 from `docs/migration_batches/06-dependency-security.md`. Remove all listed legacy browser dependencies and replace unsafe string-built DOM with standard DOM APIs. Preserve grading, state, and persistence behavior. Add escaping and CSP-oriented tests, run all validations, and update `docs/migration_status.md`.

