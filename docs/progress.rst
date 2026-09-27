Using quizzes and saving progress
=================================

Checking answers
----------------

Choose or type your answers, then select **Check answers**. Feedback icons
have tooltips and accessible text, and a status announcement reports the
result. Unanswered questions are highlighted briefly. Correct answers are
locked. Incorrect fill-in and single-choice answers can be edited and checked
again; an incorrect true/false answer stays locked until the exercise is
restarted.

**Show solution** reveals answers for questions that can still be solved.
Revealed answers are distinguished from answers you entered correctly.
Once an exercise is complete, **Restart** clears its answers and saved progress
so you can try again.

Local progress
--------------

YAQ saves progress automatically in the current browser profile using
``localStorage``. Progress is scoped to the site's origin, document path, and
quiz identifier. It does not synchronize between devices or browsers.
Changes to a quiz definition invalidate incompatible saved progress.

Restarting an exercise removes its saved record. Readers can also use their
browser's site-data controls to remove stored progress. If storage is disabled,
full, corrupt, or incompatible, the quiz continues to work in memory for the
current page visit.

YAQ does not use accounts, cookies, telemetry, or remote writes. Saved records
contain a schema version, a definition fingerprint, and minimal answer and
state data. They do not contain the correct-answer definitions or page markup.
However, correct answers are present in the generated page itself: this is
a self-assessment tool, not a secure examination system.

For site developers
-------------------

After the runtime has initialized, a site's own clear-progress control can call:

.. code-block:: javascript

   yaq_app.clearStoredProgress();

This removes all YAQ records for the current origin without touching other
applications' records. Reload the page to start with fresh in-memory state.

Storage keys use the format
``sphinx-yaq:v1:<encoded normalized document path>:<encoded quiz ID>``.
Serving the same site at a different origin or path creates a separate scope.
