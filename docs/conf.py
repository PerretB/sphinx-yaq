"""Public HTML documentation, built locally and on Read the Docs."""

import os
from importlib.metadata import version as package_version

project = "sphinx-yaq"
author = "Benjamin Perret"
copyright = "2026, Benjamin Perret"
release = package_version("sphinx-yaq")
version = release
extensions = ["sphinx_yaq"]
language = "en"
root_doc = "index"
exclude_patterns = ["_build", "_examples", "Thumbs.db", ".DS_Store"]
html_theme = "sphinx_rtd_theme"
html_title = "sphinx-yaq documentation"
html_baseurl = os.environ.get("READTHEDOCS_CANONICAL_URL", "")
html_sidebars = {"**": ["about.html", "navigation.html", "searchfield.html"]}
