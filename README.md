# sphinx-yaq

YAQ is a Sphinx extension for adding interactive self-assessment quizzes and
spoilers to HTML documentation. This repository is migrating a legacy
implementation while preserving its characterized behavior.

## Installation

Install the package and enable it in `conf.py`:

```python
extensions = ["sphinx_yaq"]
```

The existing `quiz` and `spoiler` reStructuredText syntax is preserved. See
[`examples/demo`](examples/demo) for the imported demonstration site.

Quiz progress is stored locally in the current browser profile using
versioned, document-scoped `localStorage`. YAQ uses no accounts, cookies, cloud
synchronization, telemetry, or remote writes. Restart clears the current
quiz's saved progress; see [`docs/usage_guide.md`](docs/usage_guide.md) for the
storage format, privacy behavior, and site-wide clearing API.

## Development

Install the Python test environment, run both characterization suites, and
build the distributions:

```console
python -m pip install -r requirements-test.txt
npm ci
npm run test:js
python -m pytest
python -m sphinx -E -b html examples/demo/source examples/demo/build/html
npm run test:e2e
python -m build
python scripts/smoke_test_wheel.py
```

The smoke script creates an isolated virtual environment, installs the built
wheel, and builds a minimal HTML project from outside the repository.
