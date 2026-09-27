# Migrate a Sphinx site from the copied legacy YAQ extension

The packaged extension is **not a drop-in replacement** for a site using the
copied `Sphinx_ext` directory. Most valid `.. quiz::`, `:quiz:`, `.. spoiler::`,
and `:spoiler:` markup can stay as written, but the Sphinx configuration,
validation rules, answer grading, and progress storage have changed. Complete
the steps below in a test build before deploying updated HTML.

The package is currently pre-release. If it is not yet available on PyPI, use
a wheel built from this repository in the documentation build environment.
See [release status](migration_status.md) for the remaining regex, math, and CI
release gates.

## 1. Replace the extension installation and configuration

Install `sphinx-yaq` into the *same Python environment* that runs Sphinx.
For a locally built wheel, for example:

```console
python -m pip install path/to/sphinx_yaq-0.1.0-py3-none-any.whl
```

Once a release is published on PyPI, `python -m pip install sphinx-yaq` is the
equivalent package installation. Supported package metadata covers Python
3.10–3.14 and Sphinx 7–9; Python 3.14 needs Sphinx 8.2 or newer. The extension
supports HTML builders only.

Change the extension entry in `conf.py`. A typical legacy configuration is:

```python
import os
import sys
sys.path.insert(0, os.path.abspath('.'))  # if used only for Sphinx_ext
extensions = ['sphinx.ext.autodoc', 'Sphinx_ext.quiz']
```

Replace its YAQ-specific lines with:

```python
extensions = ['sphinx.ext.autodoc', 'sphinx_yaq']
```

Keep unrelated extensions and any `sys.path` entry needed by *other* parts of
your site. Remove the copied `source/Sphinx_ext` directory only after the new
HTML build succeeds. Remove legacy YAQ files from your own `html_js_files`,
`html_css_files`, `_static` directory, or theme overrides if you added them
manually. The packaged extension registers its namespaced JavaScript and CSS;
do not register either copy again. You may keep your existing HTML theme and
site-specific assets. The example site's switch to Alabaster is not a
requirement for consumers.

## 2. Check authored quiz content

The basic authoring form is unchanged:

```rst
.. quiz:: geography-1
   :title: Geography

   Paris is the capital of France: :quiz:`{"type":"TF","answer":"T"}`

.. spoiler:: Hint

   Think of the Seine.
```

Build-time validation is now stricter. Review every diagnostic and update
affected source lines:

| Legacy content to review | Required packaged behavior |
| --- | --- |
| Missing quiz title, nested quiz or spoiler, `:quiz:` outside a quiz | Supply `:title:`, remove nesting, and place each question inside a quiz. |
| Reused quiz ID in one document | Give each quiz in that document a distinct ID. The same ID may appear in different documents. |
| Malformed JSON, unknown fields or flags, incorrect property types | Use a JSON object with only the documented keys and types. Invalid questions now produce source-aware Sphinx errors. |
| TF answers other than `"T"` or `"F"` | Use the exact uppercase value. |
| SC choices with empty comma-separated entries or an answer outside the choices | Supply nonempty choices and make the answer match one choice exactly. |
| FB size that is zero, negative, or not an integer | Use a positive integer or omit `size`. |
| Empty or repeated flags, `ordered` without `sequence`, or `math`/`regex` combined with other flags | Use only supported combinations. |
| `regexp` in a question's `flags` | Change it to `regex`; `regexp` is rejected by the packaged parser. |
| Math variables without finite two-number intervals, or `vars` on a non-math question | Use valid `vars` only with `math`. |

The supported question types remain `TF`, `SC`, and `FB`. See the
[authoring guide](usage_guide.md) for the complete JSON fields and examples.
Author strings such as titles and choice labels are rendered as text; HTML
placed in those strings will display literally. Use ordinary nested reST
markup for rich authored prose.

## 3. Review answers that may now grade differently

Rebuild and try representative answers in a browser, especially fill-in
questions. The grading changes are intentional:

| Case | Packaged behavior |
| --- | --- |
| Ordinary exact text | Unicode NFC equivalents match; case, accents, punctuation, and surrounding whitespace otherwise matter. |
| Numeric-looking text | Valid finite decimal strings compare by decimal value, including exponents and leading zeros. Blank answers, hexadecimal/binary literals, and non-finite values no longer pass through broad number coercion. |
| `fuzzy` | Uses normalized Unicode text and an explicit default similarity threshold of `0.8`. |
| `sequence` and `sequence,ordered` | Empty sequences fail; token counts and duplicate occurrences must match one to one. Ordered answers must keep their order. |
| Wrong TF answer | The learner can retry or reveal the answer; it is no longer a terminal state. |

Regex and math comparison still have known validation or determinism gaps in
this pre-release. Do not treat sampled math comparison as symbolic proof, and
review regex patterns in real browser exercises. See the [release status](migration_status.md)
before relying on either for important assessment.

## 4. Plan for local progress and privacy

The packaged runtime has no Firebase login, cloud synchronization, accounts,
or cookie persistence. Legacy cloud or cookie progress is **not imported**.
Tell learners that existing saved progress will not follow them into the new
site. New progress is stored only in that browser profile's `localStorage`,
scoped to the site origin, document path, quiz ID, schema version, and quiz
definition. Moving a page, changing its quiz definition, clearing browser
site data, or switching devices can make previous local progress unavailable.
Quizzes still work for the current visit if storage is blocked or full.

The learner's Restart action clears one quiz. To clear every YAQ record for
the current origin, run `yaq_app.clearStoredProgress()` in that site's browser
console or call it from a site-owned clear-progress control. The browser's
site-data controls can also clear local progress.

## 5. Build and inspect the migrated site

Use a clean HTML build and treat Sphinx warnings as errors:

```console
python -m sphinx -W -E -b html path/to/source path/to/build/html
```

Then check pages containing each question type and both spoiler forms. Confirm
that quiz controls appear, grading and Restart work, and no page requests
Firebase, Font Awesome, jQuery, Watch.JS, or copied `Sphinx_ext` assets on
behalf of YAQ. Recheck any site CSS that overrides `.yaq` classes. HTML output
uses packaged `_static/sphinx_yaq/` assets; the legacy asset URLs should be
absent. Non-HTML Sphinx builders fail early with an HTML-only extension error.

If the new build fails, keep the old site published while fixing the source
and configuration in a staging environment. Reverting the extension does not
transfer or restore progress between its legacy and packaged storage systems.
