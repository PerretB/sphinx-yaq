# Authoring & Usage Guide

This guide provides instructions and complete syntax references for document authors creating interactive exercises and self-assessment content in Sphinx using reStructuredText (reST).

---

## 1. Creating Exercises (`.. quiz::`)

An exercise block is introduced using the `quiz` directive. Every exercise must have a unique identifier (`uid`) passed as an argument.

### Syntax

```rst
.. quiz:: quiz-id-01
    :title: Exercise Title

    This is an exercise content.
    Question 1: :quiz:`{"type":"TF", "answer":"T"}`
```

### Options
- `:title:` *(required)*: The title displayed in the exercise box header next to the exercise number.

> [!CAUTION]
> Quiz directives **cannot be nested** inside another `quiz` directive.

---

## 2. Question Types & JSON Schemas (`:quiz:`)

Questions are embedded inline within the content of a `quiz` directive using the `:quiz:` role. The role content is a JSON object string.

> [!IMPORTANT]
> Because the configuration is a JSON string inside reST markup, double quotes (`"`) and backslashes (`\`) inside JSON values must be escaped:
> - `"` becomes `\"`
> - `\` becomes `\\`

---

### A. True / False Questions (`type: "TF"`)

Renders a 3-state toggle button control (`V` / `?` / `F`).

#### Schema Parameters
- `"type"`: `"TF"`
- `"answer"`: `"T"` (True) or `"F"` (False)

#### Example
```rst
The capital of France is Paris: :quiz:`{"type":"TF","answer":"T"}`.
Water boils at 50°C under normal atmospheric pressure: :quiz:`{"type":"TF","answer":"F"}`.
```

---

### B. Single Choice Questions (`type: "SC"`)

Renders a dropdown selection menu (`<select>`).

#### Schema Parameters
- `"type"`: `"SC"`
- `"values"` *(required)*: Comma-separated string listing all selectable options.
- `"answer"` *(required)*: Exact string of the correct option.

#### Example
```rst
Which protocol is used for secure web browsing? :quiz:`{"type":"SC", "values":"HTTP,FTP,HTTPS,SSH", "answer":"HTTPS"}`
```

---

### C. Fill-In-The-Blank Questions (`type: "FB"`)

Renders a text input box (`<input type="text">`).

#### Schema Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `"type"` | `string` | **Yes** | Must be `"FB"`. |
| `"answer"` | `string` | **Yes** | The expected answer. |
| `"size"` | `integer` | No | Width of the input box in characters. |
| `"displayed-answer"` | `string` | No | Alternate answer text displayed when the user clicks "Show solution". |
| `"flags"` | `string` | No | Comma-separated evaluation flags (see below). |
| `"vars"` | `object` | Conditional | Variable ranges object when `"flags"` includes `"math"`. Example: `"vars": {"x": [-10, 10]}`. |

#### Evaluation Flags (`flags`)

- **`fuzzy`**: Enables fuzzy matching using Levenshtein edit distance and diacritics removal. Accepts minor typos or missing accents (e.g., `reponse` for `réponse`).
- **`sequence`**: Treats answers as whitespace/comma-separated lists where order does not matter (e.g., `Churchill Stalin Roosevelt`).
- **`ordered`**: Used alongside `sequence` to require items to match in exact order.
- **`math`**: Treats the answer as a mathematical expression (e.g., `n^2 + 3`). Evaluates the expression numerically using `math.js` over random values defined in `vars`.
- **`regex`**: Treats the answer as a regular expression pattern to test against user input.

#### Examples

```rst
.. quiz:: quiz-fb-examples
    :title: Fill-In-The-Blank Examples

    1. Simple exact string match:
       :quiz:`{"type":"FB", "answer":"Paris"}`

    2. Fuzzy matching (accepts minor spelling variations):
       :quiz:`{"type":"FB", "answer":"réponse", "flags":"fuzzy"}`

    3. Custom box size:
       :quiz:`{"type":"FB", "answer":"42", "size":3}`

    4. Sequence matching (unordered list of items):
       :quiz:`{"type":"FB", "answer":"red green blue", "flags":"sequence"}`

    5. Ordered sequence matching:
       :quiz:`{"type":"FB", "answer":"1,2,3", "flags":"sequence,ordered"}`

    6. Mathematical expression evaluation:
       :quiz:`{"type":"FB", "answer":"x^2 + 2*x + 1", "vars":{"x":[-5,5]}, "flags":"math"}`

    7. Regular expression matching with custom displayed answer:
       :quiz:`{"type":"FB", "answer":"a+b*c$", "flags":"regex", "displayed-answer":"e.g., ac or abbc"}`
```

---

## 3. Adding Spoilers & Collapsible Hints

Spoilers allow hiding content (hints, solutions, extra context) until clicked.

### Block Spoilers (`.. spoiler::`)

Creates a collapsible `<details>` element with a summary title.

```rst
.. spoiler:: Click here for a hint

    This is a hint or solution paragraph.
    It can span multiple lines and contain rich markup.
```

### Inline Spoilers (`:spoiler:`)

Creates an inline hidden text span that reveals itself when clicked.

```rst
To view the secret code, click here: :spoiler:`XYZ-1234`.
```

---

## 4. Internationalization (`i18n`) & Custom UI Strings

UI text labels (such as button captions and error messages) are configured directly in `source/Sphinx_ext/_static/yaq.js` in the `texts` object:

```javascript
/* String constants */
var texts = {
    "True" : "V",
    "False": "F",
    "dontKnow": "?",
    "gradeButtonText": "Corriger",
    "resetButtonText": "Recommencer",
    "solveButtonText": "Montrer la solution",
    "wrongMathVariableError": "L'expression contient une variable inconnue, les variables connues sont : ",
    "wrongMathSyntaxError": "L'expression contient une erreur de syntaxe.",
    "wrongMathError": "Expression mathematique : erreur inconnue."
};
```

To translate the interface (e.g. for English documentation), update the values in this dictionary.
