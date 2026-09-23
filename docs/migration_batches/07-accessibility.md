# Batch 07 — Accessibility and interaction

## Objective

Make every quiz and spoiler interaction semantic, keyboard-operable, labelled, and understandable without relying on color or icons alone.

## Prerequisites

- Batch 06 standard-DOM renderer complete.
- Real-browser test harness available or introduced here.

## In scope

- Use native buttons for Grade, Show solution, Restart, and inline disclosure.
- Implement TF with a labelled radio group or equivalent native semantic control.
- Associate text inputs and selects with accessible question labels/context.
- Use fieldsets/legends where appropriate.
- Add textual Correct, Incorrect, Unanswered, and Solution shown feedback.
- Announce meaningful status changes through an appropriate live region.
- Add visible `:focus-visible` styles.
- Ensure keyboard-only operation and sensible disabled states.
- Test narrow layout, zoom/reflow, contrast, and missing decorative assets.
- Add automated axe checks and manual-test notes.

## Out of scope

- Comparison-algorithm changes.
- New quiz types.
- Large visual redesign unrelated to accessibility.

## Required tests

- Tab and keyboard activation for all actions.
- TF selection through keyboard controls.
- Accessible role/name assertions.
- Status announcement markup after grade/reveal/reset.
- axe scan before and after interactions.
- No reliance on color/icon as the sole feedback channel.

## Validation

```text
npm run test:js
npm run build:js
python -m pytest
```

Run Playwright interaction/accessibility tests and record any manual checks that automation cannot cover.

## Acceptance criteria

- No click-only span or anchor control remains.
- Every form field and action has an accessible name.
- All behavior is available with keyboard alone.
- State feedback is textual and exposed to assistive technology.
- No unreviewed serious automated accessibility violation remains.
- Visual focus is clear and layout works at narrow widths/zoom.

## Suggested Codex prompt

> Implement Batch 07 from `docs/migration_batches/07-accessibility.md`. Convert the current UI to semantic, keyboard-operable controls with accessible labels and textual/live feedback. Preserve grading, state, and persistence semantics. Add browser interaction and axe tests, run all validations, and update `docs/migration_status.md`.

