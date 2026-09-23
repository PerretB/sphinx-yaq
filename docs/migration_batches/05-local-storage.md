# Batch 05 — localStorage-only persistence

## Objective

Delete every cloud/authentication/cookie persistence path and implement resilient, versioned local browser progress storage.

## Prerequisites

- Batch 04 explicit state model complete.
- Decisions in `migration_status.md` resolved for default enablement, reset behavior, key scope, and quiz-definition compatibility.

## In scope

- Delete Firebase asset registration, `fbconfig.js`, cloud provider, authentication UI, domain restrictions, synchronization, and cloud queues.
- Delete cookie persistence and js-cookie usage.
- Add a small `QuizStorage` adapter with `load`, `save`, `remove`, and availability behavior.
- Namespace keys by extension, schema version, normalized document scope, and quiz ID.
- Persist a schema-versioned minimal state payload.
- Add a quiz-definition fingerprint or equivalent compatibility check.
- Debounce saves after meaningful state transitions.
- Clear the quiz record on Restart.
- Continue fully in memory when storage is denied, corrupt, full, or incompatible.
- Add an optional API to clear all extension records for the current origin/site namespace.
- Document local-only privacy and clearing behavior.

## Out of scope

- Any remote persistence, telemetry, accounts, or authentication.
- Cross-device synchronization.
- Accessibility redesign.
- Comparison changes.

## Required tests

- Save/load round trip.
- Isolation by path and quiz ID.
- Debounce with fake timers.
- Correct, wrong, revealed, and unanswered restoration.
- Restart removal.
- Corrupt JSON.
- Unknown schema version.
- Incompatible quiz fingerprint.
- localStorage getter/setter throwing.
- Quota failure.
- Real-browser reload restoring state.

## Validation

```text
npm run test:js
npm run build:js
python -m pytest
```

Run the browser reload test and inspect generated HTML for Firebase or authentication URLs.

## Acceptance criteria

- No Firebase, cloud, authentication, modal, or cookie code/assets remain.
- Progress survives reload locally.
- Restart removes saved progress.
- Bad/unavailable storage never prevents quiz use.
- Stored payload and key format are documented and versioned.
- Generated pages contain no Firebase references.

## Suggested Codex prompt

> Implement Batch 05 from `docs/migration_batches/05-local-storage.md`. Completely remove Firebase, authentication, cloud synchronization, and cookies. Add only resilient versioned localStorage persistence with the decisions recorded in `docs/migration_status.md`. Add unit and real-browser reload tests, run all validations, and update migration status.

