Authoring reference
===================

Quiz blocks
-----------

Use ``.. quiz:: identifier`` with a required ``:title:`` option and an indented
body. Identifiers cannot contain whitespace and must be unique within a
document; they may be reused on different pages. Keep identifiers stable to
retain compatible saved progress. Quiz blocks cannot be nested.

The body supports normal Sphinx content, including paragraphs, lists, code,
and spoilers. Insert questions with the ``:quiz:`` role. Each role contains
a JSON object with double-quoted property names and string values. Unknown
properties and invalid declarations produce source-aware build diagnostics.

Question types
--------------

.. list-table:: Required properties
   :header-rows: 1
   :widths: 20 20 60

   * - Type
     - ``type``
     - Other required properties
   * - True/false
     - ``"TF"``
     - ``answer``: exactly ``"T"`` or ``"F"``.
   * - Fill in the blank
     - ``"FB"``
     - ``answer``: a nonempty string.
   * - Single choice
     - ``"SC"``
     - ``values``: comma-separated, nonempty choices; ``answer``: one of them.

Single-choice labels are trimmed around separators, and the answer must match
a choice exactly. Commas separate choices and cannot be part of a label.
Titles, choice labels, and displayed answers are rendered as plain text.

Fill-in options
---------------

.. list-table:: Optional properties for ``FB``
   :header-rows: 1
   :widths: 25 75

   * - Property
     - Meaning
   * - ``size``
     - A positive integer setting the text field width in characters.
   * - ``flags``
     - A comma-separated string of comparison flags, described below.
   * - ``displayed-answer``
     - Text shown when revealing the solution, in place of ``answer``.
   * - ``vars``
     - With ``math`` only: a mapping from variable names to numeric ranges,
       for example ``{"n": [-10, 10]}``. Each range has two finite,
       strictly increasing bounds. Required for variable expressions;
       constant expressions may omit it.

Comparison flags
----------------

With no flags, text comparison is case, accent, punctuation, and whitespace
sensitive after Unicode NFC normalization. Decimal strings compare by exact
numeric value: ``01`` equals ``1`` and ``1e3`` equals ``1000``. Empty input,
surrounding whitespace, hexadecimal numbers, and non-finite values do not
receive numeric conversion.

``nospace``
   Removes Unicode whitespace before comparison. ``New York`` then matches
   ``NewYork``.

``fuzzy``
   Accepts minor spelling variations. Matching ignores case and accents,
   trims and collapses whitespace, and uses a normalized Levenshtein similarity
   threshold of 0.8. Punctuation still contributes to the distance.
   The authoring syntax does not expose a threshold setting.

``sequence``
   Splits on whitespace, commas, and semicolons and matches tokens in any order.
   Every token must match once, including duplicates. Empty sequences and
   different token counts are rejected.

``ordered``
   Requires ``sequence`` and compares tokens in order.

``math``
   Numerically compares expressions using math.js at randomly sampled values
   from ``vars``. Use ``^`` for powers and ``*`` for multiplication. This is a
   sampled numerical check, not a symbolic proof, and results can depend on
   the chosen ranges and samples. Choose ranges where both expressions are
   defined.

``regex``
   Tests input against a JavaScript regular expression stored in ``answer``.
   Write the pattern without surrounding slashes. Use ``^`` and ``$`` when
   the entire answer must match. Supply a readable ``displayed-answer``
   instead of showing readers the pattern. Test patterns carefully; complex
   patterns can be slow on long input.

``fuzzy``, ``nospace``, and ``sequence`` can be combined; ``ordered`` can be
added when ``sequence`` is present. ``math`` and ``regex`` each require their
own exclusive mode. Empty, duplicated, and unrecognized flags are rejected.

Escaping JSON strings
---------------------

Inside a JSON string value, escape a double quote as ``\"`` and a backslash
as ``\\``. Do not escape the double quotes delimiting JSON properties.
For example, this question expects a quote followed by a backslash:

.. code-block:: rst

   :quiz:`{"type":"FB","answer":"\"\\"}`

Spoilers
--------

Inline spoilers reveal plain text when activated:

.. code-block:: rst

   Reveal the hint: :spoiler:`Look for a common factor.`

Block spoilers use a required single-word title and can contain multiple paragraphs and
Sphinx markup:

.. code-block:: rst

   .. spoiler:: Hint

      Start by **factoring** the expression.

      Then simplify the remaining terms.

Both forms work inside or outside a quiz. Block spoilers use native
``details``/``summary`` elements; inline spoilers use keyboard-accessible buttons.

Troubleshooting
---------------

* Build with ``-W`` to catch authoring diagnostics before publication.
* Check JSON quoting, required properties, unique identifiers, and indentation
  if a question fails during a Sphinx build.
* Serve the generated HTML and enable JavaScript to use the interactive controls.
* Use an HTML builder: LaTeX, PDF, EPUB, and other non-HTML outputs are unsupported.
