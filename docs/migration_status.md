# YAQ migration status

Last updated: 2026-09-23

## Overall state

The target repository `D:\sphinx-yaq` is initialized on `main` and tracks
`origin/main`. Batches 00 and 01 are complete: the characterized legacy
implementation is now available as an installable package with namespaced
assets, reproducible distribution metadata, and clean-wheel smoke coverage.

## Current batch

**Batch 02 — Python parsing, validation, and safe output**

Status: ready to start.

Batch specification: [`migration_batches/02-python-validation.md`](migration_batches/02-python-validation.md)

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
- Added the `sphinx-yaq` distribution and `sphinx_yaq` import package using a
  setuptools `src` layout, with MIT metadata and declared support for Python
  3.10 or newer and Sphinx 7 or newer.
- Copied the characterized Python implementation and unchanged browser runtime
  into `src/sphinx_yaq`, namespacing package assets under
  `_static/sphinx_yaq/` and changing only their registered URLs.
- Updated all Sphinx fixtures to use `extensions = ["sphinx_yaq"]`; removed the
  test-suite path injection and pointed the JavaScript harness at packaged
  assets.
- Copied the legacy demonstration into `examples/demo`, removed its source-path
  injection and `conf.py` archive-generation side effect, and verified its HTML
  build against the editable package.
- Added root package documentation and changelog, explicit development-source
  distribution contents, a Batch 01 no-op JavaScript build task, and a
  reusable installed-wheel smoke script.
- Verified that PyPI currently reports no published distribution named
  `sphinx-yaq`; package-name ownership is not guaranteed until registration.

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

## Target Batch 01 validation

```text
npm run test:js
  1 test file passed
  22 tests passed

npm run build:js
  passed (the imported browser assets intentionally have no transform step)

python -m pytest
  6 tests passed
  19 known Sphinx deprecation warnings

python -m build
  built sphinx_yaq-0.1.0.tar.gz
  built sphinx_yaq-0.1.0-py3-none-any.whl

python scripts/smoke_test_wheel.py
  passed with Python 3.12.14 and Sphinx 9.1.0

python scripts/smoke_test_wheel.py --sphinx 7.0.0
  passed with Python 3.12.14 and Sphinx 7.0.0

python -m sphinx -b html examples/demo/source examples/demo/build/html
  passed with Sphinx 9.1.0
```

Wheel inspection found the package module, CSS, YAQ runtime, math.js, jQuery,
Watch.JS, js-cookie, and the legacy Firebase configuration under the
`sphinx_yaq/_static/sphinx_yaq/` namespace. Firebase remains only to preserve
Batch 01 behavior and is scheduled for removal in Batch 06. The source
distribution contains package, test, demo, documentation, and build sources;
the wheel contains runtime package files only.

Python 3.10 is the declared lower Python bound but was not locally executable;
the available interpreter was Python 3.12.14. Sphinx's declared lower bound
and the current tested version were both validated on that interpreter. The
Python version matrix remains a Batch 09 release-readiness responsibility.

## Fixed decisions

- HTML is the only supported Sphinx output format.
- Unsupported builders will be rejected early with a clear message; no fallback renderer will be developed.
- Firebase and all cloud/authentication code will be deleted rather than repaired.
- Browser persistence will use only versioned, namespaced `localStorage`.
- Existing `quiz` and `spoiler` syntax remains supported for the first packaged release.
- Migration is executed in reviewed batches rather than as one repository-wide rewrite.
- All migration implementation, packaging, commits, and release work happens in `D:\sphinx-yaq`.
- `C:\Users\perre\Dropbox\cours\demoSphinx` remains the legacy source and behavioral oracle and is not reorganized in place.
- The distribution name is `sphinx-yaq`; the Python import name is
  `sphinx_yaq`.
- The project license is MIT, matching the existing repository license.
- Initial metadata bounds are Python 3.10 or newer and Sphinx 7 or newer. The
  completed local matrix is Python 3.12.14 with Sphinx 7.0.0 and 9.1.0; Batch
  09 will expand and finalize the release matrix.

## Decisions still required

Resolve before or during the named batch:

| Decision | Needed by | Current recommendation |
| --- | --- | --- |
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

None.

Recommended next action: execute Batch 02 in `D:\sphinx-yaq` to introduce
Python parsing, validation, and safe output under its explicit compatibility
contract.

## Batch checklist

- [x] Batch 00 — Complete characterization baseline
- [x] Batch 01 — Package skeleton and reproducible build
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
