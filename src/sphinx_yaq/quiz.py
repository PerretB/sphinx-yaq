"""Sphinx integration for YAQ quizzes and spoilers."""

from __future__ import annotations

import base64
import html
import json
import os
from typing import Any

from docutils import nodes, utils
import docutils.parsers.rst.directives as validators
from sphinx.errors import ExtensionError
from sphinx.util.docutils import Directive

from .models import ModelValidationError, Question, parse_question
from .state import get_document_state, parsing_context


class QuizQuestion(nodes.General, nodes.Element):
    pass


class Quiz(nodes.General, nodes.Element):
    pass


class SpoilerBlock(nodes.General, nodes.Element):
    pass


class SpoilerInline(nodes.General, nodes.Element):
    pass


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def visit_quiz_question_node(self, node: QuizQuestion) -> None:
    model_json = _json(node["model"].as_dict())
    encoded = base64.standard_b64encode(model_json.encode("utf-8")).decode("ascii")
    self.body.append(
        self.starttag(node, "span", "", CLASS="yaq-q", **{"data-model": encoded})
    )


def depart_quiz_question_node(self, node: QuizQuestion) -> None:
    self.body.append("</span>")


def _role_error(inliner, rawtext: str, lineno: int, message: str):
    system_message = inliner.reporter.error(message, line=lineno)
    problematic = inliner.problematic(rawtext, rawtext, system_message)
    return [problematic], [system_message]


def quiz_question(
    name,
    rawtext,
    text,
    lineno,
    inliner,
    options=None,
    content=None,
):
    """Parse and validate an inline question model."""

    del name, content
    state = get_document_state(inliner.document)
    if state.quiz_depth == 0:
        return _role_error(
            inliner,
            rawtext,
            lineno,
            "Role :quiz: must appear inside a quiz directive.",
        )

    try:
        # Docutils protects escaped characters in role content with internal
        # markers. Restore the authored backslashes before handing the actual
        # role text to the JSON parser.
        model: Question = parse_question(utils.unescape(text, restore_backslashes=True))
    except ModelValidationError as error:
        return _role_error(
            inliner, rawtext, lineno, f"Invalid :quiz: model: {error}."
        )
    return [QuizQuestion(model=model, args=options or {})], []


def visit_quiz_node(self, node: Quiz) -> None:
    # The current runtime inserts titles through legacy HTML construction.
    # Preserve its public behavior while making authored strings inert.
    model = {
        "title": html.escape(node["title"], quote=True),
        "uid": html.escape(node["uid"], quote=True),
    }
    self.body.append(
        self.starttag(node, "div", "", CLASS="yaq", **{"data-model": _json(model)})
    )


def depart_quiz_node(self, node: Quiz) -> None:
    self.body.append("</div>")


class QuizDirective(Directive):
    has_content = True
    required_arguments = 1
    optional_arguments = 0
    final_argument_whitespace = False
    option_spec = {"title": validators.unchanged_required}

    def run(self):
        self.assert_has_content()
        document = self.state.document
        state = get_document_state(document)
        if state.quiz_depth:
            return [
                document.reporter.error("Quiz directives cannot be nested.", line=self.lineno)
            ]
        if "title" not in self.options:
            return [
                document.reporter.error(
                    'The "title" option is required for a quiz directive.',
                    line=self.lineno,
                )
            ]

        quiz_id = self.arguments[0]
        if not quiz_id:
            return [document.reporter.error("Quiz identifiers must not be empty.", line=self.lineno)]

        source = document.current_source or str(document.get("source", ""))
        original = state.quiz_ids.get(quiz_id)
        if original is not None:
            original_source, original_line = original
            location = original_source
            if original_line is not None:
                location = f"{location}:{original_line}"
            return [
                document.reporter.error(
                    f'Duplicate quiz identifier "{quiz_id}"; first declared at {location}.',
                    line=self.lineno,
                )
            ]
        state.quiz_ids[quiz_id] = (source, self.lineno)

        result = Quiz(uid=quiz_id, name=self.name, title=self.options["title"])
        with parsing_context(document, "quiz"):
            self.state.nested_parse(self.content, self.content_offset, result)
        return [result]


def visit_spoiler_block_node(self, node: SpoilerBlock) -> None:
    self.body.append(self.starttag(node, "details", "", CLASS="yaq-spoiler-block"))
    self.body.append('<summary class="yaq-spoiler-block-title">')
    self.body.append(html.escape(node["title"]))
    self.body.append("</summary>")
    self.body.append('<div class="yaq-spoiler-block-content">')


def depart_spoiler_block_node(self, node: SpoilerBlock) -> None:
    self.body.append("</div></details>")


class SpoilerDirective(Directive):
    has_content = True
    required_arguments = 1
    optional_arguments = 0
    final_argument_whitespace = False

    def run(self):
        self.assert_has_content()
        document = self.state.document
        state = get_document_state(document)
        if state.spoiler_depth:
            return [
                document.reporter.error(
                    "Spoiler directives cannot be nested.", line=self.lineno
                )
            ]

        result = SpoilerBlock(name=self.name, title=self.arguments[0])
        with parsing_context(document, "spoiler"):
            self.state.nested_parse(self.content, self.content_offset, result)
        return [result]


def spoiler_inline(
    name,
    rawtext,
    text,
    lineno,
    inliner,
    options=None,
    content=None,
):
    del name, rawtext, lineno, inliner, content
    return [SpoilerInline(args=options or {}, content=text)], []


def visit_spoiler_inline_node(self, node: SpoilerInline) -> None:
    self.body.append(
        '<span class="yaq-spoiler-inline-hidden" '
        'onclick="this.classList.remove(\'yaq-spoiler-inline-hidden\');">'
    )
    self.body.append(html.escape(node["content"]))


def depart_spoiler_inline_node(self, node: SpoilerInline) -> None:
    self.body.append("</span>")


def ensure_html_builder(app) -> None:
    if app.builder.format != "html":
        raise ExtensionError(
            "sphinx-yaq supports HTML builders only; "
            f'builder "{app.builder.name}" has format "{app.builder.format}".'
        )


def setup(app):
    static_path = os.path.join(os.path.dirname(__file__), "_static")
    app.config.html_static_path.append(static_path)

    app.add_js_file("sphinx_yaq/math.js")
    app.add_js_file("sphinx_yaq/yaq.js")

    app.add_css_file("https://use.fontawesome.com/8916f45f90.css")
    app.add_css_file("sphinx_yaq/css/yaq.css")

    app.add_node(Quiz, html=(visit_quiz_node, depart_quiz_node))
    app.add_directive("quiz", QuizDirective)
    app.add_role("quiz", quiz_question)
    app.add_node(
        QuizQuestion,
        html=(visit_quiz_question_node, depart_quiz_question_node),
    )

    app.add_node(
        SpoilerBlock,
        html=(visit_spoiler_block_node, depart_spoiler_block_node),
    )
    app.add_directive("spoiler", SpoilerDirective)
    app.add_role("spoiler", spoiler_inline)
    app.add_node(
        SpoilerInline,
        html=(visit_spoiler_inline_node, depart_spoiler_inline_node),
    )
    app.connect("builder-inited", ensure_html_builder)

    return {
        "version": "0.1.0",
        "parallel_read_safe": False,
        "parallel_write_safe": False,
    }
