Validation errors
=================

.. quiz:: invalids
   :title: Invalid declarations

   :quiz:`[]`
   :quiz:`{"answer":"x"}`
   :quiz:`{"type":"XX","answer":"x"}`
   :quiz:`{"type":"TF"}`
   :quiz:`{"type":"TF","answer":"X"}`
   :quiz:`{"type":"TF","answer":"T","extra":1}`
   :quiz:`{"type":"FB","answer":"x","size":0}`
   :quiz:`{"type":"FB","answer":"x","flags":[]}`
   :quiz:`{"type":"FB","answer":"x","flags":"unknown"}`
   :quiz:`{"type":"FB","answer":"x","flags":"fuzzy,"}`
   :quiz:`{"type":"FB","answer":"x","flags":"fuzzy,fuzzy"}`
   :quiz:`{"type":"FB","answer":"x","flags":"ordered"}`
   :quiz:`{"type":"FB","answer":"x","flags":"math,fuzzy","vars":{"x":[0,1]}}`
   :quiz:`{"type":"FB","answer":"x","flags":"math"}`
   :quiz:`{"type":"FB","answer":"x","vars":{"x":[0,1]}}`
   :quiz:`{"type":"FB","answer":"x","flags":"math","vars":{"x":[0]}}`
   :quiz:`{"type":"FB","answer":"x","flags":"math","vars":{"x":[true,1]}}`
   :quiz:`{"type":"FB","answer":"x","flags":"math","vars":{"x":[2,1]}}`
   :quiz:`{"type":"FB","answer":"x","displayed-answer":3}`
   :quiz:`{"type":"SC","values":"A,,B","answer":"A"}`
   :quiz:`{"type":"SC","values":"A,B","answer":"C"}`
