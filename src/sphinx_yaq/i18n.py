"""Explicit, document-local UI language resolution and packaged catalogs."""

from functools import lru_cache
import json
from pathlib import Path
import re

from sphinx.util import logging

LOGGER = logging.getLogger(__name__)
LOCALES = Path(__file__).with_name("locales")


@lru_cache(maxsize=None)
def catalog(language):
    """Read trusted package data; callers must not mutate the cached dictionary."""
    return json.loads((LOCALES / f"{language}.json").read_text(encoding="utf-8"))


def resolve_language(value, location=None):
    """Normalize locale identifiers, falling back to a supported base language."""
    normalized = str(value).strip().replace("_", "-").lower()
    if re.fullmatch(r"[a-z]{2,3}(?:-[a-z0-9]{2,8})*", normalized):
        base = normalized.split("-")[0]
        if base in {"en", "fr"}:
            return base
    LOGGER.warning(
        "Unsupported YAQ language %r; using English (supported: en, fr).",
        value,
        location=location,
        type="yaq",
        subtype="language",
    )
    return "en"


def record_document(app, doctree):
    """Preserve the source document when singlehtml assembles several trees."""
    from .quiz import Quiz, SpoilerInline

    for node in doctree.findall():
        if isinstance(node, (Quiz, SpoilerInline)):
            node["yaq_docname"] = app.env.docname


def localize_doctree(app, doctree, docname):
    # Resolve after Sphinx has collected document metadata. No shared config or
    # environment mutation: this also works in parallel and cached builds.
    from .quiz import Quiz, SpoilerInline

    defaults = {}

    def default_language(node):
        source_doc = node.get("yaq_docname", docname)
        if source_doc not in defaults:
            default = app.env.metadata.get(source_doc, {}).get("yaq-language")
            if default is None:
                default = app.config.yaq_language
            if default is None:
                default = app.config.language or "en"
            defaults[source_doc] = resolve_language(default, (source_doc, 1))
        return defaults[source_doc]

    for node in doctree.findall(Quiz):
        language = (
            resolve_language(node["language"], node)
            if node.get("language") is not None
            else default_language(node)
        )
        node["i18n"] = {"language": language, "messages": catalog(language)}
    for node in doctree.findall(SpoilerInline):
        parent = node.parent
        while parent is not None and not isinstance(parent, Quiz):
            parent = parent.parent
        language = parent["i18n"]["language"] if parent is not None else default_language(node)
        node["ui_language"] = language
        node["label"] = catalog(language)["show_hidden_text"]
