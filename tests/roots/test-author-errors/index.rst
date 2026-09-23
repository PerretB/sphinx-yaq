Author errors
=============

Outside: :quiz:`{"type":"TF","answer":"T"}`

.. quiz:: missing-title

   Content.

.. quiz:: outer
   :title: Outer

   .. quiz:: inner
      :title: Inner

      :quiz:`{"type":"TF","answer":"T"}`

   A valid outer question remains in context:
   :quiz:`{"type":"TF","answer":"T"}`

.. spoiler:: Outer

   .. spoiler:: Inner

      Content.
