.. _Intro:



Introduction rapide à SphinxDoc
*******************************

SphinxDoc permet de transformer des documents écrits dans le langage de balisage léger *Restructured Text* en différents formats 
et notamment en site web.

.. important:: 

    `Cheat sheet Restructured Text <https://github.com/ralsina/rst-cheatsheet/blob/master/rst-cheatsheet.rst>`_

Un projet SphinxDoc est composé:

- d'un fichier ``conf.py`` dans le dossier ``source`` qui contient les informations de configuration du projet (nom, auteurs, paramètres de build...).
  Comme son extension le suggère c'est un fichier contenant du code python qui sera exécuté par Sphinx lors de la compilation du projet.
- d'au moins un fichier ``rst`` dont le nom est indiqué par la variable ``master_doc`` dans le fichier ``conf.py``. 
  Dans cet exemple c'est le fichier ``index.rst`` situé dans le dossier ``source``.

Compiler un projet SphinxDoc
----------------------------


Pour compiler ce projet SphinxDoc, il vous faut:

- un interpréteur python suffisamment récent
- le paquet sphinxdoc, il peut être installé avec la commande ``pip install sphinx``
- le thème ReadTheDoc utilisé par ce projet, il peut être installé avec la commande ``pip install sphinx-rtd-theme``

La compilation se fait dans un terminal. Placez vous dans le dossier racine du projet et exécutez la commande

- ``make html`` sous Unix
- ``make.bat html`` sous Windows

Le résultat de la compilation est placé dans le dossier ``build/html``.

Le processus de compilation est incrémental, ce qui permet de gagner du temps mais cela crée parfois des problèmes de synchronisation. Si vous avez l'impression que 
certains changements ne sont pas pris en compte lors de la compilation, vous pouvez nettoyer le résultat de compilation existant afin de reconstruire le projet 
en entier:

- ``make clean`` sous Unix
- ``make.bat clean`` sous Windows






.. important::

    Il est possible de voir le source Restructured Text d'une page web générée avec SphinxDoc en 
    cliquant sur le lien ``View page source`` situé en haut à droite de chaque page. Ainsi, si vous vous demandez
    comment il est possible d'obtenir le même rendu que sur une page donnée, il suffit de regarder comment l'auteur a fait.