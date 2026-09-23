# YAQ Sphinx extension migration plan and engineering handover

## 1. Purpose

This document is the implementation plan for turning the current Sphinx quiz demonstration into a maintainable, pip-installable extension while preserving its useful authoring behavior.

It consolidates the P0, P1, and P2 findings from the technical review into an ordered migration with concrete deliverables, acceptance criteria, testing expectations, and handover notes. It is intended to be sufficient for another engineer to continue the work without first reconstructing the project analysis.

### Repository roles

- The target repository is `D:\sphinx-yaq`. All refactoring, package construction, CI, release work, and migration commits happen there.
- The legacy source and behavioral reference is `C:\Users\perre\Dropbox\cours\demoSphinx`.
- The migration copies or reimplements the required code, tests, and demo in the target. It does not reorganize the legacy project in place.
- The legacy repository should remain runnable as an independent oracle until the target characterization baseline provides equivalent coverage.

## 2. Fixed product decisions

The following decisions are final for this migration and should not be reopened unless project requirements change.

### 2.1 HTML is the only supported output

The extension will support Sphinx builders whose `builder.format` is `html`. It will not implement LaTeX, PDF, text, man page, EPUB, or other output representations.

Unsupported builders must fail early with a clear extension error explaining that the extension is HTML-only. They must not fail later with an unknown-node error or an invalid role return value. This is explicit scope enforcement, not non-HTML rendering support.

### 2.2 Firebase and all cloud persistence will be removed

The following will be deleted:

- Firebase SDK and Firebase UI asset registration;
- `fbconfig.js`;
- Firebase project configuration and API key;
- authentication, login, logout, modal, and account-domain code;
- cloud save provider, synchronization, timestamps, pending cloud queues, and cloud/local conflict resolution;
- Firebase-related CSS and external CDN references.

Persistence will use browser `localStorage` only. It must be optional, deterministic, versioned, namespaced, and resilient to unavailable or corrupt storage.

### 2.3 Existing content should migrate without unnecessary rewrites

The current public authoring syntax remains supported for the first packaged release:

- `.. quiz:: identifier`;
- `:title:`;
- inline `:quiz:` JSON models;
- `TF`, `FB`, and `SC` question types;
- existing fill-in flags;
- block and inline spoilers.

A better structured authoring syntax may be introduced later, but it must not be required for the initial migration.

## 3. Baseline and source of truth

The characterization suite created before this migration is the behavioral baseline:

- `tests/js/yaq.test.js`: nine browser-runtime characterization tests;
- `tests/js/yaq-harness.js`: isolated jsdom runtime harness loading the current vendored files;
- `tests/python/test_sphinx_extension.py`: four real Sphinx HTML-build tests;
- `tests/roots/`: minimal Sphinx source fixtures.

At handover time, all 13 tests pass against the unmodified implementation. The Python suite also exposes existing Sphinx deprecation warnings for `env.app`.

Two JavaScript tests intentionally describe known defects rather than desired final behavior:

- a wrong true/false answer is terminal and cannot reveal its solution;
- duplicate quiz identifiers are accepted.

Those tests must be changed deliberately when the associated fixes are implemented. They must not be silently removed.

## 4. Target outcome

The migration is complete when the project provides:

1. A pip-installable package with a `src/` layout and bundled browser assets.
2. A Sphinx extension enabled with `extensions = ["sphinx_yaq"]` and no manual `sys.path` modification.
3. Build-time parsing and validation of question models with source-aware diagnostics.
4. Safe serialization from Python to HTML and safe DOM construction in JavaScript.
5. Deterministic, explicitly tested quiz state transitions and answer comparison.
6. Local-only, versioned `localStorage` persistence.
7. Keyboard-operable, screen-reader-readable controls.
8. Explicit rejection of non-HTML builders.
9. No jQuery, Watch.JS, js-cookie, Firebase, or Font Awesome runtime dependency.
10. Unit, Sphinx integration, and a small real-browser end-to-end test suite.
11. Reproducible Python and JavaScript builds, including verification that the wheel contains the required static assets.

## 5. Recommended target repository structure

The following structure is rooted at `D:\sphinx-yaq`:

```text
sphinx-yaq/
├── pyproject.toml
├── README.md
├── CHANGELOG.md
├── LICENSE
├── package.json
├── package-lock.json
├── vite.config.js
├── vitest.config.js
│
├── src/
│   └── sphinx_yaq/
│       ├── __init__.py
│       ├── directives.py
│       ├── roles.py
│       ├── nodes.py
│       ├── models.py
│       ├── visitors.py
│       └── _static/
│           └── sphinx_yaq/
│               ├── quiz.js
│               └── quiz.css
│
├── frontend/
│   ├── src/
│   │   ├── grading.js
│   │   ├── model.js
│   │   ├── storage.js
│   │   ├── components.js
│   │   └── index.js
│   └── tests/
│       ├── grading.test.js
│       ├── model.test.js
│       ├── storage.test.js
│       └── components.test.js
│
├── tests/
│   ├── python/
│   ├── roots/
│   └── e2e/
│
├── docs/
└── examples/
    └── demo/
```

The editable JavaScript source lives under `frontend/src`. The browser bundle generated from it is written to `src/sphinx_yaq/_static/sphinx_yaq/quiz.js` and included in the Python wheel.

## 6. Target architecture

### 6.1 Python responsibilities

The Python extension owns:

- registering directives, roles, nodes, configuration values, and assets;
- parsing and validating quiz/question declarations;
- enforcing document-level uniqueness of quiz identifiers;
- emitting structured, correctly escaped HTML data;
- rejecting unsupported builders with a clear error;
- exposing extension version and parallel-safety metadata.

Suggested module boundaries:

| Module | Responsibility |
| --- | --- |
| `__init__.py` | Public `setup(app)` entry point and extension metadata |
| `models.py` | Typed question models, JSON parsing, normalization, validation, serialization |
| `nodes.py` | Docutils node classes only |
| `directives.py` | Quiz and spoiler block directives |
| `roles.py` | Quiz and spoiler inline roles |
| `visitors.py` | HTML visitor/departure functions and attribute serialization |

### 6.2 JavaScript responsibilities

The browser runtime owns:

- discovering generated quiz roots;
- validating the minimal runtime assumptions of already build-validated models;
- rendering semantic controls;
- maintaining quiz and question state;
- grading answers through pure comparison functions;
- rendering textual and visual feedback;
- saving and restoring local state;
- exposing no required global variables other than an optional documented initialization API.

Suggested module boundaries:

| Module | Responsibility |
| --- | --- |
| `grading.js` | Pure exact, fuzzy, sequence, regex, numeric, and mathematical comparisons |
| `model.js` | State constants, transitions, aggregate quiz state, serialization-safe state |
| `storage.js` | Versioned localStorage adapter with error handling |
| `components.js` | DOM creation, event binding, rendering, accessibility behavior |
| `index.js` | Page discovery and initialization |

### 6.3 Data flow

```text
reStructuredText
    ↓
Python parser and validator
    ↓
typed Docutils nodes
    ↓
HTML visitor using safe JSON serialization
    ↓
namespaced HTML quiz root and question model data
    ↓
JavaScript initialization
    ↓
explicit quiz state/controller
    ↓
semantic DOM controls + localStorage state
```

## 7. Compatibility contract

The first packaged release should preserve these behaviors unless a planned fix below explicitly changes them:

- Current directive and role names.
- Current question type identifiers: `TF`, `FB`, `SC`.
- Current correct-answer behavior for valid examples.
- Current button meanings: grade, show solution, restart.
- Existing fill-in options: `size`, `flags`, `vars`, and `displayed-answer`.
- Existing flags: `fuzzy`, `sequence`, `ordered`, `nospace`, `math`, and `regex`.
- Block spoilers represented by native disclosure behavior.
- Quiz identifiers remain the basis of persisted state.

Intentional breaking or corrective changes:

- Invalid JSON and models fail during the Sphinx build.
- Duplicate quiz identifiers fail during the Sphinx build.
- A wrong true/false answer follows the same retry/reveal policy as other questions.
- Unsafe HTML in titles, values, or spoilers is escaped rather than interpreted.
- Unsupported Sphinx builders fail immediately with a clear message.
- Cloud login and synchronization disappear.
- Previously nonfunctional cookie persistence is replaced by localStorage.

## 8. Migration principles

1. Keep each change small enough to identify which behavior changed.
2. Add or update a failing test before each behavioral fix.
3. Do not combine packaging, state redesign, DOM redesign, and persistence in one change.
4. Keep the legacy demo runnable as a reference and the copied target demo buildable throughout the migration.
5. Preserve the old JavaScript bundle until the replacement passes equivalent tests.
6. Treat generated browser assets as release artifacts: reproducible, reviewed, and verified in the wheel.
7. Record every intentional compatibility change in `CHANGELOG.md`.

## 9. Phase 0 — freeze and document the baseline

### Work

- Keep the existing 13 characterization tests green.
- Add a single command or CI job that runs both suites.
- Record the currently tested Python, Sphinx, Node, and browser-emulation versions.
- Add fixtures for every example currently documented in `source/quiz/index.rst` if any behavior is not yet represented.
- Preserve a known-good generated HTML sample for manual comparison, but avoid snapshotting a complete Sphinx page.
- Add test names/comments identifying characterization of known bugs.

### Additional baseline cases to add

- `nospace` fill-in matching;
- ordered sequences;
- regex answers;
- invalid mathematical syntax and unknown variables;
- empty answers;
- more than one quiz on a page;
- reset after correct, wrong, and revealed states;
- Unicode titles, answers, and values;
- quotes, backslashes, ampersands, and angle brackets;
- inline and block spoilers containing nested markup;
- JavaScript initialization failure with readable fallback content.

### Exit criteria

- All existing features in the demo have at least one automated test.
- The baseline suite is reproducible from documented install commands.
- No production behavior has changed.

## 10. Phase 1 — package skeleton and reproducible builds

This phase addresses the packaging portion of P1.6 without yet redesigning runtime behavior.

### Work

- Create `pyproject.toml` using a standard backend such as Hatchling or setuptools.
- Choose and verify an available PyPI distribution name; use `sphinx_yaq` as the import package unless a different public name is selected.
- Copy and adapt the legacy extension Python code into `src/sphinx_yaq` in the target repository.
- Copy extension-owned static assets into the target package.
- Namespace assets under `_static/sphinx_yaq/`.
- Copy the current Sphinx demonstration into target `examples/demo`; leave the legacy demonstration intact.
- Remove `sys.path.insert()` from the copied target demo once the extension is installed in editable mode.
- Replace `conf.py` archive creation with an explicit build/release script or remove it.
- Add `README.md`, `LICENSE`, and `CHANGELOG.md` at repository root.
- Ensure source distributions contain development sources and wheels contain only runtime package data.

### Package verification

The build pipeline must:

1. run JavaScript tests;
2. build the JavaScript bundle;
3. run Python and Sphinx tests;
4. build wheel and source distribution;
5. inspect the wheel for `quiz.js` and `quiz.css`;
6. install the wheel into a clean environment;
7. build a minimal Sphinx HTML project using only the installed wheel.

### Exit criteria

- `python -m build` produces an sdist and wheel.
- `pip install <wheel>` makes `extensions = ["sphinx_yaq"]` work.
- The installed extension copies and references its static assets.
- The demo consumes the installed/editable package rather than a path-injected source folder.
- Tests pass from a clean checkout.

## 11. Phase 2 — P0 model validation and safe Python output

### 11.1 Parse the role body instead of slicing raw source

Replace `rawtext[7:-1]` with the role text supplied by Docutils. Parse it immediately using `json.loads()`.

### 11.2 Introduce typed validation

Define a normalized internal model for each question type. Dataclasses or typed dictionaries are sufficient; a heavy validation framework is unnecessary unless desired for future schema generation.

Validate:

- top-level value is an object;
- `type` is one of `TF`, `FB`, `SC`;
- `answer` exists and has the expected type;
- TF answers are exactly `T` or `F`;
- SC `values` are present and the answer belongs to them;
- `size` is a positive integer when provided;
- flags are recognized and combinations are coherent;
- `ordered` requires `sequence`;
- `vars` is present for variable mathematical expressions;
- every variable interval contains two finite numbers with lower bound not greater than upper bound;
- `displayed-answer` has the expected type;
- unknown properties produce either an error or a documented warning policy.

### 11.3 Produce source-aware errors

Return Docutils system messages or use Sphinx logging with document path and line number. Do not raise raw `ValueError` for ordinary author mistakes.

Example diagnostic:

```text
course/chapter.rst:42: ERROR: Invalid :quiz: model: SC question requires a non-empty "values" list.
```

### 11.4 Enforce unique quiz identifiers

Track identifiers per Sphinx document using document-local state. Do not use the current JavaScript array lookup. Duplicate IDs must fail at build time with both the duplicate and original location where practical.

The persistence namespace may include the document path, so the same human-readable ID can be allowed in different documents. This policy must be documented and tested.

### 11.5 Replace global parser-state mutation

Remove `quiz_running` and `spoiler_running` mutations from `config.config_values`.

Determine whether a role is inside a quiz through document-local parsing context or tree ancestry. Any temporary state must use `try/finally` and must not leak across documents or failed parses.

### 11.6 Use safe serialization

- Serialize models with `json.dumps()`.
- Escape HTML attributes using the translator/Docutils facilities rather than chained string replacement.
- Do not manually assemble JSON fragments inside HTML strings.
- Preserve nested content produced by Sphinx, but escape plain author-controlled title/label values.

### 11.7 Explicitly enforce HTML-only operation

At builder initialization, check `app.builder.format`. If it is not `html`, raise a clear `ExtensionError`, for example:

```text
sphinx-yaq supports HTML builders only; builder "latex" has format "latex".
```

Role functions must always return the correct `(nodes, messages)` tuple. No role may return bare `None`.

### Exit criteria

- Invalid models fail during the build with useful location information.
- Valid models are normalized and serialized safely.
- Duplicate IDs are caught in Python.
- Quotes and markup characters cannot break attributes or inject title/value HTML.
- HTML builds remain green.
- A non-HTML smoke test verifies the documented early failure.
- Parallel-read safety remains declared `False` until explicitly verified.

## 12. Phase 3 — P0 JavaScript correctness and explicit state transitions

### 12.1 Extract pure grading functions

Move answer comparison out of UI constructors into importable pure functions. Preserve current accepted-answer behavior first, then fix individual defects with dedicated tests.

Required functions should cover:

- exact string/numeric comparison;
- whitespace removal;
- Unicode normalization and fuzzy comparison;
- sequence tokenization and matching;
- ordered sequence matching;
- regular expression compilation and matching;
- mathematical expression comparison.

### 12.2 Replace implicit watcher-driven state propagation

Define explicit state-transition methods such as:

```text
setAnswer
gradeQuestion
revealQuestion
resetQuestion
recomputeQuizState
saveQuizState
```

Every transition should synchronously update the model and then render. Avoid object-property interception, polling, and nested asynchronous watcher callbacks.

### 12.3 Fix true/false behavior

Adopt one consistent policy across question types:

- an incorrect answer is `wrong` but remains eligible for retry or reveal;
- revealing sets the correct answer, disables the control, and marks the question `solved`;
- a correct answer disables the control and marks it `correct`;
- restart returns it to unanswered/enabled state.

Update the current characterization test that records terminal wrong TF behavior.

### 12.4 Fix duplicate identifiers at runtime defensively

Python is the authoritative validation layer, but JavaScript should still detect duplicate DOM IDs/models and render a visible per-quiz initialization error rather than overwriting state or throwing an opaque exception.

Update the current duplicate-ID characterization test to expect rejection during the Sphinx build. A separate runtime test may exercise defensive handling of manually constructed invalid HTML.

### 12.5 Make initialization failures visible

The source content must remain readable if JavaScript fails. Do not begin with the entire quiz hidden indefinitely.

Recommended progressive-enhancement behavior:

- render quiz prose normally;
- add an `is-initializing` class only while activation occurs;
- on success, replace placeholders with controls;
- on failure, retain prose and insert a visible non-sensitive error message;
- log detailed diagnostics to the console for authors.

An error in one question should not prevent unrelated quizzes from initializing.

### Exit criteria

- Grading logic is importable and unit tested without a DOM.
- State transitions are synchronous and deterministic.
- TF retry/reveal behavior is corrected.
- One malformed runtime quiz does not break the rest of the page.
- Watch.JS is no longer required.
- All intended compatibility tests pass and known-bug tests have been deliberately updated.

## 13. Phase 4 — localStorage-only persistence

This phase replaces both the current no-op local provider and the removed cloud subsystem.

### 13.1 Storage interface

Keep storage behind a small interface so it can be tested with an in-memory fake:

```javascript
export class QuizStorage {
  load(key) {}
  save(key, state) {}
  remove(key) {}
  isAvailable() {}
}
```

### 13.2 Storage key

Use a namespaced, stable key containing the schema version, document scope, and quiz identifier. For example:

```text
sphinx-yaq:v1:/course/chapter.html:history
```

Normalize the document path consistently. Allow an optional Sphinx configuration prefix for sites hosted under changing paths or sharing an origin.

### 13.3 Stored payload

Use a JSON payload with an explicit schema version:

```json
{
  "schemaVersion": 1,
  "savedAt": "2026-09-23T12:00:00.000Z",
  "quizId": "history",
  "state": {
    "questions": []
  }
}
```

Persist only state needed to restore the user experience. Do not persist DOM fragments, functions, watcher metadata, correct-answer definitions, or redundant derived aggregate state.

### 13.4 Save policy

- Save after a meaningful answer/state transition using a short debounce.
- Flush synchronously where possible on `pagehide`, not the deprecated/unreliable `unload` workflow.
- Restart should clear the stored attempt or replace it with the initial state; select one behavior and test it. Clearing the record is simpler.
- A solution reveal is persisted so reload does not turn a revealed answer into an apparently user-correct answer.

### 13.5 Failure policy

Handle all of the following without breaking quizzes:

- localStorage unavailable due to browser policy;
- quota exceeded;
- malformed JSON;
- unknown future schema version;
- stored model incompatible with the current number or types of questions;
- private/incognito storage behavior;
- write failure.

On failure, discard or ignore invalid state, continue in memory, and optionally emit a console warning. Do not show disruptive alerts.

### 13.6 Privacy and controls

Document that progress is stored in the current browser profile and is not synchronized. Provide either:

- a per-quiz restart that removes saved state; and
- an optional documented API or UI action to clear all `sphinx-yaq:` records for the current site.

### Tests

- save/load round trip;
- isolation by page and quiz ID;
- debounce behavior with fake timers;
- corrupt payload recovery;
- schema-version mismatch;
- unavailable/quota-throwing localStorage;
- restart removal;
- restoration of correct, wrong, revealed, and unanswered states;
- changed quiz definition invalidates incompatible saved state safely.

### Exit criteria

- State survives a page reload in a real browser test.
- No Firebase, authentication, cookies, or remote persistence code/assets remain.
- Storage failure never prevents grading.
- The persistence schema and reset semantics are documented.

## 14. Phase 5 — P1 dependency and security cleanup

### 14.1 Remove legacy dependencies

Remove:

- jQuery and both bundled copies;
- Watch.JS;
- js-cookie;
- Firebase SDK/UI and `fbconfig.js`;
- remote Firebase CSS;
- Font Awesome dependency;
- unused options and dead persistence code.

Use standard DOM APIs and inline SVG or plain text for feedback icons. Prefer textual feedback even if decorative icons remain.

### 14.2 Eliminate unsafe DOM construction

- Build elements using `document.createElement()`.
- Assign user-visible strings with `textContent`.
- Set form values through `.value`.
- Set attributes through DOM APIs.
- Never interpolate titles, choices, explanations, or answers into an HTML string.
- Do not use inline event handlers.
- Do not evaluate authored JavaScript.

Sphinx-rendered nested quiz prose may be retained as generated HTML because it has already passed through the documentation build, but model strings must not be reinterpreted as markup.

### 14.3 Treat client-side answers correctly

Correct answers remain present in the page because grading is client-side. Document that the extension is for self-assessment, not secure examinations or authoritative assessment.

This is a product constraint, not a vulnerability that can be fixed while retaining offline client-side grading.

### 14.4 Content Security Policy compatibility

The final runtime should work without:

- inline `<script>` code;
- inline `onclick` handlers;
- `eval` or `new Function` in extension-owned code;
- unexpected remote resources.

Check whether the selected math expression library requires unsafe evaluation. If so, configure or replace it with a CSP-compatible subset.

### Exit criteria

- The generated page requires no extension-owned third-party CDN requests.
- A restrictive same-origin Content Security Policy does not block quiz operation.
- Titles and choice values containing HTML-like strings are displayed as text.
- Dependency/license inventory contains only retained components.

## 15. Phase 6 — P1 accessibility and user interaction

### Semantic controls

- Use `<button type="button">` for grade, reveal, restart, and inline spoiler actions.
- Implement TF as a labelled radio group or equivalent native control, not anchor elements.
- Associate every input/select with an accessible label or surrounding question context.
- Use `<fieldset>` and `<legend>` where appropriate.
- Retain `<details>/<summary>` for block spoilers.

### Feedback

- Provide textual feedback such as “Correct”, “Incorrect”, and “Solution shown”.
- Put changing status in an appropriate `aria-live` region.
- Do not rely on color or an icon alone.
- Move focus only when doing so clearly helps and does not surprise the user.

### Keyboard and visual behavior

- All functionality must be available with keyboard alone.
- Define visible `:focus-visible` styles.
- Verify zoom, narrow layout, text wrapping, and high-contrast operation.
- Disable native controls with their `disabled` property only when interaction is intentionally complete.

### Tests

- keyboard interaction in component tests;
- accessible role/name assertions in real-browser tests;
- automated axe scan after initialization, grading, and solution reveal;
- manual keyboard and screen-reader smoke test before release.

### Exit criteria

- No click-only span or anchor controls remain.
- Every input and action has an accessible name.
- Status changes are available to assistive technology.
- Automated accessibility checks have no unreviewed serious violations.

## 16. Phase 7 — P2 comparison robustness

### 16.1 Exact and numeric comparison

Specify whether numeric-looking strings should be treated numerically. Avoid broad coercion through `Number()` unless documented. Explicit parsing should reject hexadecimal, empty, infinity, and non-finite values unless intentionally supported.

### 16.2 Fuzzy comparison

- Make the threshold an explicit parameter/configuration value.
- Use the passed threshold instead of a hard-coded value.
- Define Unicode normalization, case folding, accent handling, punctuation, and whitespace behavior.
- Test short strings carefully because a one-character difference is proportionally large.

### 16.3 Sequence comparison

- Define token separators precisely.
- Handle repeated values correctly.
- Ensure ordered comparison does not access beyond the expected sequence.
- Decide how empty tokens and punctuation are treated.

### 16.4 Regular expressions

- Standardize the public flag name as `regex`; optionally accept deprecated `regexp` with a build warning for one compatibility cycle.
- Compile the authored pattern once during initialization.
- Convert invalid patterns into build-time validation errors where feasible.
- Document that patterns are applied to the complete input only when authors use anchors.
- Consider length limits and basic protection against expressions that can freeze the browser.

### 16.5 Mathematical comparison

The current random-sampling method is probabilistic. For the initial migration:

- inject the sample generator;
- use deterministic seeded samples in production and tests;
- include fixed boundary/interior sample points where valid;
- document that comparison is numerical equivalence testing, not a symbolic proof;
- reject non-finite, complex, matrix, or otherwise unsupported results explicitly;
- handle singularities by selecting additional valid points up to a fixed maximum;
- correct the floating-point tolerance formula and make tolerances named constants;
- never mutate global math.js units.

If only scalar arithmetic is required, bundle a restricted parser/evaluator rather than the full math.js distribution. Any replacement must have tests for every documented expression form.

### Exit criteria

- Repeating the same grading operation produces the same result.
- Comparison semantics are documented and covered by table-driven tests.
- Invalid author expressions fail during the build where possible.
- Invalid student expressions produce non-disruptive inline feedback.

## 17. Phase 8 — P2 cleanup and documentation

### Python cleanup

- Remove unused variables such as `doc` and stale comments.
- Replace deprecated `env.app` access with supported Sphinx APIs.
- Correct directive argument counts and explicitly require `title` or define a default.
- Return accurate extension metadata, including version and verified parallel-safety flags.
- Add type hints and run a linter/formatter.

### JavaScript cleanup

- Enable strict module behavior.
- Eliminate accidental globals.
- Remove misspellings such as `__answser`, `sucessCallback`, and `interractiveElement` while preserving public CSS compatibility where needed.
- Remove unused `explanation` handling or implement explanations as a documented feature.
- Remove `base64Encode` and other dead configuration.
- Remove inline style strings in favor of CSS classes.

### CSS cleanup

- Namespace every selector under `sphinx-yaq` naming.
- Use CSS custom properties for colors and spacing.
- Inherit the documentation theme's font.
- Add `box-sizing: border-box` and responsive layout rules.
- Add print behavior and focus styles.
- Avoid generic IDs such as `wmsg` and all persistence-widget styles removed with Firebase.

### Documentation

Publish:

- installation and minimal configuration;
- complete authoring syntax;
- all question fields and flag semantics;
- HTML-only limitation;
- localStorage behavior and clearing progress;
- accessibility notes;
- self-assessment/security limitation;
- migration notes from the demo extension;
- supported Python and Sphinx versions;
- changelog.

### Exit criteria

- No known dead code or obsolete dependency remains.
- Documentation examples are built as part of CI.
- Public behavior and limitations match the implementation.

## 18. Test strategy after migration

### JavaScript unit tests

Run pure modules in Vitest without jsdom where possible:

- grading algorithms;
- state transitions;
- aggregate activity state;
- storage serialization and recovery;
- schema compatibility.

Use jsdom only for component rendering and event behavior.

### Python unit tests

Test without Sphinx where possible:

- model parsing and validation;
- normalization;
- serialization;
- error messages;
- ID registry/document-state helpers.

### Sphinx integration tests

Use `sphinx.testing.fixtures` for:

- valid HTML output;
- static asset registration and copying;
- build diagnostics with source locations;
- escaping and Unicode;
- duplicate IDs;
- nested directive behavior;
- multiple documents;
- incremental rebuild;
- parallel HTML build when declared safe;
- explicit rejection of a non-HTML builder.

### Real-browser tests

Use a small Playwright suite against HTML generated from the installed wheel:

- initialize one of each question type;
- grade correct and wrong answers;
- retry, reveal, and restart;
- reload and restore localStorage state;
- corrupt localStorage and continue safely;
- operate entirely by keyboard;
- run accessibility scans;
- fail the test on unexpected browser console errors.

### Packaging tests

- build sdist and wheel;
- verify wheel contents;
- install wheel in a clean environment;
- import `sphinx_yaq`;
- build a minimal HTML project offline;
- assert no remote Firebase/Font Awesome URLs occur in generated HTML.

## 19. CI matrix

Choose exact supported versions before release. At minimum, CI should cover:

- the oldest supported Python with the oldest supported Sphinx;
- the newest supported Python with the newest supported Sphinx;
- the primary development combination;
- the supported Node LTS version;
- Chromium for end-to-end tests, with optional Firefox/WebKit smoke coverage.

Separate fast checks from slower browser/package checks:

```text
lint-and-unit
├── Python unit tests
└── JavaScript unit/component tests

sphinx-integration
└── version matrix

browser-e2e
└── built documentation in Chromium

package
├── build sdist/wheel
├── inspect contents
└── clean-install smoke build
```

## 20. P0/P1/P2 traceability matrix

| Priority | Finding | Planned resolution | Primary phase |
| --- | --- | --- | --- |
| P0 | Models parsed only in browser | Parse and validate in Python with source diagnostics | Phase 2 |
| P0 | Persistence is nonfunctional | Remove cloud code; implement versioned localStorage | Phase 4 |
| P0 | TF solution/final-state defect | Explicit consistent state transitions | Phase 3 |
| P0 | Initialization errors hide/break content | Progressive enhancement and per-quiz visible errors | Phase 3 |
| P1 | Unsafe HTML/JSON concatenation | Safe Python serialization and DOM text APIs | Phases 2 and 5 |
| P1 | Implicit and obsolete dependencies | Remove jQuery, Watch.JS, cookies, Firebase, Font Awesome | Phase 5 |
| P1 | Non-HTML builders fail unpredictably | Explicit early HTML-only builder rejection | Phase 2 |
| P1 | Global config mutation for parser state | Document-local state/public APIs | Phase 2 |
| P1 | Inaccessible controls and feedback | Native controls, labels, live status, keyboard tests | Phase 6 |
| P1 | Project not reproducible/installable | `src` package, metadata, wheel checks, CI | Phase 1 |
| P2 | Fragile raw role slicing | Use parsed role text and structured models | Phase 2 |
| P2 | Watcher complexity and accidental globals | Explicit modules and transitions | Phase 3 |
| P2 | Nondeterministic/underspecified comparison | Pure deterministic comparison functions | Phase 7 |
| P2 | Smaller implementation defects | Test-led cleanup during relevant phases | Phases 3, 7, and 8 |
| P2 | Generated/third-party artifacts mixed with source | Separate frontend source, package assets, demo, and build output | Phases 1 and 5 |

## 21. Known defects to close explicitly

Use this as a checklist; each item should receive a focused test and changelog entry where user-visible.

- [ ] Wrong TF answer is terminal and solution cannot be shown.
- [ ] `TFQuestion.solve()` writes `selectedIndex` to the wrong model.
- [ ] Duplicate quiz UID check does not work.
- [ ] Local provider performs no read or write.
- [ ] Cloud timestamp code uses inconsistent variable spelling.
- [ ] Firebase write completion is reported before promise completion.
- [ ] Logout invokes sign-out immediately instead of scheduling a callback.
- [ ] `__answser` typo breaks intended input sizing branch.
- [ ] Fuzzy comparison ignores its tolerance argument.
- [ ] Mathematical comparison is random and uses an incorrect relative tolerance basis.
- [ ] Regex flag naming differs between prose and examples.
- [ ] Unsupported question type crashes runtime dispatch.
- [ ] Question `explanation` is read but not displayed.
- [ ] Role parsing relies on fixed raw-source slicing.
- [ ] Roles can return `None` outside HTML.
- [ ] Directive parsing mutates global/internal Sphinx configuration state.
- [ ] Title, UID, spoiler, and choice output use unsafe string concatenation.
- [ ] Quiz controls are non-semantic click targets.
- [ ] Feedback depends on remote icons and lacks readable status.
- [ ] Runtime leaks undeclared global variables.
- [ ] Whole-page polling interval is created by Watch.JS.
- [ ] Complete quiz may remain hidden after initialization failure.
- [ ] `conf.py` changes working directory and rewrites an archive during import.

Cloud-specific checklist entries are resolved by deletion, not repair.

## 22. Risks and mitigations

### Risk: refactoring changes accepted-answer behavior

Mitigation: expand table-driven comparison tests before extraction; preserve tests for documented examples; treat any change as an explicit decision.

### Risk: generated bundle differs from JavaScript sources

Mitigation: commit the bundle and make CI rebuild it, failing if the working tree would change.

### Risk: localStorage restores incompatible state after course edits

Mitigation: schema version plus a quiz-definition fingerprint or strict state-shape validation; discard incompatible records safely.

### Risk: Sphinx version compatibility is guessed

Mitigation: choose bounds from a CI matrix and test installed wheels against each supported combination.

### Risk: safe serialization changes valid display content

Mitigation: separate Sphinx-rendered nested content from plain model strings; test punctuation, Unicode, and deliberate markup cases.

### Risk: removing math.js changes mathematical syntax

Mitigation: do not replace it until the supported expression grammar is captured in tests and documented.

### Risk: accessibility work changes visual design

Mitigation: introduce semantic markup first, then recreate the intended presentation with CSS; validate keyboard behavior before visual polish.

## 23. Release and migration policy

### Versioning

Publish the first package as an alpha/pre-release until:

- packaging is stable;
- build-time validation is complete;
- JavaScript state/persistence has been replaced;
- accessibility and browser tests pass.

Use semantic versioning after the public authoring API is declared stable.

### Existing course migration

Provide a migration page with:

1. installation command;
2. replacement extension name in `conf.py`;
3. removal of copied `Sphinx_ext` folders;
4. removal of any manually copied YAQ static assets;
5. confirmation that existing `quiz` and `spoiler` syntax remains valid;
6. list of declarations that now fail validation;
7. explanation that cloud login is removed and progress is browser-local;
8. instructions for clearing local progress.

### Deprecation policy

Where inexpensive, accept harmless legacy spelling such as `regexp` for one release with a build warning. Do not retain unsafe behavior or cloud code solely for compatibility.

## 24. Definition of done

The migration is done only when all of the following are true:

- [ ] Package builds as wheel and source distribution.
- [ ] Clean wheel installation successfully builds an HTML fixture.
- [ ] No `sys.path` manipulation is needed by consumers.
- [ ] All static files are namespaced and present in the wheel.
- [ ] All models are parsed and validated during the Sphinx build.
- [ ] Duplicate quiz IDs are rejected with useful diagnostics.
- [ ] Unsupported builders fail early with a documented HTML-only message.
- [ ] No Firebase, cloud synchronization, authentication, or cookie persistence remains.
- [ ] LocalStorage persistence passes round-trip, corruption, unavailable-storage, and reload tests.
- [ ] TF, SC, and FB state transitions are consistent and deterministic.
- [ ] Comparison behavior is documented and unit tested.
- [ ] No jQuery or Watch.JS dependency remains.
- [ ] No unsafe model/title/choice HTML string interpolation remains.
- [ ] Controls are semantic, keyboard accessible, labelled, and provide textual status.
- [ ] JavaScript unit/component, Python unit, Sphinx integration, browser E2E, and packaging tests pass in CI.
- [ ] No unexpected browser console errors occur in supported examples.
- [ ] Documentation and changelog reflect the actual release.
- [ ] The demo uses the installed extension and is not part of extension runtime code.

## 25. Suggested first implementation slice

The first engineering slice should be deliberately narrow:

1. Expand baseline tests for the remaining documented answer flags.
2. Create the `src/sphinx_yaq` package skeleton.
3. Copy the current Python extension and static files into the target without changing behavior.
4. Make the target demo and tests consume the installed editable package.
5. Build and inspect the first wheel.

Do not start by rewriting `yaq.js`. Establishing package boundaries and a clean installed-package test first reduces the risk of confusing packaging failures with runtime regressions.

The next slice should implement build-time model parsing and validation, because that creates the stable contract the new JavaScript runtime will consume.
