Getting started
===============

Requirements
------------

YAQ supports Python 3.10 through 3.14 and Sphinx 7 through 9, subject to
Sphinx's own Python requirements. Python 3.14 requires Sphinx 8.2 or newer.
Only HTML builders are supported, including ``html`` and ``dirhtml``.

Install and enable
------------------

Install the package in the environment used to build your documentation:

.. code-block:: console

   python -m pip install sphinx-yaq

For an unreleased checkout, install from the repository root instead:

.. code-block:: console

   python -m pip install -e .

Add the extension to your Sphinx project's ``conf.py``, retaining any other
extensions you use:

.. code-block:: python

   extensions = ["sphinx_yaq"]

The extension copies its JavaScript and CSS into the generated site
automatically. There are no extension-specific Sphinx configuration settings.

Your first quiz
---------------

Add this to an ``.rst`` page:

.. code-block:: rst

   .. quiz:: first-quiz
      :title: A quick check

      Two plus two equals :quiz:`{"type":"FB","answer":"4","size":3}`.

      Four is an even number: :quiz:`{"type":"TF","answer":"T"}`.

The identifier ``first-quiz`` must be unique within that page. The title is
required, and question roles must be inside the indented quiz content.

Build your site
---------------

A Sphinx project consists of a ``conf.py`` configuration file and an entry
page, usually ``index.rst``, which links to other pages using a ``toctree``.
If those files are in ``docs/``, run from your project root:

.. code-block:: console

   python -m sphinx -W -b html docs docs/_build/html

Open ``docs/_build/html/index.html`` to read the result. To test browser
progress under a stable web address, serve the output locally:

.. code-block:: console

   python -m http.server 8000 --directory docs/_build/html

Then visit ``http://localhost:8000``. Sphinx builds incrementally; add ``-E -a``
to rebuild all pages when troubleshooting stale output. Use the page's
**Page source** link to inspect the reStructuredText behind an example.

Read the Docs
-------------

This repository includes ``.readthedocs.yaml``. It installs the package and the
documentation requirements, then builds ``docs/conf.py`` with warnings treated
as errors. Import the repository into Read the Docs and select the branch or
tag to publish. PDF and EPUB builds are not enabled because YAQ requires HTML.

For your own project, include ``sphinx-yaq`` in the requirements installed by
Read the Docs and enable the extension in your ``conf.py`` as above.
See the `Read the Docs configuration reference
<https://docs.readthedocs.com/platform/stable/config-file/v2.html>`_ for hosting
configuration options.
