from __future__ import annotations

import base64
import html as html_module
import json
import re
from pathlib import Path

import pytest


@pytest.mark.sphinx("html", testroot="basic")
def test_html_build_emits_quiz_models_and_assets(app, warning):
    app.build()

    assert warning.getvalue() == ""
    html = (Path(app.outdir) / "index.html").read_text(encoding="utf-8")

    assert 'class="yaq"' in html
    assert 'class="yaq-q"' in html
    assert "lib/watch.js" in html
    assert "lib/js.cookie.js" in html
    assert "math.js" in html
    assert "yaq.js" in html
    assert "css/yaq.css" in html

    encoded = re.search(r'class="yaq-q" data-model="([^"]+)"', html).group(1)
    model = json.loads(base64.b64decode(encoded).decode("utf-8"))
    assert model == {"type": "FB", "answer": "Yalta", "flags": "fuzzy"}


@pytest.mark.sphinx("html", testroot="basic")
def test_html_build_copies_extension_static_files(app):
    app.build()

    static = Path(app.outdir) / "_static"
    assert (static / "yaq.js").is_file()
    assert (static / "math.js").is_file()
    assert (static / "css" / "yaq.css").is_file()
    assert (static / "lib" / "watch.js").is_file()


@pytest.mark.sphinx("html", testroot="basic")
def test_spoiler_role_and_directive_emit_current_html(app):
    app.build()

    html = (Path(app.outdir) / "index.html").read_text(encoding="utf-8")
    assert '<details class="yaq-spoiler-block">' in html
    assert '<summary class="yaq-spoiler-block-title">Hint</summary>' in html
    assert 'class="yaq-spoiler-inline-hidden"' in html
    assert "hidden inline text" in html


@pytest.mark.sphinx("html", testroot="invalid-json")
def test_invalid_question_json_is_deferred_to_the_browser(app, warning):
    """Characterize the current lack of build-time model validation."""
    app.build()

    assert warning.getvalue() == ""
    html = (Path(app.outdir) / "index.html").read_text(encoding="utf-8")
    encoded = re.search(r'class="yaq-q" data-model="([^"]+)"', html).group(1)
    assert base64.b64decode(encoded).decode("utf-8") == '{"type":"FB",broken}'


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
    assert 'class="yaq-spoiler-inline-hidden"' in html


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

    quiz_model = re.search(r'class="yaq" data-model=\'([^\']+)\'', html).group(1)
    assert json.loads(html_module.unescape(quiz_model)) == {
        "title": 'Spécial "quoted" & <tag>',
        "uid": "special'id",
    }
