from __future__ import annotations

from docutils.utils import new_document
import pytest

from sphinx_yaq.models import ModelValidationError, parse_question
from sphinx_yaq.state import get_document_state, parsing_context


@pytest.mark.parametrize(
    ("source", "message"),
    [
        ('{"type":"FB",broken}', "malformed JSON"),
        ("[]", "top-level value must be an object"),
        ('{"answer":"x"}', '"type" must be a string'),
        ('{"type":"XX","answer":"x"}', "unsupported question type"),
        ('{"type":"TF","answer":"yes"}', "exactly"),
        ('{"type":"TF","answer":"T","extra":1}', "unknown property"),
        ('{"type":"FB","answer":"x","size":0}', "positive integer"),
        ('{"type":"FB","answer":"x","flags":"ordered"}', "requires"),
        ('{"type":"FB","answer":"x","flags":"math"}', "non-empty"),
        (
            '{"type":"FB","answer":"x","flags":"math","vars":{"x":[2,1]}}',
            "lower bound",
        ),
        ('{"type":"SC","values":"A,B","answer":"C"}', "one of"),
    ],
)
def test_parse_question_rejects_invalid_models(source, message):
    with pytest.raises(ModelValidationError, match=message):
        parse_question(source)


def test_parse_question_normalizes_legacy_shapes():
    model = parse_question(
        '{"type":"FB","answer":"x","flags":"sequence, fuzzy","size":3}'
    )
    assert model.as_dict() == {
        "type": "FB",
        "answer": "x",
        "size": 3,
        "flags": "sequence,fuzzy",
    }


def test_constant_math_answer_does_not_require_variables():
    model = parse_question('{"type":"FB","answer":"2 + 3","flags":"math"}')
    assert model.as_dict() == {"type": "FB", "answer": "2 + 3", "flags": "math"}


def test_document_context_is_cleaned_after_nested_parse_failure():
    document = new_document("source.rst")
    state = get_document_state(document)

    with pytest.raises(RuntimeError):
        with parsing_context(document, "quiz"):
            assert state.quiz_depth == 1
            raise RuntimeError("nested parse failed")

    assert state.quiz_depth == 0
