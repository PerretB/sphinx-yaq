# Batch 04 — Explicit runtime state and P0 behavior fixes

## Objective

Replace implicit watcher-driven state propagation with explicit deterministic transitions, fix the true/false workflow, and make initialization failures local and visible.

## Prerequisites

- Batch 03 modules and build pipeline complete.
- Direct grading/state tests available.

## In scope

- Define explicit operations for answer changes, grading, revealing, reset, aggregate recomputation, and rendering.
- Remove Watch.JS from the state path and package.
- Eliminate undeclared JavaScript globals.
- Fix wrong TF answers so they can be retried or revealed consistently with other question types.
- Ensure TF solution reveal updates the actual control model and disables the completed control.
- Defensively reject duplicate runtime quiz identifiers in manually invalid HTML.
- Preserve readable quiz prose when initialization fails.
- Contain failures per quiz/question and render a useful fallback message.
- Add focused state-transition and initialization-failure tests.

## Out of scope

- localStorage.
- jQuery removal if still required by the compatibility renderer.
- Full semantic/accessibility redesign.
- Grading algorithm changes.

## Intended state contract

- Unanswered questions remain editable.
- Wrong answers remain eligible for retry or reveal.
- Correct answers become complete and disabled.
- Revealed answers are distinguishable from user-correct answers.
- Reset restores unanswered/enabled state.
- Quiz aggregate state is derived synchronously from question states.

## Validation

```text
npm run test:js
npm run build:js
python -m pytest
```

Add a browser integration test when the e2e harness is available; otherwise retain jsdom integration coverage and record the deferred browser check.

## Acceptance criteria

- No Watch.JS runtime or polling interval remains.
- State transitions are explicit and deterministic.
- Old terminal-wrong-TF characterization is replaced by intended retry/reveal tests.
- A broken quiz does not prevent another quiz from working.
- Content remains readable when activation fails.
- No accidental global bindings remain.

## Suggested Codex prompt

> Implement Batch 04 from `docs/migration_batches/04-runtime-state.md`. Replace watcher-driven state with explicit deterministic transitions, correct the TF retry/reveal behavior, and isolate initialization failures. Do not add persistence, redesign accessibility, or change comparison semantics. Run all relevant tests and update `docs/migration_status.md`.

