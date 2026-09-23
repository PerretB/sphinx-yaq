Documented examples
===================

.. quiz:: documented-types-and-flags
   :title: Every documented question form

   Exact fill-in: :quiz:`{"type":"FB","answer":"réponse"}`

   Fuzzy fill-in: :quiz:`{"type":"FB","answer":"réponse","flags":"fuzzy"}`

   Sized fill-in: :quiz:`{"type":"FB","answer":"D","size":1}`

   Unordered sequence: :quiz:`{"type":"FB","answer":"rouge vert bleu","flags":"sequence"}`

   Fuzzy unordered sequence: :quiz:`{"type":"FB","answer":"rouge vert bleu","flags":"sequence,fuzzy"}`

   Ordered sequence: :quiz:`{"type":"FB","answer":"1,2,3","flags":"sequence,ordered"}`

   Whitespace-insensitive: :quiz:`{"type":"FB","answer":"New York","flags":"nospace"}`

   Quote and backslash: :quiz:`{"type":"FB","answer":"\"\\"}`

   One-variable mathematics: :quiz:`{"type":"FB","answer":"n^2 + 3","vars":{"n":[-10,10]},"flags":"math"}`

   Two-variable mathematics: :quiz:`{"type":"FB","answer":"n*m + 2*n^2","vars":{"n":[-10,10],"m":[-10,10]},"flags":"math"}`

   Regular expression: :quiz:`{"type":"FB","answer":"a+b*c$","flags":"regex","displayed-answer":"ac (par exemple)"}`

   True: :quiz:`{"type":"TF","answer":"T"}`

   False: :quiz:`{"type":"TF","answer":"F"}`

   Single choice: :quiz:`{"type":"SC","values":"A,B,C,D,E","answer":"D"}`

Inline help: :spoiler:`hidden inline text`.

.. spoiler:: Indice

   Ceci est un exemple d'aide

   sur plusieurs lignes.
