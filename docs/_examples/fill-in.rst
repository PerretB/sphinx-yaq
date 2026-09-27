.. quiz:: fill-in
   :title: Text and sequences

   Enter the word "answer": :quiz:`{"type":"FB","answer":"answer"}`.

   Enter "answer"; a small typo such as "answr" is accepted:
   :quiz:`{"type":"FB","answer":"answer","flags":"fuzzy"}`.

   Enter the letter D in this small field:
   :quiz:`{"type":"FB","answer":"D","size":1}`.

   Enter "red", "green", and "blue" in any order:
   :quiz:`{"type":"FB","answer":"red green blue","flags":"sequence"}`.

   Enter the same colors in any order, allowing minor spelling variations:
   :quiz:`{"type":"FB","answer":"red green blue","flags":"sequence,fuzzy"}`.

   Enter 1, 2, 3 in that order; spaces, commas, or semicolons may separate them:
   :quiz:`{"type":"FB","answer":"1,2,3","flags":"sequence,ordered"}`.

   Enter "New York"; whitespace is ignored:
   :quiz:`{"type":"FB","answer":"New York","flags":"nospace"}`.

   Enter a double quote followed by a backslash:
   :quiz:`{"type":"FB","answer":"\"\\"}`.
