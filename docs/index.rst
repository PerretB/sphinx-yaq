sphinx-yaq
==========

sphinx-yaq adds interactive self-assessment quizzes and hidden hints to Sphinx
HTML documentation. Write questions directly in reStructuredText and let readers
check their understanding without leaving the page.

Features
--------

* **Three question types:** true/false, fill in the blank, and single choice.
* **Flexible answer matching:** exact text and decimal numbers, approximate
  spelling, ordered or unordered sequences, regular expressions, and numerical
  comparison of mathematical expressions.
* **Feedback and solutions:** check answers, reveal solutions, and restart an
  exercise.
* **Hidden hints:** inline spoilers and collapsible blocks with rich content.
* **Local progress:** answers survive reloads in the same browser profile.
* **Static hosting:** packaged JavaScript and CSS, with no application server
  or external service required by the extension.
* **Keyboard controls:** native form controls, accessible names, and status
  announcements.

Start with :doc:`getting-started`, then explore the working :doc:`examples`
and the complete :doc:`authoring reference <authoring>`.

.. note::

   YAQ is designed for self-assessment. Correct answers are included in the
   generated HTML and can be inspected by readers.

.. toctree::
   :maxdepth: 2
   :caption: User guide

   getting-started
   examples
   authoring
   internationalization
   progress
   contributing
   changelog
