# YAQ migration status

Last updated: 2026-09-23

## Overall state

The target repository `D:\sphinx-yaq` is initialized on `main` and tracks `origin/main`. Batch 00 is complete: the legacy implementation and baseline infrastructure are imported without production changes, and the expanded characterization suite passes in the target.

## Current batch

**Batch 01 — Package skeleton and reproducible build**

Status: ready to start.

Batch specification: [`migration_batches/01-package-skeleton.md`](migration_batches/01-package-skeleton.md)

## Completed work

- Analyzed the Python extension, browser runtime, dependencies, CSS, demo configuration, and authoring syntax.
- Created `docs/technical_description.md`.
- Created `docs/prioritized_improvements.md`.
- Created `docs/migration_plan.md` with P0/P1/P2 traceability and final definition of done.
- Split the implementation into ten reviewed contracts under `docs/migration_batches/`.
- Added repository-level workflow, organization, testing, security, and handover guidance in `AGENTS.md`.
- Added the initial JavaScript characterization harness and nine passing Vitest/jsdom tests.
- Added four passing Sphinx HTML-build tests using Sphinx's pytest fixtures.
- Added Node and Python test dependency manifests and test documentation.
- Verified the initial suite with Node 24, Python 3.12, and Sphinx 9.1.
- Imported `source/Sphinx_ext` byte-for-byte from the legacy reference, along
  with the jsdom/Vitest harness, Sphinx fixtures, locked Node manifest, and
  Python test manifest.
- Expanded the JavaScript suite from 9 to 22 passing tests, covering every
  question type and matching flag, retry/reveal/reset transitions, malformed
  mathematics, empty answers, multiple quizzes, special characters, and
  per-quiz initialization failure.
- Expanded the Sphinx suite from 4 to 6 passing tests with fixtures for every
  example form in the legacy quiz guide and for Unicode/escaping behavior.
- Verified with a recursive no-index Git diff that imported production files
  remain identical to the legacy reference.

## Legacy validation baseline

```text
npm run test:js
  1 test file passed
  9 tests passed

python -m pytest
  4 tests passed
  3 existing Sphinx deprecation warnings
```

These results were recorded in `C:\Users\perre\Dropbox\cours\demoSphinx`. The warnings concern deprecated `BuildEnvironment.app` access in `source/Sphinx_ext/quiz.py`. They are intentionally visible and are scheduled for migration cleanup.

## Target Batch 00 validation

```text
npm run test:js
  1 test file passed
  22 tests passed

python -m pytest
  6 tests passed
  19 Sphinx deprecation warnings
```

The warning count is higher than the four-test legacy baseline because the new
documentation fixture renders 17 quiz roles. All warnings are repetitions of
the two already-known deprecated `BuildEnvironment.app` access sites; none are
suppressed.

## Fixed decisions

- HTML is the only supported Sphinx output format.
- Unsupported builders will be rejected early with a clear message; no fallback renderer will be developed.
- Firebase and all cloud/authentication code will be deleted rather than repaired.
- Browser persistence will use only versioned, namespaced `localStorage`.
- Existing `quiz` and `spoiler` syntax remains supported for the first packaged release.
- Migration is executed in reviewed batches rather than as one repository-wide rewrite.
- All migration implementation, packaging, commits, and release work happens in `D:\sphinx-yaq`.
- `C:\Users\perre\Dropbox\cours\demoSphinx` remains the legacy source and behavioral oracle and is not reorganized in place.

## Decisions still required

Resolve before or during the named batch:

| Decision | Needed by | Current recommendation |
| --- | --- | --- |
| PyPI distribution name | Batch 01 | `sphinx-yaq`, after availability check |
| Python import name | Batch 01 | `sphinx_yaq` |
| License | Resolved | MIT, already present in the target repository |
| Minimum Python/Sphinx versions | Batch 01/09 | Derive from the tested CI matrix |
| localStorage enabled by default | Batch 05 | Yes |
| Restart persistence behavior | Batch 05 | Remove the quiz's stored state |
| Persistence scope | Batch 05 | Origin + normalized path + quiz ID |
| Quiz-definition compatibility | Batch 05 | Store and verify a definition fingerprint |
| Legacy `regexp` spelling | Batch 08 | Accept once with a deprecation warning |
| Supported mathematical grammar | Batch 08 | Freeze from current documented examples before replacing math.js |

## Known current behavior captured by tests

- A wrong true/false answer is terminal and cannot reveal the solution.
- Duplicate quiz identifiers are accepted.
- Invalid question JSON is accepted by Sphinx and deferred to the browser.
- Local persistence is a no-op.
- The runtime implements `regex`, while the prose-documented `regexp` spelling
  is ignored.
- Unknown mathematical symbols use generic error text and leave the question
  retryable.
- Invalid top-level quiz JSON preserves that quiz's readable content and does
  not prevent a later valid quiz from initializing.
- A hidden reset control can still clear a retryable wrong fill-in state when
  invoked programmatically.

These are characterization statements, not desired final behavior.

## Active blockers

- The target is not yet a Python package.

Recommended next action: execute Batch 01 in `D:\sphinx-yaq` to create the package skeleton and reproducible asset build without changing characterized behavior.

## Batch checklist

- [x] Batch 00 — Complete characterization baseline
- [ ] Batch 01 — Package skeleton and reproducible build
- [ ] Batch 02 — Python parsing, validation, and safe output
- [ ] Batch 03 — JavaScript module extraction without behavior changes
- [ ] Batch 04 — Explicit runtime state and P0 behavior fixes
- [ ] Batch 05 — localStorage-only persistence
- [ ] Batch 06 — Legacy dependency removal and DOM security
- [ ] Batch 07 — Accessibility and interaction
- [ ] Batch 08 — Comparison robustness and determinism
- [ ] Batch 09 — Release readiness, documentation, and final audit

## Status update rules

When advancing a batch:

1. update the current batch and status;
2. move verified deliverables into Completed work;
3. record decisions with a short reason;
4. update validation results;
5. record blockers or deliberately deferred items;
6. check a batch only after all acceptance criteria pass.
