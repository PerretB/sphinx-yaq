# YAQ migration status

Last updated: 2026-09-24

## Overall state

The target repository `D:\sphinx-yaq` is initialized on `main` and tracks
`origin/main`. Batches 00 through 07 are complete: the characterized legacy
implementation is now available as an installable package with namespaced
assets, reproducible distribution metadata, build-time model validation, safe
serialization, directly tested JavaScript grading/state modules, and a
reproducible browser bundle. Batch 05 removed all Firebase, authentication,
cloud synchronization, and cookie paths and added resilient local-only
persistence with real-browser reload coverage. Batch 06 removed the remaining
legacy browser dependencies and unsafe DOM construction, with escaping and
same-origin CSP browser coverage.

Batch 07 added labelled, keyboard-operable controls, visible textual question
feedback, and live quiz status announcements while retaining the three-button
true/false control and its layout.

## Current batch

**Batch 08 — Comparison robustness**

Status: ready to start. Batch 07 is complete.

Batch specification: [`migration_batches/08-comparison-robustness.md`](migration_batches/08-comparison-robustness.md)

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
- Added frozen typed models for TF, FB, and SC questions, parsing role text
  with `json.loads` after restoring Docutils-protected backslashes.
- Added build-time validation for required fields, property types, unknown
  fields, TF answers, SC choices, fill-in sizes and flags, option combinations,
  displayed answers, and finite ordered mathematical intervals.
- Replaced internal Sphinx configuration mutation with document-local parsing
  state whose temporary nesting depth is always restored with `try/finally`.
- Added source/line-aware author diagnostics and document-scoped duplicate quiz
  identifier detection, including the original declaration location.
- Replaced manual JSON and HTML attribute construction with `json.dumps` and
  the Docutils HTML translator's escaped `starttag` output.
- Added an early builder guard with a deliberate HTML-only `ExtensionError` and
  extension metadata declaring both parallel safety flags false.
- Expanded the Python suite to 26 tests, including focused model tests, all
  validation diagnostics, escaping, duplicate-ID scope, failed-context cleanup,
  and an unsupported-builder smoke test.
- Moved the editable browser runtime to `frontend/src/runtime.js` and extracted
  pure answer comparison and aggregate-state calculation into importable
  `grading.js` and `model.js` modules.
- Added 28 direct, table-driven module tests while retaining the 23-test jsdom
  characterization suite as the browser integration safety net.
- Added injected random, math compiler, and fuzzy-comparator dependencies at
  the grading boundary without changing the production sampling behavior.
- Added a locked esbuild build that deterministically generates the packaged
  `sphinx_yaq/_static/sphinx_yaq/yaq.js` classic-script bundle, plus a stale
  bundle check run before every JavaScript test suite.
- Added V8 production-source coverage for the extracted modules; the completed
  Batch 03 suite reports 100% statements, branches, functions, and lines.
- Included frontend sources, direct tests, and the build script in the source
  distribution while retaining only generated runtime assets in the wheel.
- Added pure operations for answer changes, grading, reveal, and reset, and
  made quiz aggregate state recompute synchronously from question state.
- Removed all Watch.JS subscriptions, its polling runtime, its Sphinx asset
  registration, and the vendored package asset.
- Corrected true/false behavior so wrong answers remain editable, can be
  retried, and can reveal the correct selection in the actual disabled switch.
- Added defensive runtime duplicate-ID rejection, per-question failure
  containment, visible per-quiz fallback messages, and preservation of the
  original quiz prose when activation fails.
- Expanded the JavaScript suite to 57 tests, including direct transition tests
  and jsdom coverage for TF retry/reveal, duplicate IDs, isolated failures, and
  accidental global bindings.
- Deleted Firebase configuration, authentication and synchronization logic,
  cookie persistence, remote Firebase asset registration, and obsolete
  persistence/login modal styles and assets.
- Added `QuizStorage`, a versioned localStorage adapter with normalized
  document scope, quiz isolation, definition fingerprints, debounced saves,
  guarded load/save/remove/clear operations, and in-memory fallback behavior.
- Persisted only explicit minimal question state, restored correct, wrong,
  revealed, and unanswered progress, and made Restart delete its quiz record.
- Added storage unit tests, jsdom restoration and restart tests, and a
  Playwright test that restores progress after reloading generated demo HTML.
- Replaced jQuery selection, events, classes, animation, and HTML-string UI
  construction with standard DOM APIs, native buttons, and local Unicode
  feedback symbols with visually hidden labels.
- Preserved Sphinx-rendered nested prose by cloning existing DOM nodes before
  activating a quiz; failed activation still leaves original prose readable.
- Removed both bundled jQuery copies, the remote Font Awesome stylesheet, and
  the inline spoiler handler. The demonstration now uses Alabaster so its
  generated pages do not pull in the old theme's jQuery or icon assets.
- Added injection and CSP browser coverage for titles, choices, nested prose,
  spoilers, math grading, and normal grading under same-origin scripts/styles.
- Inventoried retained dependencies and licenses in
  [`dependency_inventory.md`](dependency_inventory.md).
- Kept the existing true/false three-button switch, adding a named group,
  full button names, pressed state, keyboard focus, and explicit selection.
- Labelled text fields and selects from their numbered authored prose, added
  visible Correct, Incorrect, Unanswered, and Solution shown feedback, and
  announced grade, reveal, and restart summaries through a polite live region.
- Made the inline spoiler's hidden action name explicit and its revealed state
  inert, gave quizzes semantic headings and regions, and added visible focus
  outlines, narrow-width bounds, reduced-motion handling, and improved blue
  control contrast without changing the switch layout.
- Added Playwright keyboard, role/name, status, axe, narrow-width, zoom, and
  missing-image checks while retaining CSP and reload coverage.

## Batch 07 decisions and validation

- The three-button true/false switch remains the authored UX. It is exposed as
  a labelled group of toggle buttons; no radio controls or visual redesign were
  introduced.
- A question's accessible name uses its ordinal and surrounding authored
  sentence. This preserves authoring syntax and does not read answer definitions
  from the quiz model.
- The existing English feedback terms remain, now visible beside their symbols.
  Quiz progress and persistence payloads are unchanged; transient "Unanswered"
  feedback after grading is not stored.
- Initial and graded quiz screenshots were inspected at a 900-pixel viewport.
  The switch geometry and control arrangement remain intact. Automated checks
  covered a 320-pixel viewport, 200% CSS zoom, reduced image availability,
  keyboard operation, and axe scans before and after interactions. Manual
  screen-reader speech, operating-system high-contrast mode, and browser-native
  zoom remain useful follow-up checks on user devices.

```text
npm run build:js
  passed; regenerated the packaged JavaScript bundle

npm run test:js
  stale-bundle check passed; 4 files and 71 tests passed

python -m pytest (target .venv Python 3.12.14)
  26 tests passed

python -m sphinx -E -b html examples/demo/source examples/demo/build/html
  passed with Sphinx 9.1.0

npm run test:e2e (prestarted local demo server)
  4 Chromium tests passed, including axe scans with no serious or critical
  violations in the quiz UI
```

The Playwright runner's managed-server lifecycle still hangs in this Windows
sandbox, so the tests used a prestarted local server. The only test-run warning
was Node's `NO_COLOR`/`FORCE_COLOR` combination. No tests were skipped.

## Batch 06 decisions

- Quiz titles, choice labels, and displayed answers are inserted as DOM text or
  control values. Authored nested Sphinx markup is copied as existing DOM,
  without reparsing an HTML string.
- Feedback markers use compact local Unicode symbols (✘, ✔, ⓘ), with hidden
  text and hover labels for their meaning. Spoiler roles render native buttons
  with event listeners, keeping the click-to-reveal interaction under CSP.
- math.js 10.6.4 remains for Batch 08 grammar work. Its dormant global-object
  fallbacks contain `Function` expressions, but the CSP browser test confirms
  math grading works without `unsafe-eval` for the covered expression.
- The demo uses Alabaster to keep its built pages free of jQuery and Font
  Awesome. This changes the demo theme only, not quiz authoring syntax.

## Batch 05 persistence decisions

- Local persistence is enabled by default and requires no user account or
  consent cookie. It is optional at runtime: denial, corruption, incompatibility,
  and quota errors leave the quiz fully usable in memory.
- Keys use `sphinx-yaq:v1:<encoded normalized path>:<encoded quiz ID>`; the
  browser origin supplies the outer isolation boundary.
- Payloads use schema version 1 and contain only a definition fingerprint and
  minimal answer/state data. Correct answers and rendering metadata are not
  persisted.
- Restart removes the current quiz record. `yaq_app.clearStoredProgress()` is
  the optional origin-wide YAQ clearing API.
- Definition fingerprints are deterministic FNV-1a hashes over ordered encoded
  question definitions. A mismatch ignores the saved record.

## Batch 04 intentional compatibility changes and decisions

- Wrong true/false answers are no longer terminal. They now follow the same
  retry/reveal contract as fill-in and single-choice questions.
- A revealed true/false answer updates the switch's selected value and disables
  the completed control; revealed and user-correct states remain distinct.
- Duplicate quiz identifiers in manually invalid runtime HTML reject the later
  quiz locally. Valid Sphinx output already rejects document-local duplicates
  at build time.
- Quiz and question initialization errors are visible and contained. The
  original authored prose remains readable when whole-quiz activation fails.
- Browser-level validation remains deferred because no e2e harness is yet
  available; the behavior is covered by jsdom integration tests.

## Batch 03 compatibility and build decisions

- Batch 03 intentionally changes no quiz behavior. The wrong-answer TF terminal
  state, duplicate-runtime handling, ignored `regexp` spelling, sampled math
  comparison, and generic unknown-math-variable error remain characterized for
  later batches.
- `frontend/src/` is the editable JavaScript source of truth. The packaged
  `yaq.js` is generated and must not be hand-edited.
- esbuild produces a non-minified IIFE so Sphinx can continue loading `yaq.js`
  as a classic script. Fixed build options and the locked dependency graph make
  regeneration deterministic; `npm run check:js` performs a byte comparison.

## Batch 02 intentional compatibility changes

- Malformed JSON and non-object question declarations now produce an error at
  the authored source line and no question node, instead of reaching the
  browser runtime.
- Missing, mistyped, unknown, or unsupported question fields/types now produce
  build diagnostics. Unknown properties use an error policy rather than being
  silently ignored.
- TF answers other than exact `T` or `F`, SC declarations with empty choices or
  an answer outside their choices, and non-positive/non-integer FB sizes are now
  rejected during parsing.
- FB flags must be recognized, non-empty, and non-duplicated; `ordered` requires
  `sequence`; `math` and `regex` are each exclusive comparator modes. `vars` is
  accepted only for math questions, variable math answers require it, and each
  interval must contain two finite ascending numeric bounds. Constant math
  answers remain valid without `vars`.
- Duplicate quiz identifiers are now rejected within one document and report
  the first declaration. The same identifier remains valid in different
  documents.
- A quiz role outside a quiz and missing or nested directive declarations now
  use author diagnostics instead of raw exceptions or leaked parser state.
- Non-HTML builders now stop during builder initialization with the message
  `sphinx-yaq supports HTML builders only` rather than returning invalid role
  results or failing on unknown nodes later.
- Titles, quiz identifiers, SC choice labels, and plain spoiler text containing
  HTML-like strings are escaped and render as text. Nested document content
  rendered by Sphinx remains markup.
- Valid legacy question declarations keep the browser runtime's existing JSON
  field names and meaning; only insignificant flag/choice whitespace is
  normalized.

## Target Batch 02 validation

```text
npm run test:js
  1 test file passed
  23 tests passed

npm run build:js
  passed (the imported browser assets still intentionally have no transform step)

python -m pytest
  26 tests passed

python -m build
  built sphinx_yaq-0.1.0.tar.gz
  built sphinx_yaq-0.1.0-py3-none-any.whl

python scripts/smoke_test_wheel.py
  passed with Python 3.12.14 and Sphinx 9.1.0

python -m sphinx -E -b html examples/demo/source examples/demo/build/html
  passed with Sphinx 9.1.0
```

The isolated package build initially could not reach PyPI from the filesystem
sandbox; after network approval it completed with setuptools 84.0.0. The
browser runtime and its legacy dependencies were intentionally not redesigned
in this batch.

## Target Batch 03 validation

```text
npm ci
  passed; installed 109 locked packages

npm run build:js
  generated src/sphinx_yaq/_static/sphinx_yaq/yaq.js

npm run test:js
  stale-bundle check passed
  3 test files passed
  51 tests passed (23 integration, 28 direct module tests)
  extracted-module coverage: 100% statements, branches, functions, and lines

python -m pytest
  26 tests passed

python -m build
  built sphinx_yaq-0.1.0.tar.gz
  built sphinx_yaq-0.1.0-py3-none-any.whl

python scripts/smoke_test_wheel.py
  passed with Python 3.12.14 and Sphinx 9.1.0

python -m sphinx -E -b html examples/demo/source examples/demo/build/html
  passed with Sphinx 9.1.0
```

The isolated package build again required network approval to install
setuptools 84.0.0. The wheel smoke test verified that the generated bundle is
present and copied from the installed wheel. No test warnings or skips were
reported.

## Target Batch 04 validation

```text
npm run build:js
  generated src/sphinx_yaq/_static/sphinx_yaq/yaq.js

npm run test:js
  stale-bundle check passed
  3 test files passed
  57 tests passed (26 integration, 31 direct module tests)
  extracted-module coverage: 100% statements, branches, functions, and lines

python -m pytest
  26 tests passed
```

The Python suite used Python 3.12.14 from the bundled Codex runtime because
`python` was not exposed on the sandbox `PATH`. No warnings or skips were
reported. The batch did not add an e2e harness, so browser validation remains
deferred as specified by the batch contract.

## Target Batch 05 validation

```text
npm run build:js
  generated src/sphinx_yaq/_static/sphinx_yaq/yaq.js

npm run test:js
  stale-bundle check passed
  4 test files passed
  70 tests passed (28 runtime integration, 11 storage, 31 grading/state)
  storage coverage: 94.26% statements, 91.66% branches, 100% functions,
  94.11% lines

python -m pytest
  26 tests passed

python -m sphinx -E -b html examples/demo/source examples/demo/build/html
  passed with Sphinx 9.1.0

npm run test:e2e
  1 Playwright Chromium test passed using installed Chrome
```

The generated demo HTML and packaged runtime were searched for Firebase,
authentication, cloud, cookie, and modal references; none remain. The
Playwright run reported only Node's harmless `NO_COLOR`/`FORCE_COLOR` warning,
with no browser-console errors. No tests were skipped and no Sphinx warnings
were reported.

## Target Batch 06 validation

```text
npm run build:js
  generated the packaged classic-script bundle

npm run test:js
  stale-bundle check passed; 4 test files and 71 tests passed

python -m pytest
  26 tests passed

python -m sphinx -E -b html examples/demo/source examples/demo/build/html
  passed with Sphinx 9.1.0 and Alabaster

python -m build
  built sphinx_yaq-0.1.0.tar.gz and sphinx_yaq-0.1.0-py3-none-any.whl

Playwright Chromium, using a prestarted local demo server
  2 tests passed: restrictive CSP and reload persistence
```

The wheel contains only `yaq.js`, `math.js`, and `css/yaq.css` as browser
runtime assets. A clean demo HTML build and the editable runtime were searched
for the removed dependencies, remote extension resources, inline handlers,
and unsafe HTML/code construction. The CSP fixture permitted only same-origin
scripts and styles and reported no browser-console errors. The isolated Python
build required network permission to fetch setuptools; no tests were skipped.
The Playwright runner's automatic web-server teardown hung in this Windows
sandbox, so the browser tests were run successfully against a separately
started local server. The only runtime warning was Node's `NO_COLOR` and
`FORCE_COLOR` combination.

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
`sphinx_yaq/_static/sphinx_yaq/` namespace. This records the historical Batch
01 result; Watch.JS was removed in Batch 04 and the cookie/Firebase assets were
removed in Batch 05. The source
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
- Editable browser code lives in `frontend/src/`; esbuild generates the
  packaged classic-script bundle, and JavaScript tests reject stale output.
- Local persistence is enabled by default, scoped by origin, normalized path,
  and quiz ID, and guarded by schema version 1 plus a definition fingerprint.
- Restart removes the quiz record; clearing all YAQ records for an origin is
  available through `yaq_app.clearStoredProgress()`.

## Decisions still required

Resolve before or during the named batch:

| Decision | Needed by | Current recommendation |
| --- | --- | --- |
| Legacy `regexp` spelling | Batch 08 | Accept once with a deprecation warning |
| Supported mathematical grammar | Batch 08 | Freeze from current documented examples before replacing math.js |

## Known current behavior captured by tests

- Duplicate quiz identifiers are rejected within each document.
- Invalid question JSON is rejected by Sphinx with a source-aware diagnostic.
- Local progress survives reload in the same browser origin, normalized path,
  and quiz ID when the schema and definition fingerprint remain compatible.
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

Recommended next action: execute Batch 07 in `D:\sphinx-yaq` for the planned
accessibility and interaction work.

## Batch checklist

- [x] Batch 00 — Complete characterization baseline
- [x] Batch 01 — Package skeleton and reproducible build
- [x] Batch 02 — Python parsing, validation, and safe output
- [x] Batch 03 — JavaScript module extraction without behavior changes
- [x] Batch 04 — Explicit runtime state and P0 behavior fixes
- [x] Batch 05 — localStorage-only persistence
- [x] Batch 06 — Legacy dependency removal and DOM security
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
