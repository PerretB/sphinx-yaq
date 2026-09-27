Interface language
==================

YAQ includes English (``en``) and French (``fr``) message catalogs. Language
selection covers buttons, tooltips, feedback, headings, screen-reader labels,
status announcements, and learner-facing errors. Titles, questions, choices,
answers, and hint content remain as written by the author.

Project configuration
---------------------

By default, YAQ follows Sphinx's language in ``conf.py``:

.. code-block:: python

   language = "fr"

To select a different language for YAQ's interface, set ``yaq_language``:

.. code-block:: python

   language = "en"
   yaq_language = "fr"

``yaq_language`` defaults to ``None``, meaning inherit Sphinx's setting.
With neither setting supplied, YAQ uses English. Projects that previously
set ``language = "fr"`` now receive French controls automatically; set
``yaq_language = "en"`` to retain English controls.

Document and quiz overrides
---------------------------

Place a metadata field **before the document title** to change the interface
language for a whole RST document, including standalone inline spoilers:

.. code-block:: rst

   :yaq-language: fr

   Exercises
   =========

   .. quiz:: capitals
      :title: Capitales

      La capitale de la France est :quiz:`{"type":"FB","answer":"Paris"}`.

Use ``:language:`` on a quiz to override the document or project default:

.. code-block:: rst

   .. quiz:: capitals-english
      :title: Capitals
      :language: en

      The capital of France is :quiz:`{"type":"FB","answer":"Paris"}`.

The precedence is quiz ``:language:`` → document ``:yaq-language:`` →
``yaq_language`` → Sphinx ``language`` → English. Inline spoilers within a quiz
inherit its interface language; block spoiler titles remain author-written.
The document metadata applies to the entire document, including included RST
content. These settings select YAQ messages during the build; they do not
change Sphinx's theme language or provide a reader-facing language switch.

Regional identifiers such as ``fr_CA`` and ``fr-CA`` use the French catalog.
Unsupported or malformed identifiers generate a ``yaq.language`` build warning
and use English; warnings fail builds using ``-W``. Missing message keys fall
back to English. UI language changes do not alter grading or invalidate
compatible saved answers. True/false answers remain ``"T"`` and ``"F"`` in RST,
even though French controls display ``V`` and ``F``.

Adding translations
-------------------

The UTF-8 catalogs live in ``src/sphinx_yaq/locales/en.json`` and ``fr.json``.
Python and JavaScript share these files. Messages are plain text with named
placeholders such as ``{number}``; preserve the keys and placeholders when
translating. Count messages contain plural forms selected with
``Intl.PluralRules``. Adding another language also requires registering it in
the Python language resolver, extending catalog tests, and rebuilding the
JavaScript bundle. Catalogs are included in the installed wheel, and no
translation service or network request is used at runtime.
