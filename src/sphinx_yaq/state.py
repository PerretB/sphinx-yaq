"""Document-local parsing state for YAQ directives and roles."""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Iterator

from docutils import nodes


@dataclass
class DocumentState:
    quiz_depth: int = 0
    spoiler_depth: int = 0
    quiz_ids: dict[str, tuple[str, int | None]] = field(default_factory=dict)


def get_document_state(document: nodes.document) -> DocumentState:
    state = getattr(document, "_sphinx_yaq_state", None)
    if state is None:
        state = DocumentState()
        setattr(document, "_sphinx_yaq_state", state)
    return state


@contextmanager
def parsing_context(document: nodes.document, kind: str) -> Iterator[None]:
    state = get_document_state(document)
    attribute = f"{kind}_depth"
    setattr(state, attribute, getattr(state, attribute) + 1)
    try:
        yield
    finally:
        setattr(state, attribute, getattr(state, attribute) - 1)
