# Batch 00 — Complete the characterization baseline

## Objective

Import the current implementation and characterization infrastructure into the target repository, then capture every currently documented quiz and spoiler behavior before refactoring production code. This batch changes target tests and test infrastructure only; imported production files must remain behaviorally identical to the legacy reference.

## Prerequisites

- The JavaScript and Sphinx suites pass in the legacy reference.
- The legacy production implementation remains under `C:\Users\perre\Dropbox\cours\demoSphinx\source\Sphinx_ext`.
- `D:\sphinx-yaq` is an initialized Git repository with a clean starting point.

## In scope

- Copy the legacy implementation, test harness, fixtures, and dependency manifests needed to run the baseline into the target, preserving behavior.
- Add JavaScript characterization tests in the target for:
  - `nospace` matching;
  - ordered sequences;
  - regex answers;
  - invalid mathematical syntax and unknown variables;
  - empty answers;
  - reset after correct, wrong, and revealed states;
  - multiple quizzes and multiple question types;
  - Unicode, quotes, backslashes, ampersands, and angle brackets;
  - failure of one quiz without losing readable page content.
- Add target Sphinx fixtures representing all examples in the legacy `source/quiz/index.rst`.
- Identify tests that characterize known defects in their names or comments.
- Document any behavior discovered that is absent from the technical description.

## Out of scope

- Production-code fixes.
- Package restructuring.
- JavaScript module extraction.
- Changes to authoring syntax or expected grading.

## Implementation guidance

- Exercise the actual vendored runtime through the existing jsdom harness.
- Avoid testing private incidental details unless they affect observable behavior.
- Keep known-defect assertions passing; do not turn them into desired-behavior tests yet.
- Add separate fixtures rather than making one Sphinx source file cover every failure mode.

## Validation

```text
npm run test:js
python -m pytest
```

Verify that the legacy repository did not change and that imported target production files have no intentional behavioral changes.

## Acceptance criteria

- Every documented question type and flag has an automated test.
- Reset, retry, reveal, and multi-quiz behavior are covered.
- Important escaping and Unicode cases are recorded.
- Known defects remain explicit characterization cases.
- Both test suites pass.
- `docs/migration_status.md` records the expanded test totals and newly discovered behavior.

## Suggested Codex prompt

> Implement Batch 00 from `docs/migration_batches/00-characterization-baseline.md` in `D:\sphinx-yaq`. Import the minimum legacy implementation and test infrastructure needed for the baseline, then expand only the target characterization suite. Do not modify `C:\Users\perre\Dropbox\cours\demoSphinx` or intentionally change imported production behavior. Preserve known defects, run both JavaScript and Python suites in the target, report remaining gaps, and update `docs/migration_status.md` when all acceptance criteria pass.
