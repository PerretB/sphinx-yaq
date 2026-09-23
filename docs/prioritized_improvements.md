# Technical review and prioritized improvements

## Executive conclusion

The project demonstrates a compact and useful authoring idea: keep quiz declarations inline with course prose, let Sphinx render the surrounding document, and activate only small placeholders in the browser. The separation between the Python adapter and the client-side quiz engine is conceptually sound, and the three question types cover a practical teaching baseline.

The current code should nevertheless be treated as a prototype, not a production-ready extension. The first work should make behavior deterministic and build failures visible: fix broken state and persistence paths, validate author input during the Sphinx build, declare dependencies, and add tests. Security hardening, accessibility, and packaging should follow before broader deployment. A later modernization can then remove the legacy observation/persistence stack and simplify the runtime.

Priority meanings used below:

- **P0**: fix before relying on the extension; current behavior is broken or can fail an entire page/build.
- **P1**: fix before publishing as a reusable extension; substantial security, compatibility, accessibility, or maintainability risk.
- **P2**: important quality and correctness improvement after the foundation is stable.
- **P3**: cleanup or enhancement with lower immediate risk.

## P0 — correctness and operational reliability

### P0.1 Validate quiz JSON and models at build time

**Evidence:** `quiz_question()` stores `rawtext`, the visitor removes its first seven and last characters, and the browser performs the first `JSON.parse`. Type dispatch later calls `new questionConstructors[innerQuestionParams.type](...)` without checking that the type exists.

**Impact:** malformed JSON, a misspelled type, missing fields, or malformed `vars` produces a browser-console error instead of a Sphinx error with document and line information. One bad question can prevent the enclosing quiz from initializing, while the source build still appears successful.

**Improvement:** parse `text` with `json.loads()` in the role, validate it against a small schema, and emit a structured node. Report errors through `inliner.reporter.error()` / Sphinx logging with source and line context. Validate at least `type`, `answer`, `values`, flag names, variable intervals, and unique IDs. Serialize with `json.dumps()` in the HTML visitor.

### P0.2 Repair or remove the persistence feature

**Evidence:** local provider storage statements are commented out, `deactivateFirebase` is always `true`, and `save()` still queues both local and cloud work. The cloud comparison path also refers to `cloudTimeStamp` while its parameter is `cloudTimestamp`.

**Impact:** progress silently disappears on reload. Re-enabling Firebase exposes a definite `ReferenceError` in timestamp comparison and several unhandled asynchronous failure paths. The UI and comments promise a capability that is absent.

**Improvement:** choose one explicit behavior for the next release:

1. Preferably implement local persistence with `localStorage`, version the stored schema, handle quota/parse failures, and test reload/migration behavior.
2. Alternatively remove persistence code and related dependencies until it is supported.

If cloud sync remains a requirement, redesign it behind an opt-in configuration value and await Firebase writes/reads with proper error handling. Do not reactivate the current code unchanged.

### P0.3 Fix true/false solution and final-state behavior

**Evidence:** a wrong `TF` answer is marked `wrong | solved`, so `QuizActivity.solve()` refuses to reveal it. In addition, `TFQuestion.solve()` assigns `this.model.selectedIndex`, although the selected index belongs to `this.__switch3.getModel()`.

**Impact:** a wrong true/false answer ends that question without displaying the correct choice; even a direct call to `solve()` updates the wrong model object. This differs from fill-in and single-choice behavior and makes the “Show solution” workflow inconsistent.

**Improvement:** define the intended attempt policy, then encode it consistently. For retry/reveal behavior, mark an incorrect TF answer as `wrong` only, and make `solve()` update the switch model, disable the control, and mark the container solved. Add state-transition tests for all three question types.

### P0.4 Make initialization failures visible to the reader

**Evidence:** `.yaq` starts as `display: none`. Initialization errors are only logged to the console, after which the element is shown but may be empty or partially transformed. The runtime requires `$`, `watch`, `math`, and optional remote assets without a preflight check.

**Impact:** dependency-order, network, model, or runtime errors can leave invisible or unusable learning content with no actionable message for the student or author.

**Improvement:** retain readable static fallback content, add a visible error element when activation fails, and catch failures per question rather than per whole quiz. Detect required globals with a clear diagnostic. Consider progressive enhancement: the explanatory text should remain readable even when JavaScript is unavailable.

## P1 — security, compatibility, and accessibility

### P1.1 Stop constructing HTML and JSON with string concatenation

**Evidence:** Python manually interpolates title and UID into a JSON-valued HTML attribute. Spoiler title/content are appended without escaping. JavaScript interpolates the quiz title and list values into HTML strings and then uses jQuery `.append()`/`.html()`.

**Impact:** quotes, backslashes, ampersands, angle brackets, or control characters can corrupt output. If quiz sources can be influenced by an untrusted contributor, these paths can become stored cross-site scripting. Even with trusted authors, ordinary punctuation can break parsing.

**Improvement:** use `json.dumps()` plus the translator's attribute escaping in Python. In JavaScript, create elements and assign `.text()`/`textContent`, `.value`, and attributes rather than parsing HTML strings. Treat authored HTML as trusted only where Sphinx has deliberately rendered nested document content. Remove the inline `onclick` handler from spoilers and bind behavior in JavaScript.

### P1.2 Declare and control every dependency

**Evidence:** `yaq.js` uses jQuery extensively, but `setup()` never registers the bundled jQuery file. Functionality therefore depends on the theme or another extension. Conversely, obsolete Firebase/Firebase UI and Font Awesome resources are loaded remotely even though Firebase is disabled.

**Impact:** changing the Sphinx theme or build environment can break all quizzes. Remote resources add availability, privacy, supply-chain, and Content Security Policy concerns without providing active functionality.

**Improvement:** either remove jQuery in favor of standard DOM APIs or explicitly bundle/register one supported version. Remove disabled Firebase assets from the default build. Make optional integrations configuration-driven and self-contained where practical. Inventory licenses and update or replace vendored Watch.JS, js-cookie, jQuery 3.2.1, and other legacy assets.

### P1.3 Support non-HTML builders gracefully

**Evidence:** roles return `None` when the builder format is not HTML, custom nodes have only HTML visitors, and the extension describes itself as HTML-only without providing fallbacks.

**Impact:** Docutils roles are expected to return `(nodes, messages)`, and unknown custom nodes may fail non-HTML builds. A project that otherwise targets PDF/LaTeX or text cannot safely enable the extension globally.

**Improvement:** always return a valid role result. Add visitors/departure behavior for relevant builders or replace interactive fields with meaningful static text such as a blank, choices, and optionally an answer-key representation. At minimum, skip unsupported nodes explicitly and emit a controlled warning.

### P1.4 Replace global configuration mutation used as parser state

**Evidence:** directive nesting is tracked by inserting `quiz_running` and `spoiler_running` into `env.config.config_values`, an internal/global configuration registry. Cleanup is not protected by `finally`.

**Impact:** an exception during nested parsing can leave stale state. Global mutable state is unsafe for parallel/incremental parsing and uses a Sphinx internal data structure for a purpose it was not designed to serve.

**Improvement:** infer ancestry from the Docutils state/node tree, or maintain temporary document-local context with guaranteed cleanup in `try/finally`. Use public Sphinx APIs only. Return proper system messages rather than raising raw `ValueError`.

### P1.5 Make controls keyboard- and screen-reader-accessible

**Evidence:** action controls are `<span>` elements and true/false choices are `<a>` elements without `href`; all are wired only for click. Inputs have no programmatic labels. Feedback is conveyed by Font Awesome icons and color, with no live region or textual status. Inline spoilers are click-only spans. CSS defines hover but no focus treatment.

**Impact:** keyboard-only and assistive-technology users cannot reliably operate or understand the quizzes. Remote icon failure also removes feedback.

**Improvement:** use native `<button>`, `<input>`, `<select>`, `<fieldset>`, and `<legend>/<label>` semantics. Add visible focus styles, textual status in an `aria-live` region, and accessible names. Keep `<details>/<summary>` for block hints and use a real button for inline disclosure. Verify contrast and zoom/reflow behavior.

### P1.6 Make the project reproducible and packageable

**Evidence:** there is no `pyproject.toml`, dependency declaration/lock, package version, test suite, CI configuration, or license file. `conf.py` creates and moves a ZIP while changing the process working directory at import time.

**Impact:** a clean environment cannot reproduce a known build without manual discovery. The extension cannot be installed normally, and configuration side effects can make builds fragile or dirty the source tree.

**Improvement:** create a Python package with `pyproject.toml`, explicit Sphinx/Docutils compatibility bounds, package data for assets, version metadata, and a license. Move demo-archive generation to a dedicated script/build target using absolute paths without `chdir`. Add a documented clean setup command.

## P2 — robustness and maintainability

### P2.1 Replace fragile role slicing and manual nesting checks

**Evidence:** `node["content"][7:-1]` assumes the exact literal spelling and delimiter length of `:quiz:` markup instead of using the `text` argument already supplied by Docutils.

**Impact:** alternate role syntax, escaping, or future parser behavior can corrupt the model. It also makes the build-time layer harder to understand.

**Improvement:** store parsed role text/model directly on the node. Let Docutils handle role syntax; do not reconstruct it from raw source.

### P2.2 Simplify state management and eliminate accidental globals

**Evidence:** the runtime depends on a large legacy Watch.JS file that rewrites object properties and runs a permanent 50 ms interval. Assignments such as `model`, `q`, `ca_expr`, `ga_expr`, `e`, and `innerHTML` omit declarations and therefore leak globals in non-strict code.

**Impact:** hidden callbacks make transitions difficult to reason about, global name collisions can cause intermittent bugs, and the polling interval persists even when no quiz is present.

**Improvement:** enable strict mode/linting, declare all bindings, and replace implicit observation with explicit event/state-update methods. A small `QuizController` with direct render calls would likely be shorter than the observation dependency and easier to test.

### P2.3 Make answer comparison deterministic and well specified

**Evidence:** fuzzy comparison ignores its `tolerance` variable and hard-codes `0.8`. Mathematical equivalence is decided through 50 random samples. `floatEqual()` uses the smaller magnitude for relative tolerance. Regular expressions are compiled during every comparison and can be pathological. Documentation says `regexp` in one place but examples/code use `regex`.

**Impact:** grading can vary between attempts, equivalent expressions can fail at singularities or non-real values, and malformed/expensive regular expressions affect the student browser. Authors cannot rely on a precise contract.

**Improvement:** document comparison semantics and validate flags at build time. Use deterministic seeded samples plus carefully selected boundary values, or a constrained symbolic approach where feasible. Fix tolerance handling and numeric comparison. Compile validated regexes once, consider safe limits, and standardize on one flag name.

### P2.4 Correct smaller implementation defects

Concrete defects worth fixing with unit tests include:

- `__answser` is misspelled, so automatic text-input sizing always follows the wrong branch;
- `TFQuestion.solve()` writes the selected index to the wrong object;
- `setTimeout(firebase.auth().signOut(), 250)` invokes sign-out immediately and passes its return value to `setTimeout`;
- Firebase writes are reported successful before their promises resolve;
- `snapshot.val()` can be null before `JSON.parse`;
- the Firebase key-cleaning regex contains `*`, allowing zero-length matches and obscuring its intent;
- `explanation` is read by question constructors but never displayed;
- `options.base64Encode` is unused;
- `required_arguments = 1` plus `optional_arguments = 1` allows a second ignored quiz argument;
- quiz UID uniqueness is checked against an array using a string property, but quizzes are only added with `push()`, so the duplicate check does not work as intended.

### P2.5 Separate source, generated artifacts, and third-party code

**Evidence:** a generated `source/demoSphinx.zip`, an old full theme copy, duplicated jQuery files, and large minified third-party bundles live alongside authored extension code.

**Impact:** review, distribution, updates, and license auditing are harder; generated files can become stale.

**Improvement:** generate archives into the build directory, exclude build artifacts from source control, keep a manifest of vendored files and versions/licenses, and remove unused duplicates. Prefer package-managed dependencies or documented reproducible vendoring.

## P3 — product and developer-experience improvements

### P3.1 Add configuration instead of editing source

Expose public Sphinx configuration values for locale strings, persistence mode, optional asset integrations, math sampling policy, and whether solutions are embedded/revealed. Do not require instructors to edit `yaq.js` for translation.

### P3.2 Improve the authoring schema

JSON embedded in an inline reStructuredText role is compact but difficult to quote and produces poor diagnostics. Consider a dedicated question directive with typed options, while retaining the role as shorthand. Structured syntax would also allow commas in choice labels and multiline explanations.

### P3.3 Improve layout and theming

Use CSS custom properties and inherit the documentation theme's fonts/colors. Add `box-sizing: border-box` where width and padding combine, responsive wrapping for footers and controls, and print styles. Correct naming such as `interractiveElement` during a breaking cleanup.

### P3.4 Add optional educational features only after stabilization

Potential additions include attempt counts, per-question explanations, randomized choice order, multiple-choice questions, scoring summaries, event hooks for learning platforms, and author-selectable feedback policies. These should be built on the validated schema and accessible state model rather than added to the current implicit watcher architecture.

## Recommended implementation sequence

1. Add a minimal test/build harness and freeze current expected behavior with fixtures.
2. Parse and validate models in Python; use safe serialization; provide visible client fallback errors.
3. Fix TF transitions, duplicate IDs, persistence policy, and the smaller correctness defects.
4. Declare/package dependencies and remove unconditional inactive remote services.
5. Replace interactive spans/anchors with accessible native controls and add non-HTML fallbacks.
6. Replace Watch.JS/global mutable state with explicit updates and modular JavaScript.
7. Improve authoring syntax, localization, theming, and optional features.

## Suggested verification matrix

Automated coverage should include:

- Sphinx HTML builds with valid quizzes and every question/flag combination;
- build-time diagnostics for invalid JSON, types, fields, flags, duplicate IDs, and illegal nesting;
- a non-HTML builder smoke test;
- browser tests for grade, retry, reveal, reset, multiple quizzes, and dependency failure;
- deterministic comparison tests for accents, sequences, numbers, math expressions, and regexes;
- persistence reload/migration/error tests if persistence is retained;
- keyboard navigation and automated accessibility checks;
- Content Security Policy testing without inline handlers or unexpected remote resources.

## Verification performed for this review

The source tree, Sphinx configuration, directive/role implementation, quiz examples, CSS, runtime code, persistence providers, and bundled helper libraries were inspected. Python byte-compilation of `source/Sphinx_ext` and JavaScript syntax checks for `yaq.js`, `fbconfig.js`, and `watch.js` succeeded. A complete Sphinx build was not executed because Sphinx is not installed in the available Python environment; the absence of a dependency manifest is itself one of the reproducibility findings above.
