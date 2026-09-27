Building the documentation
==========================

From a repository checkout, install the package and documentation dependencies:

.. code-block:: console

   python -m pip install -e . -r docs/requirements.txt
   python -m sphinx -W --keep-going -E -b html docs docs/_build/html

Open ``docs/_build/html/index.html`` or serve that directory with
``python -m http.server``. The same Sphinx configuration is used by Read the
Docs. CI also builds the public documentation with warnings treated as errors.

The examples on :doc:`examples` are included both as source code and as live
exercises from the same ``docs/_examples/`` files. Edit those files to keep the
displayed syntax and rendered examples in sync. All public documentation and
example labels are written in English.

Developing the extension
------------------------

Install the test dependencies and run the checks from the repository root:

.. code-block:: console

   python -m pip install -r requirements-test.txt
   npm ci
   npm run test:js
   python -m pytest

Editable JavaScript lives in ``frontend/src/``. After changing it, run
``npm run build:js`` to regenerate the packaged bundle, then rerun the checks.
Node.js is needed for frontend development, but not for building the
documentation with the committed package assets.

Package validation uses:

.. code-block:: console

   python -m build
   python scripts/smoke_test_wheel.py

The package is distributed under the MIT license.
