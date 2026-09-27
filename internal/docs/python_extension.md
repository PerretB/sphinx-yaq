# Python Sphinx Extension Documentation

The Python Sphinx extension is implemented in [`source/Sphinx_ext/quiz.py`](file:///c:/Users/perre/Dropbox/cours/demoSphinx/source/Sphinx_ext/quiz.py). It serves as a lightweight integration layer between Sphinx's reStructuredText (reST) parser and the client-side JavaScript engine (`yaq.js`).

---

## Extension Entry Point (`setup(app)`)

The `setup(app)` function initializes the extension when Sphinx builds the documentation site. It registers custom nodes, directives, roles, and static assets.

```python
def setup(app):
    # 1. Add static path
    static_path = os.path.join(os.path.dirname(__file__), "_static")
    app.config.html_static_path.append(static_path)

    # 2. Inject JavaScript dependencies
    app.add_js_file("lib/watch.js")
    app.add_js_file("lib/js.cookie.js")
    app.add_js_file("https://www.gstatic.com/firebasejs/4.2.0/firebase.js")
    app.add_js_file("https://www.gstatic.com/firebasejs/ui/2.3.0/firebase-ui-auth__fr.js")
    app.add_js_file("lib/fbconfig.js")
    app.add_js_file("math.js")
    app.add_js_file("yaq.js")

    # 3. Inject CSS stylesheets
    app.add_css_file("https://use.fontawesome.com/8916f45f90.css")
    app.add_css_file("https://cdn.firebase.com/libs/firebaseui/2.3.0/firebaseui.css")
    app.add_css_file("css/yaq.css")

    # 4. Register Nodes, Directives, and Roles
    # ...
```

---

## Custom Directives & AST Nodes

### 1. Quiz Directive (`.. quiz::`)

- **Class**: `QuizDirective(Directive)`
- **AST Node**: `Quiz(nodes.General, nodes.Element)`
- **Directive Name**: `quiz`
- **Arguments**:
  - `required_arguments = 1`: Unique exercise identifier (`uid`).
  - `option_spec = {"title": validators.unchanged_required}`: Mandatory title option.
- **Validation Rules**:
  - Ensures the directive has content (`assert_has_content()`).
  - Prevents nested quiz directives by checking `config.config_values['quiz_running']`.
- **HTML Visitor Functions**:
  - `visit_quiz_node(self, node)`: Emits opening container:  
    `<div class="yaq" data-model='{"title":"<title>", "uid":"<uid>"}'>`
  - `depart_quiz_node(self, node)`: Emits closing container:  
    `</div>`

---

### 2. Spoiler Block Directive (`.. spoiler::`)

- **Class**: `SpoilerDirective(Directive)`
- **AST Node**: `SpoilerBlock(nodes.General, nodes.Element)`
- **Directive Name**: `spoiler`
- **Arguments**:
  - `required_arguments = 1`: Title of the collapsible spoiler block.
- **Validation Rules**:
  - Ensures the directive has content.
  - Prevents nested spoilers via `config.config_values['spoiler_running']`.
- **HTML Visitor Functions**:
  - `visit_spoiler_block_node(self, node)`: Emits HTML5 `<details>` structure:  
    `<details class="yaq-spoiler-block"><summary class="yaq-spoiler-block-title"><title></summary><div class="yaq-spoiler-block-content">`
  - `depart_spoiler_block_node(self, node)`: Emits closing tags:  
    `</div></details>`

---

## Custom Roles & AST Nodes

### 1. Quiz Question Role (`:quiz:`)

- **Function**: `quiz_question(...)`
- **AST Node**: `QuizQuestion(nodes.General, nodes.Element)`
- **Role Name**: `quiz`
- **Scope & Builder**:
  - Executes only when compiling for HTML (`builder.format == 'html'`).
  - Enforces that the role is used **inside** a `quiz` directive (verifies `quiz_running` configuration flag; raises `ValueError` otherwise).
- **Data Serialization**:
  - Extracts raw JSON string from role text.
  - Encodes the JSON payload using standard Base64 UTF-8 (`base64.standard_b64encode`).
- **HTML Visitor Functions**:
  - `visit_quiz_question_node(self, node)`: Emits inline question placeholder:  
    `<span class="yaq-q" data-model="<base64_string>"></span>`
  - `depart_quiz_question_node(self, node)`: No-op.

---

### 2. Inline Spoiler Role (`:spoiler:`)

- **Function**: `spoiler_inline(...)`
- **AST Node**: `SpoilerInline(nodes.General, nodes.Element)`
- **Role Name**: `spoiler`
- **Scope**: HTML builder format only.
- **HTML Visitor Functions**:
  - `visit_spoiler_inline_node(self, node)`: Emits inline hidden span with an inline `onclick` handler to reveal content:  
    `<span class="yaq-spoiler-inline-hidden" onclick="this.classList.remove('yaq-spoiler-inline-hidden');">`
  - `depart_spoiler_inline_node(self, node)`: Emits `</span>`.

---

## Summary Table of Nodes and Output HTML

| RST Element | Python Class | Output HTML Markup |
| :--- | :--- | :--- |
| `.. quiz:: id` | `QuizDirective` | `<div class="yaq" data-model='{"title":"...", "uid":"..."}'>` |
| `:quiz:` | `quiz_question` | `<span class="yaq-q" data-model="<Base64_JSON>"></span>` |
| `.. spoiler:: Title` | `SpoilerDirective` | `<details class="yaq-spoiler-block"><summary>Title</summary>...` |
| `:spoiler:` | `spoiler_inline` | `<span class="yaq-spoiler-inline-hidden" onclick="...">...</span>` |
