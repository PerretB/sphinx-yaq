# sphinx-yaq

[![CI](https://github.com/PerretB/sphinx-yaq/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/PerretB/sphinx-yaq/actions/workflows/ci.yml)
[![Documentation Status](https://readthedocs.org/projects/sphinx-yaq/badge/?version=latest)](https://sphinx-yaq.readthedocs.io/en/latest/)

Interactive self-assessment quizzes and hidden hints for Sphinx HTML documentation.
Write exercises in reStructuredText and let readers check their understanding
directly on the page.

## Features

- **True/false, fill-in-the-blank, and single-choice questions**, mixed freely
  within an exercise.
- **Flexible answer matching:** exact text and decimal numbers, fuzzy spelling,
  ordered or unordered sequences, regular expressions, and numerical comparison
  of mathematical expressions.
- **Immediate feedback, solution reveal, and restart** to support self-paced
  learning.
- **Inline and block spoilers** for hints, explanations, and worked solutions.
- **Automatic local progress** that survives page reloads in the same browser.
- **Keyboard-accessible controls** with accessible names and status announcements.
- **Static-site friendly:** packaged JavaScript and CSS, with no application
  server, account, cookie, or external service required by the extension.

YAQ is intended for self-assessment. Correct answers are included in generated
HTML and can be inspected by readers. Mathematical matching uses sampled
numerical evaluation, not symbolic proof.

## Installation

Supports Python 3.10–3.14 and Sphinx 7–9, subject to Sphinx's Python requirements.
Python 3.14 requires Sphinx 8.2 or newer. HTML builders only.

```console
python -m pip install sphinx-yaq
```

The first release is in preparation. To use a source checkout, run
`python -m pip install -e .` from the repository root.

Add the extension to your Sphinx `conf.py`:

```python
extensions = ["sphinx_yaq"]
```

## A first exercise

```rst
.. quiz:: first-quiz
   :title: A quick check

   Two plus two equals :quiz:`{"type":"FB","answer":"4","size":3}`.

   Four is an even number: :quiz:`{"type":"TF","answer":"T"}`.

   Choose an even number: :quiz:`{"type":"SC","values":"3,4,5","answer":"4"}`.

   .. spoiler:: Hint

      An even number is divisible by two.
```

Each quiz needs a page-unique identifier and a title. The extension adds its
browser assets automatically when Sphinx builds the HTML pages.

## Documentation

The [English user guide](https://sphinx-yaq.readthedocs.io/en/latest/) includes
[installation instructions](https://sphinx-yaq.readthedocs.io/en/latest/getting-started.html),
[working examples](https://sphinx-yaq.readthedocs.io/en/latest/examples.html),
the [authoring reference](https://sphinx-yaq.readthedocs.io/en/latest/authoring.html),
and [progress and privacy details](https://sphinx-yaq.readthedocs.io/en/latest/progress.html).

Try the live examples directly: [mixed exercise](https://sphinx-yaq.readthedocs.io/en/latest/examples.html#a-mixed-exercise),
[true or false](https://sphinx-yaq.readthedocs.io/en/latest/examples.html#true-or-false),
[fill in the blanks](https://sphinx-yaq.readthedocs.io/en/latest/examples.html#fill-in-the-blanks),
[mathematical expressions](https://sphinx-yaq.readthedocs.io/en/latest/examples.html#mathematical-expressions),
[regular expressions](https://sphinx-yaq.readthedocs.io/en/latest/examples.html#regular-expressions),
[single choice](https://sphinx-yaq.readthedocs.io/en/latest/examples.html#single-choice),
and [hints and spoilers](https://sphinx-yaq.readthedocs.io/en/latest/examples.html#hints-and-spoilers).

Build the documentation locally:

```console
python -m pip install -e . -r docs/requirements.txt
python -m sphinx -W --keep-going -E -b html docs docs/_build/html
python -m http.server 8000 --directory docs/_build/html
```

Open [localhost:8000](http://localhost:8000). The repository also includes
[Read the Docs configuration](.readthedocs.yaml) for publishing the HTML guide.

## Development

```console
python -m pip install -r requirements-test.txt
npm ci
npm run test:js
python -m pytest
python -m build
python scripts/smoke_test_wheel.py
```

Edit browser code in `frontend/src/` and regenerate the packaged bundle with
`npm run build:js`. See the [development guide](https://sphinx-yaq.readthedocs.io/en/latest/contributing.html).

## License

[MIT](LICENSE).
