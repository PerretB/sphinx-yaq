from __future__ import annotations

import base64
import html as html_module
import json
import re
from pathlib import Path

import pytest
from sphinx.application import Sphinx
from sphinx.errors import ExtensionError


@pytest.mark.sphinx("html", testroot="basic")
def test_html_build_emits_quiz_models_and_assets(app, warning):
    app.build()

    assert warning.getvalue() == ""
    html = (Path(app.outdir) / "index.html").read_text(encoding="utf-8")

    assert 'class="yaq"' in html
    assert 'class="yaq-q"' in html
    assert "sphinx_yaq/lib/watch.js" not in html
    assert "firebase" not in html.lower()
    assert "authentication" not in html.lower()
    assert "js.cookie" not in html.lower()
    assert "sphinx_yaq/math.js" in html
    assert "sphinx_yaq/yaq.js" in html
    assert "sphinx_yaq/css/yaq.css" in html

    encoded = re.search(r'class="yaq-q" data-model="([^"]+)"', html).group(1)
    model = json.loads(base64.b64decode(encoded).decode("utf-8"))
    assert model == {"type": "FB", "answer": "Yalta", "flags": "fuzzy"}
    extension = app.extensions["sphinx_yaq"]
    assert extension.version == "0.1.0"
    assert extension.parallel_read_safe is False
    assert extension.parallel_write_safe is False


@pytest.mark.sphinx("html", testroot="basic")
def test_html_build_copies_extension_static_files(app):
    app.build()

    static = Path(app.outdir) / "_static"
    static = static / "sphinx_yaq"
    assert (static / "yaq.js").is_file()
    assert (static / "math.js").is_file()
    assert (static / "css" / "yaq.css").is_file()
    assert not (static / "jquery.js").exists()
    assert not (static / "lib" / "jquery-3.2.1.min.js").exists()
    assert not (static / "lib" / "watch.js").exists()
    assert not (static / "lib" / "js.cookie.js").exists()
    assert not (static / "lib" / "fbconfig.js").exists()


@pytest.mark.sphinx("html", testroot="basic")
def test_spoiler_role_and_directive_emit_current_html(app):
    app.build()

    html = (Path(app.outdir) / "index.html").read_text(encoding="utf-8")
    assert '<details class="yaq-spoiler-block">' in html
    assert '<summary class="yaq-spoiler-block-title">Hint</summary>' in html
    assert 'class="yaq-spoiler-inline yaq-spoiler-inline-hidden"' in html
    assert 'aria-label="Show hidden text"' in html
    assert 'onclick=' not in html
    assert 'use.fontawesome.com' not in html
    assert "hidden inline text" in html


@pytest.mark.sphinx("html", testroot="invalid-json")
def test_invalid_question_json_reports_a_source_aware_build_error(app, warning):
    app.build()

    diagnostic = warning.getvalue()
    assert "index.rst:7: ERROR: Invalid :quiz: model: malformed JSON" in diagnostic
    html = (Path(app.outdir) / "index.html").read_text(encoding="utf-8")
    assert 'class="yaq-q"' not in html


@pytest.mark.sphinx("html", testroot="documented-examples")
def test_all_documented_question_forms_and_spoilers_build(app, warning):
    app.build()

    assert warning.getvalue() == ""
    html = (Path(app.outdir) / "index.html").read_text(encoding="utf-8")
    encoded_models = re.findall(r'class="yaq-q" data-model="([^"]+)"', html)
    models = [
        json.loads(base64.b64decode(encoded).decode("utf-8"))
        for encoded in encoded_models
    ]

    assert models == [
        {"type": "FB", "answer": "réponse"},
        {"type": "FB", "answer": "réponse", "flags": "fuzzy"},
        {"type": "FB", "answer": "D", "size": 1},
        {"type": "FB", "answer": "rouge vert bleu", "flags": "sequence"},
        {
            "type": "FB",
            "answer": "rouge vert bleu",
            "flags": "sequence,fuzzy",
        },
        {"type": "FB", "answer": "1,2,3", "flags": "sequence,ordered"},
        {"type": "FB", "answer": "New York", "flags": "nospace"},
        {"type": "FB", "answer": '"\\'},
        {
            "type": "FB",
            "answer": "n^2 + 3",
            "vars": {"n": [-10, 10]},
            "flags": "math",
        },
        {
            "type": "FB",
            "answer": "n*m + 2*n^2",
            "vars": {"n": [-10, 10], "m": [-10, 10]},
            "flags": "math",
        },
        {
            "type": "FB",
            "answer": "a+b*c$",
            "flags": "regex",
            "displayed-answer": "ac (par exemple)",
        },
        {"type": "TF", "answer": "T"},
        {"type": "TF", "answer": "F"},
        {"type": "SC", "values": "A,B,C,D,E", "answer": "D"},
    ]
    assert '<details class="yaq-spoiler-block">' in html
    assert 'class="yaq-spoiler-inline yaq-spoiler-inline-hidden"' in html


@pytest.mark.sphinx("html", testroot="special-characters")
def test_unicode_quotes_backslashes_ampersands_and_angles_survive_emission(
    app, warning
):
    app.build()

    assert warning.getvalue() == ""
    html = (Path(app.outdir) / "index.html").read_text(encoding="utf-8")
    encoded = re.search(r'class="yaq-q" data-model="([^"]+)"', html).group(1)
    model = json.loads(base64.b64decode(encoded).decode("utf-8"))
    assert model == {
        "type": "FB",
        "answer": "café 東京 & <tag>",
        "displayed-answer": 'He said "yes" at C:\\tmp',
    }

    quiz_model = re.search(r'class="yaq" data-model="([^"]+)"', html).group(1)
    assert json.loads(html_module.unescape(quiz_model)) == {
        "title": "Spécial &quot;quoted&quot; &amp; &lt;tag&gt;",
        "uid": "special&#x27;id",
    }


@pytest.mark.sphinx("html", testroot="validation-errors")
def test_invalid_models_have_source_aware_diagnostics_for_each_rule(app, warning):
    app.build()

    diagnostic = warning.getvalue()
    expected = [
        "top-level value must be an object",
        '"type" must be a string',
        'unsupported question type: "XX"',
        '"answer" must be a string',
        'TF "answer" must be exactly "T" or "F"',
        'unknown property: "extra"',
        '"size" must be a positive integer',
        '"flags" must be a comma-separated string',
        'unsupported flag: "unknown"',
        '"flags" must not contain empty entries',
        '"flags" must not contain duplicates',
        'flag "ordered" requires "sequence"',
        'flag "math" cannot be combined with other flags',
        'math questions with variables require a non-empty "vars" object',
        '"vars" is only valid with the "math" flag',
        'must have a two-number interval',
        'interval bounds must be finite numbers',
        'lower bound must not exceed its upper bound',
        '"displayed-answer" must be a string',
        'SC "values" must contain non-empty choices',
        'SC "answer" must be one of the declared choices',
    ]
    for message in expected:
        assert message in diagnostic
    assert diagnostic.count("index.rst:") >= len(expected)


@pytest.mark.sphinx("html", testroot="duplicate-ids")
def test_duplicate_quiz_ids_fail_with_both_locations(app, warning):
    app.build()

    diagnostic = warning.getvalue()
    assert 'index.rst:10: ERROR: Duplicate quiz identifier "same"' in diagnostic
    assert "first declared at" in diagnostic
    assert "index.rst:4" in diagnostic


@pytest.mark.sphinx("html", testroot="same-id-different-documents")
def test_quiz_ids_are_scoped_to_each_document(app, warning):
    app.build()
    assert warning.getvalue() == ""


@pytest.mark.sphinx("html", testroot="safe-text")
def test_plain_text_fields_are_escaped_without_changing_nested_markup(app, warning):
    app.build()
    assert warning.getvalue() == ""

    output = (Path(app.outdir) / "index.html").read_text(encoding="utf-8")
    assert "<script>alert(1)</script>" not in output
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in output
    assert "<em>nested markup remains markup</em>" in output

    encoded = re.search(r'class="yaq-q" data-model="([^"]+)"', output).group(1)
    model = json.loads(base64.b64decode(encoded).decode("utf-8"))
    assert model == {
        "type": "SC",
        "values": "safe,&lt;script&gt;alert(1)&lt;/script&gt;",
        "answer": "safe",
    }


def test_non_html_builder_is_rejected_during_initialization(tmp_path):
    source = Path(__file__).parents[1] / "roots" / "test-basic"
    with pytest.raises(
        ExtensionError,
        match='sphinx-yaq supports HTML builders only; builder "text" has format "text"',
    ):
        Sphinx(
            srcdir=source,
            confdir=source,
            outdir=tmp_path / "out",
            doctreedir=tmp_path / "doctrees",
            buildername="text",
        )


@pytest.mark.sphinx("html", testroot="author-errors")
def test_role_and_directive_author_errors_return_diagnostics(app, warning):
    app.build()

    diagnostic = warning.getvalue()
    assert "Role :quiz: must appear inside a quiz directive" in diagnostic
    assert 'The "title" option is required for a quiz directive' in diagnostic
    assert "Quiz directives cannot be nested" in diagnostic
    assert "Spoiler directives cannot be nested" in diagnostic
