.. _Quiz:



Création d'exercices interactifs
********************************

Ce projet inclut une extension premettant de créer des exercices interactifs dans
les documents html générés. Les exercices sont décrits en utilisant de nouvelles balises 
Restructured Text. 

Par exemple, le code suivant:

.. code:: ReST

    .. quiz:: quizz-num1
	    :title: Démo exercice

		La conférence de Yalta a eu lieu à :quiz:`{"type":"FB","answer":"Yalta","flags":"fuzzy","size":10}` en l'an :quiz:`{"type":"FB","answer":"1945","size":4}` avec les 3 dirigeants :quiz:`{"type":"FB","answer":"Churchill Staline Roosevelt","flags":"fuzzy,sequence"}`.
		
		L'URSS a déclaré la guerre au Japon a l'issue de cette conférence :quiz:`{"type":"TF","answer":"T"}`.
		
		Cette conférence a été suivie par la conférence de :quiz:`{"type":"SC", "values":"Paris,Potsdam,San Francisco","answer":"San Francisco"}` qui a permis la création de l'ONU.

permet de générer cet exercice interactif. 

.. quiz:: quizz-num1
	:title: Démo exercice

		La conférence de Yalta a eu lieu à :quiz:`{"type":"FB","answer":"Yalta","flags":"fuzzy","size":10}` en l'an :quiz:`{"type":"FB","answer":"1945","size":4}` avec les 3 dirigeants :quiz:`{"type":"FB","answer":"Churchill Staline Roosevelt","flags":"fuzzy,sequence"}`.
		
		L'URSS a déclaré la guerre au Japon a l'issue de cette conférence :quiz:`{"type":"TF","answer":"T"}`.
		
		Cette conférence a été suivie par la conférence de  :quiz:`{"type":"SC", "values":"Paris,Potsdam,San Francisco","answer":"San Francisco"}` qui a permis la création de l'ONU.


Definition
==========


Un nouvel exercice est introduit avec la directive ``quiz`` suivie d'un argument qui est un identifiant interne de l'exercice. Chaque exercice doit avoir un identifiant différent.

La directive ``quiz`` possède une option ``title`` qui permet de définir le titre de l'exercice qui appaitra dans la partie supérieur de la boîte d'exercice, à côté de son numéro.

Un champ de question interactif peut être inséré dans le contenu d'une directive ``quiz`` avec un rôle du même nom: ``quiz``. 
Un rôle est décrit par un dictionaire, une liste de paire clefs/valeurs, qui décrit le type de question (question vrai/faux, trou à remplir...) et les propriétés associées (réponse, taille du champs de texte, liste de possibilités...)

Le dictionnaire d'un rôle ``quiz`` comprend au moins 2 propriétés:

- "type": décrit le type de question. Les valeurs possibles sont:

    * "TF": questions vrai/faux (True/False)
    * "FB": trou à remplir (Field Blank)
    * "SC": choix unique parmi une liste de possibilités (Single Choice)

- "answer": donne la réponse attendue


Question vrai/faux
------------------

Les questions vrai/faux sont les plus simples, elles ne disposent que 2 propriétés de base "type" et "answer". 

Exemple:


.. code:: ReST

    .. quiz:: qVF
	    :title: Exemple vrai/faux

		La réponse à cette question est vrai: :quiz:`{"type":"TF","answer":"T"}`.

		La réponse à cette question est faux: :quiz:`{"type":"TF","answer":"F"}`.

permet de générer cet exercice interactif: 

.. quiz:: qVF
	    :title: Exemple vrai/faux

		La réponse à cette question est vrai: :quiz:`{"type":"TF","answer":"T"}`.

		La réponse à cette question est faux: :quiz:`{"type":"TF","answer":"F"}`.

Question à trou
---------------

En plus des 2 propriétés obligatoires ("type" et "answer"), les questions à trou dispose des propriétés optionelles suivantes:

- "size": entier positif donnant la taille du champs de réponse en nombre de caractères
- "flags": liste d'indicateurs séparés par des virgules qui permettent de modifier comment le programme teste la 
  correspondance entre la réponse donnée et la réponse attendue. Si aucun indicateur n'est donné, le programme réalise un test d'égalité
  strict entre la réponse attendue et la réponse donnée. 
  
    * L'indicateur ``fuzzy`` permet d'effectuer un test d'égalité flou basé sur une 
      distance d'édition : si la distance entre la réponse donnée et la réponse attendue est suffisamment faible, la réponse est considérée comme correcte.
    * L'indicateur ``sequence`` permet d'indiquer que chaque mot de la réponse comprend plusieurs éléments et que l'odre de ces éléments n'est pas important. 
    * L'indicateur ``ordered`` (combiné avec l'indicateur ``sequence``) permet d'indiquer que l'ordre des éléments de la séquence doit être respecté.
    * L'indicateur ``math`` indique que la réponse est une expression mathématique contenant une ou plusieurs variables. La comparaison d'expressions mathématiques
      est réalisée en comparant les résultats de l'évaluation des expressions pour différentes valeurs de variables tirées aléatoirement. 
    * L'indicateur ``regexp`` permet de comparer la réponse donnée à une expression régulière. Un guide de syntaxe est disponible dans la `documentation javascript <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions>`_ (ne pas utiliser la notation litérale).

- "vars" (uniquement si l'indicateur ``math`` est utilisé dans "flags"): dictionnaire associant un nom de variable à une plage de valeur. Par exemple ``"vars":{"n":[1,10]}``
  indique que l'expression mathématique peut contenir une variable "n" et les valeurs aléatoires pour cette variable seront tirées dans l'interval [1, 10]. 
- "displayed-answer": spécifie la réponse à afficher à l'utilisateur. Si cette propriété est absente, la réponse affichée est la réponse spécifiée dans la propriété "answer".


Dans la propriété "answer", il est nécessaire d'utiliser le caractère d'échappement backslash ``\`` pour insérer un caractère double guillemet  ou backslash :

	* ``"`` devient ``\"``; et
	* ``\`` devient ``\\``

Exemple:

.. code:: ReST

    .. quiz:: qTF
	    :title: Exemple de questions à trou

		La réponse à cette question est "réponse" :quiz:`{"type":"FB","answer":"réponse"}`

		La réponse à cette question est "réponse", de légères variation comme "reponse" ou "rponse" sont aussi acceptées :quiz:`{"type":"FB","answer":"réponse","flags":"fuzzy"}`

		La réponse à cette question est "D", un petit champs texte est suffisant :quiz:`{"type":"FB","answer":"D", "size":1}`

		La réponse à cette question sont les mots "rouge", "vert" et "bleu", l'ordre des mots n'est pas important ("rouge vert bleu" et "bleu vert rouge" sont possibles par exemple) :quiz:`{"type":"FB","answer":"rouge vert bleu","flags":"sequence"}`

		La réponse à cette question sont les mots "rouge", "vert" et "bleu", l'ordre des mots n'est pas important et de légère variations sont tolérées ("rrouge vert bleu" et "bleu vert rouges" sont possibles par exemple) :quiz:`{"type":"FB","answer":"rouge vert bleu","flags":"sequence,fuzzy"}`

		La réponse à cette question est "1, 2, 3", l'ordre est important (des variations commes "1,2,3" ou "1 2 3" ou "1;2;3" sont acceptées) :quiz:`{"type":"FB","answer":"1,2,3","flags":"sequence,ordered"}`		
		
		La réponse à cette question est ``"\`` :quiz:`{"type":"FB","answer":"\"\\"}`

		La réponse à cette question est "n^2+3" (ou une expression équivalente) :quiz:`{"type":"FB","answer":"n^2 + 3","vars":{"n":[-10,10]}, "flags":"math"}`

		La réponse à cette question est "n*m + 2*n^2" (ou une expression équivalente) :quiz:`{"type":"FB","answer":"n*m + 2*n^2","vars":{"n":[-10,10], "m":[-10,10]}, "flags":"math"}`

		La réponse à cette question doit matcher l'expression régulière "a+b*c$"  :quiz:`{"type":"FB","answer":"a+b*c$", "flags":"regex", "displayed-answer":"ac (par exemple)"}`


permet de générer cet exercice interactif: 

.. quiz:: qTF
	    :title: Exemple de questions à trou

		La réponse à cette question est "réponse" :quiz:`{"type":"FB","answer":"réponse"}`

		La réponse à cette question est "réponse", de légères variation comme "reponse" ou "rponse" sont aussi acceptées, :quiz:`{"type":"FB","answer":"réponse","flags":"fuzzy"}`

		La réponse à cette question est "D", un petit champs texte est suffisant :quiz:`{"type":"FB","answer":"D", "size":1}`

		La réponse à cette question sont les mots "rouge", "vert" et "bleu", l'ordre des mots n'est pas important ("rouge vert bleu" et "bleu vert rouge" sont possibles par exemple) :quiz:`{"type":"FB","answer":"rouge vert bleu","flags":"sequence"}`

		La réponse à cette question sont les mots "rouge", "vert" et "bleu", l'ordre des mots n'est pas important et de légère variations sont tolérées ("rrouge vert bleu" et "bleu vert rouges" sont possibles par exemple) :quiz:`{"type":"FB","answer":"rouge vert bleu","flags":"sequence,fuzzy"}`

		La réponse à cette question est "1, 2, 3", l'ordre est important (des variations commes "1,2,3" ou "1 2 3" ou "1;2;3" sont acceptées) :quiz:`{"type":"FB","answer":"1,2,3","flags":"sequence,ordered"}`

		La réponse à cette question est ``"\`` :quiz:`{"type":"FB","answer":"\"\\"}`

		La réponse à cette question est "n^2+3" (ou une expression équivalente) :quiz:`{"type":"FB","answer":"n^2 + 3","vars":{"n":[-10,10]}, "flags":"math"}`

		La réponse à cette question est "n*m + 2*n^2" (ou une expression équivalente) :quiz:`{"type":"FB","answer":"n*m + 2*n^2","vars":{"n":[-10,10], "m":[-10,10]}, "flags":"math"}`

		La réponse à cette question doit matcher l'expression régulière "a+b*c$"  :quiz:`{"type":"FB","answer":"a+b*c$", "flags":"regex", "displayed-answer":"ac (par exemple)"}`

Question à choix dans une liste
-------------------------------

En plus des 2 propriétés obligatoires ("type" et "answer"), les questions à choix dans une liste possède la propriété 
obligatoire "values" qui donne la liste des possibilités, séparées par des virgules.


Exemple:

.. code:: ReST

    .. quiz:: qSC
	    :title: Exemple choix dans une liste

		La réponse à cette question est "D" :quiz:`{"type":"SC", "values":"A,B,C,D,E","answer":"D"}`


permet de générer cet exercice interactif. 

.. quiz:: qSC
	    :title: Exemple choix dans une liste

		La réponse à cette question est "D" :quiz:`{"type":"SC", "values":"A,B,C,D,E","answer":"D"}`

Aides
=====

Il est possible d'ajouter des aides, c'est à dire des informations initialement cachées qui peuvent être affichées par l'utilisateur avec un clic. 
La directive "spoiler" et le rôle "spoiler" permettent de définir des aides respectivement sous forme de blocs et de texte en ligne.
La directive "spoiler" possède un argument obligatoire qui est le titre de l'aide.
Les aides peuvent être utilisées en dehors de la directive "quiz".

Exemple de rôle "spoiler":

.. code:: ReST

	Cliquez sur la zone de texte en noire pour afficher son contenu: :spoiler:`son contenu`.
	

permet de générer:

	Cliquez sur la zone de texte en noire pour afficher son contenu: :spoiler:`son contenu`.		

Exemple de directive "spoiler":

.. code:: ReST

	.. spoiler:: Indice

		Ceci est un exemple d'aide

		sur plusieurs lignes.

permet de générer:

	.. spoiler:: Indice

		Ceci est un exemple d'aide

		sur plusieurs lignes.


Internationalisation
====================

Il est possible de modifier les textes affichés dans les boîtes d'exercices (par exemple pour un cours en anglais) en éditant le fichier
``yaq.js`` situé dans le dossier ``source/_static``. Tous les textes sont décrits en haut du fichier dans le dictionnaire ``texts``:

.. code:: javascript

	/*String constants*/
	var texts = {
		"True" : "V",
		"False": "F",
		"dontKnow": "?",
		"gradeButtonText": "Corriger",
		"resetButtonText": "Recommencer",
		"solveButtonText": "Montrer la solution"
	};

Cette modification affectera tous les exercices du projet.