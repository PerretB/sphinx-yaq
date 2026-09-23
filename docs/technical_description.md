# Technical description of the interactive quiz extension

## Scope

This project is a Sphinx demonstration site with a local extension, `Sphinx_ext.quiz`, that adds interactive quizzes and spoiler/hint elements to reStructuredText documents. The implementation has two layers:

- a small Python/Docutils adapter that recognizes custom reStructuredText syntax and emits HTML placeholders; and
- a browser-side JavaScript module (`yaq.js`) that parses those placeholders, builds the controls, grades answers, updates feedback, and contains an optional persistence subsystem.

The extension is HTML-oriented. It does not implement equivalent output for LaTeX, PDF, text, EPUB, or other Sphinx builders.

## Repository map

| Path | Responsibility |
| --- | --- |
| `source/conf.py` | Sphinx configuration, extension activation, theme configuration, and creation of a downloadable source archive during every build |
| `source/Sphinx_ext/quiz.py` | Custom nodes, `quiz` and `spoiler` directives/roles, HTML visitors, and static-asset registration |
| `source/Sphinx_ext/_static/yaq.js` | Quiz runtime, view construction, state transitions, grading, feedback, and persistence orchestration |
| `source/Sphinx_ext/_static/css/yaq.css` | Quiz, modal, feedback, switch, and spoiler styling |
| `source/Sphinx_ext/_static/math.js` | Vendored math.js 10.6.4 bundle used for mathematical-answer comparison |
| `source/Sphinx_ext/_static/lib/watch.js` | Vendored Watch.JS-based object observation used to propagate model changes |
| `source/Sphinx_ext/_static/lib/js.cookie.js` | Cookie helper, currently used only for the local/cloud choice; quiz-state cookie code is disabled |
| `source/Sphinx_ext/_static/lib/fbconfig.js` | Firebase project configuration and authentication UI setup |
| `source/quiz/index.rst` | User-facing examples and the effective syntax specification |
| `Makefile`, `make.bat` | Standard Sphinx build entry points |

There is also a bundled jQuery 3.2.1 file, but the extension does not register it. The runtime therefore assumes that the selected Sphinx theme or another extension has already provided the global `$`/`jQuery` object.

## Authoring interface

### Quiz container

A quiz is introduced by a block directive. Its argument is the quiz identifier and `title` supplies the displayed heading:

```rst
.. quiz:: unique-quiz-id
   :title: Example

   A statement: :quiz:`{"type":"TF","answer":"T"}`
```

The identifier is used as the client-side persistence key and must be unique on the page. The Python implementation also requires `title` in practice because it indexes the option directly, although the directive declaration does not formally make it mandatory.

The `:quiz:` inline role contains a JSON object. Three question types are registered by JavaScript:

| Type | UI | Required model fields | Important optional fields |
| --- | --- | --- | --- |
| `TF` | Three-way true / unknown / false switch | `type`, `answer` (`T` or `F`) | `explanation` is read but not displayed |
| `FB` | Text input (fill in the blank) | `type`, `answer` | `size`, `flags`, `vars`, `displayed-answer`, `explanation` |
| `SC` | Single-choice drop-down | `type`, `values`, `answer` | `explanation` |

For fill-in questions, `flags` is a comma-separated list copied to `data-*` attributes on the generated input. The implemented flags are:

- `fuzzy`: compare normalized strings using edit-distance similarity;
- `sequence`: split answers on whitespace, commas, or semicolons and compare elements;
- `ordered`: when combined with `sequence`, preserve element order;
- `nospace`: remove whitespace before comparison;
- `math`: compile both expressions with math.js and compare their values over 50 random assignments;
- `regex`: treat the expected answer as a JavaScript regular expression.

`vars` maps each mathematical variable to a two-element sampling interval. `displayed-answer` lets the revealed answer differ from the machine-checking expression.

### Spoilers

The extension also exposes two independent hint mechanisms:

```rst
Inline hidden text: :spoiler:`revealed on click`.

.. spoiler:: Hint title

   Arbitrary nested reStructuredText content.
```

The block form becomes native HTML `<details>/<summary>`. The inline form becomes a styled `<span>` whose class is removed by an inline click handler.

## Build-time processing

`setup(app)` in `quiz.py` performs four jobs:

1. It appends the extension's `_static` directory to `html_static_path`.
2. It registers JavaScript and CSS files, including remote Firebase, Firebase UI, and Font Awesome assets.
3. It registers the `Quiz`, `QuizQuestion`, `SpoilerBlock`, and `SpoilerInline` Docutils nodes with HTML visitors.
4. It registers the two directives and two local roles.

The transformation from source to HTML is:

1. `QuizDirective.run()` checks for content, marks a quiz as being parsed, creates a `Quiz` node, and recursively parses its body.
2. The `:quiz:` role accepts content only while that marker exists. It stores the complete role source in a `QuizQuestion` node.
3. The question visitor strips the role delimiters by fixed string slicing, UTF-8/base64-encodes the remaining JSON, and emits an empty `<span class="yaq-q" data-model="...">` placeholder.
4. The quiz visitor emits an outer hidden `<div class="yaq" data-model='...'>` containing the title and quiz identifier.
5. Normal Sphinx rendering produces the explanatory text and nested markup between these placeholders.

Base64 is used only for the inline question JSON, primarily to make it safe to place in an HTML attribute. The quiz-level model is manually assembled as JSON inside a single-quoted attribute.

## Browser initialization and rendering

`yaq.js` exposes one global object, `yaq_app`, from an immediately invoked function expression. On `DOMContentLoaded`, `yaq_app.init()` runs and then removes all single-letter units from math.js so that letters can be treated as algebraic variables.

Initialization follows this sequence:

1. Construct the persistence widget.
2. Select every `.yaq` placeholder with jQuery.
3. Read its original inner HTML and parse its `data-model` JSON.
4. Construct a `Quiz`, passing the preserved HTML and top-level model.
5. `QuizActivity` writes the preserved HTML into its own root and finds every `.yaq-q` placeholder.
6. Each question model is base64-decoded and parsed as JSON.
7. `QuestionContainer` dispatches by `type` through `questionConstructors` and appends the type-specific control plus feedback icons.
8. The original hidden outer element is shown.

This design preserves arbitrary Sphinx-rendered content around inline controls while delegating only the interactive fields to JavaScript.

## Runtime object model

The runtime uses constructor functions with mutable plain-object models:

```text
Quiz
└── QuizActivity
    └── QuestionContainer (one per inline role)
        ├── FBQuestion
        ├── ListQuestion (SC)
        └── TFQuestion
            └── Switch3
```

Watch.JS wraps properties with accessors and invokes callbacks when state changes. Those callbacks synchronize controls, propagate nested state upward, update buttons and icons, and schedule persistence.

Question state is a bit mask:

| State | Value | Meaning |
| --- | ---: | --- |
| `unsolved` | 1 | No accepted result yet |
| `correct` | 2 | Answer accepted |
| `wrong` | 4 | Answer rejected |
| `solved` | 8 | Answer is considered final or was revealed |

Activity state is another bit mask:

| State | Value | Meaning |
| --- | ---: | --- |
| `ongoing` | 1 | More attempts are possible or answers remain incomplete |
| `solvable` | 2 | A reveal-solution action is available |
| `ended` | 4 | Every question is correct or marked solved |

The activity recomputes its aggregate state after a question state change. The outer quiz then shows or hides the Grade, Show solution, and Restart controls.

## Grading behavior

- `TF`: the middle position is unanswered; matching `T`/`F` is correct; a wrong choice is immediately marked both wrong and solved.
- `SC`: an empty selection remains unanswered; an exact string match is correct and final; a wrong answer can be retried or revealed.
- `FB`: an empty string remains unanswered. Otherwise comparison uses the requested flags. A correct field is disabled; a wrong field remains editable.
- Math comparison compiles both expressions, samples each declared variable uniformly within its interval 50 times, and requires numeric results that are equal within a small absolute/relative tolerance.
- Revealing an `FB` or `SC` solution writes the displayed/correct answer into the control and marks it solved.

Additional Batch 00 characterization found these compatibility details:

- The guide calls the regular-expression flag `regexp` in prose but uses
  `regex` in its example. Only `regex` activates regular-expression matching;
  `regexp` is treated as an inert data attribute.
- An undeclared symbol in a mathematical answer is caught, leaves the field
  editable, and displays the generic mathematical-error message rather than
  the runtime's more specific unknown-variable message.
- A malformed top-level quiz model is caught per quiz. Its original readable
  content remains in the page, and later valid quizzes still initialize.
- The reset element remains in the DOM while hidden after a retryable wrong
  fill-in answer; invoking it programmatically clears the answer and markers.

Correct answers are necessarily present in the generated page because grading is entirely client-side. The mechanism is appropriate for self-assessment, not for secure examinations or authoritative scoring.

## Persistence subsystem

`PersistenceWidget` was designed around two providers:

- a local provider intended to store a timestamp and serialized model; and
- a Firebase provider scoped by authenticated user, page path, and quiz identifier.

Changes are queued locally for two seconds and for the cloud for two minutes. Synchronization compares local, cloud, and in-memory timestamps and chooses the newest model.

In the current configuration this feature is effectively inactive:

- `deactivateFirebase` is hard-coded to `true`;
- all local-provider reads and writes are commented out; and
- Firebase libraries and configuration are still included in every HTML build.

Consequently, user progress is not restored across reloads even though model changes still pass through the persistence queue.

## External and implicit dependencies

- Python, Sphinx, Docutils, and `sphinx_rtd_theme`;
- jQuery as an undeclared browser global;
- Watch.JS and js-cookie, vendored locally;
- math.js 10.6.4, vendored locally;
- Firebase 4.2.0 and Firebase UI 2.3.0, loaded from remote hosts;
- Font Awesome, loaded remotely for feedback icons.

No Python package metadata, dependency lock file, JavaScript package manifest, automated test suite, CI configuration, or extension version metadata is present. The project is therefore a copyable demonstration rather than an installable Sphinx package.

## Build behavior outside the extension

`source/conf.py` changes the process working directory, rebuilds `demoSphinx.zip`, moves it into `source`, and changes directory again every time Sphinx evaluates the configuration. This supplies the download linked from the demo home page, but it also gives a normally declarative configuration file filesystem side effects and makes builds dependent on their starting directory.
