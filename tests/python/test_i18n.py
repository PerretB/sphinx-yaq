"""Language selection through real Sphinx builds."""

import html
import json
import re

import pytest


@pytest.mark.parametrize(
    "config, metadata, option, expected",
    [
        ({}, "", "", "en"),
        ({"language": "fr"}, "", "", "fr"),
        ({"language": "fr", "yaq_language": "en"}, "", "", "en"),
        ({"yaq_language": "en"}, ":yaq-language: fr\n\n", "", "fr"),
        ({"yaq_language": "fr"}, ":yaq-language: fr\n\n", "   :language: en\n", "en"),
        ({"yaq_language": "fr_CA"}, "", "", "fr"),
    ],
)
def test_language_precedence(make_app, tmp_path, config, metadata, option, expected):
    source = tmp_path / "source"
    source.mkdir()
    (source / "conf.py").write_text('extensions = ["sphinx_yaq"]\n', encoding="utf-8")
    (source / "index.rst").write_text(
        metadata
        + "Languages\n=========\n\n"
        + "Outside: :spoiler:`Hint`.\n\n"
        + ".. quiz:: example\n   :title: Example\n"
        + option
        + "\n"
        + '   Answer: :quiz:`{"type":"TF","answer":"T"}`.\n\n'
        + "   Inside: :spoiler:`Hint`.\n",
        encoding="utf-8",
    )
    app = make_app(srcdir=source, confoverrides=config)
    app.build()
    output = (app.outdir / "index.html").read_text(encoding="utf-8")
    payload = json.loads(html.unescape(re.search(r'data-i18n="([^"]+)"', output)[1]))
    assert payload["language"] == expected
    assert payload["messages"]["check_answers"] == (
        "Vérifier les réponses" if expected == "fr" else "Check answers"
    )
    labels = re.findall(r'aria-label="([^"]+)"[^>]*class="yaq-spoiler-inline', output)
    outside = (
        "fr"
        if metadata or config.get("yaq_language", config.get("language", "en")).startswith("fr")
        else "en"
    )
    assert labels[0] == ("Afficher le texte masqué" if outside == "fr" else "Show hidden text")
    assert labels[-1] == ("Afficher le texte masqué" if expected == "fr" else "Show hidden text")
    assert app._warning.getvalue() == ""


def test_mixed_languages_fallback_escaping_and_cached_rebuild(make_app, tmp_path, monkeypatch):
    from sphinx_yaq import i18n

    source = tmp_path / "source"
    source.mkdir()
    (source / "conf.py").write_text('extensions = ["sphinx_yaq"]\n', encoding="utf-8")
    (source / "index.rst").write_text(
        ":yaq-language: fr\n\nLanguages\n=========\n\n"
        ".. quiz:: french\n   :title: Français\n\n"
        '   :quiz:`{"type":"TF","answer":"T"}`\n\n'
        ".. quiz:: english\n   :title: English\n   :language: en\n\n"
        '   :quiz:`{"type":"TF","answer":"T"}`\n\n'
        ".. quiz:: unknown\n   :title: Unknown\n   :language: xyz\n\n"
        '   :quiz:`{"type":"TF","answer":"T"}`\n',
        encoding="utf-8",
    )
    original = i18n.catalog
    message = 'Text "quoted" & <script>alert(1)</script>'
    monkeypatch.setattr(
        i18n, "catalog", lambda language: {**original(language), "restart": message}
    )
    app = make_app(srcdir=source)
    app.build()
    first = (app.outdir / "index.html").read_text(encoding="utf-8")
    payloads = [json.loads(html.unescape(s)) for s in re.findall(r'data-i18n="([^"]+)"', first)]
    assert [p["language"] for p in payloads] == ["fr", "en", "en"]
    assert all(p["messages"]["restart"] == message for p in payloads)
    assert "<script>alert(1)</script>" not in first
    assert "index.rst:17" in app._warning.getvalue()
    assert "Unsupported YAQ language 'xyz'" in app._warning.getvalue()
    app.build(force_all=True)
    assert (app.outdir / "index.html").read_text(encoding="utf-8") == first


@pytest.mark.parametrize("locale", ["de", "", "../../fr", "not a locale"])
def test_unsupported_language_falls_back_with_warning(locale, caplog):
    from sphinx_yaq.i18n import resolve_language

    assert resolve_language(locale) == "en"
    assert "Unsupported YAQ language" in caplog.text


@pytest.mark.parametrize("builder", ["html", "singlehtml"])
def test_document_languages_survive_tree_assembly(make_app, tmp_path, builder):
    source = tmp_path / "source"
    source.mkdir()
    (source / "conf.py").write_text('extensions = ["sphinx_yaq"]\n', encoding="utf-8")
    (source / "index.rst").write_text(
        "Languages\n=========\n\n.. toctree::\n\n   en\n   fr\n", encoding="utf-8"
    )
    for language in ["en", "fr"]:
        (source / f"{language}.rst").write_text(
            f":yaq-language: {language}\n\nExample\n=======\n\n"
            f".. quiz:: {language}\n   :title: Example\n\n"
            '   :quiz:`{"type":"TF","answer":"T"}`\n\n'
            "Outside: :spoiler:`Hint`.\n",
            encoding="utf-8",
        )
    app = make_app(srcdir=source, buildername=builder)
    app.build()
    for language in ["en", "fr"]:
        page = "index" if builder == "singlehtml" else language
        output = (app.outdir / f"{page}.html").read_text(encoding="utf-8")
        payloads = [
            json.loads(html.unescape(s)) for s in re.findall(r'data-i18n="([^"]+)"', output)
        ]
        assert language in [p["language"] for p in payloads]
        label = "Afficher le texte masqué" if language == "fr" else "Show hidden text"
        assert f'aria-label="{label}"' in output
    assert app._warning.getvalue() == ""
