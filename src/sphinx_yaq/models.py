"""Parsing and validation for authored YAQ question models."""

from __future__ import annotations

from dataclasses import dataclass
import html
import json
import math
import re
from typing import Any, Mapping, TypeAlias


class ModelValidationError(ValueError):
    """An author-facing error in an inline question declaration."""


def _require_string(model: Mapping[str, Any], key: str) -> str:
    value = model.get(key)
    if not isinstance(value, str):
        raise ModelValidationError(f'"{key}" must be a string')
    if not value:
        raise ModelValidationError(f'"{key}" must not be empty')
    return value


def _reject_unknown(model: Mapping[str, Any], allowed: set[str]) -> None:
    unknown = sorted(set(model) - allowed)
    if unknown:
        quoted = ", ".join(f'"{key}"' for key in unknown)
        raise ModelValidationError(f"unknown property: {quoted}")


@dataclass(frozen=True)
class TrueFalseQuestion:
    answer: str

    def as_dict(self) -> dict[str, Any]:
        return {"type": "TF", "answer": self.answer}


@dataclass(frozen=True)
class FillBlankQuestion:
    answer: str
    size: int | None = None
    flags: tuple[str, ...] = ()
    variables: tuple[tuple[str, tuple[float | int, float | int]], ...] = ()
    displayed_answer: str | None = None

    def as_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {"type": "FB", "answer": self.answer}
        if self.size is not None:
            result["size"] = self.size
        if self.variables:
            result["vars"] = {name: [bounds[0], bounds[1]] for name, bounds in self.variables}
        if self.flags:
            result["flags"] = ",".join(self.flags)
        if self.displayed_answer is not None:
            result["displayed-answer"] = self.displayed_answer
        return result


@dataclass(frozen=True)
class SingleChoiceQuestion:
    choices: tuple[str, ...]
    answer: str

    def as_dict(self) -> dict[str, Any]:
        # The legacy runtime constructs <option> markup from this field. Escaping
        # labels here preserves their displayed text without allowing markup.
        values = ",".join(html.escape(choice, quote=True) for choice in self.choices)
        return {"type": "SC", "values": values, "answer": self.answer}


Question: TypeAlias = TrueFalseQuestion | FillBlankQuestion | SingleChoiceQuestion

_FB_PROPERTIES = {"type", "answer", "size", "flags", "vars", "displayed-answer"}
_FB_FLAGS = {"fuzzy", "sequence", "ordered", "nospace", "math", "regex"}


def _parse_flags(model: Mapping[str, Any]) -> tuple[str, ...]:
    raw_flags = model.get("flags")
    if raw_flags is None:
        return ()
    if not isinstance(raw_flags, str):
        raise ModelValidationError('"flags" must be a comma-separated string')

    flags = tuple(part.strip() for part in raw_flags.split(","))
    if any(not flag for flag in flags):
        raise ModelValidationError('"flags" must not contain empty entries')
    unknown = sorted(set(flags) - _FB_FLAGS)
    if unknown:
        raise ModelValidationError(f'unsupported flag: "{unknown[0]}"')
    if len(set(flags)) != len(flags):
        raise ModelValidationError('"flags" must not contain duplicates')
    if "ordered" in flags and "sequence" not in flags:
        raise ModelValidationError('flag "ordered" requires "sequence"')
    if "math" in flags and len(flags) != 1:
        raise ModelValidationError('flag "math" cannot be combined with other flags')
    if "regex" in flags and len(flags) != 1:
        raise ModelValidationError('flag "regex" cannot be combined with other flags')
    return flags


def _parse_variables(
    model: Mapping[str, Any], flags: tuple[str, ...], answer: str
) -> tuple[tuple[str, tuple[float | int, float | int]], ...]:
    raw_variables = model.get("vars")
    if "math" not in flags:
        if raw_variables is not None:
            raise ModelValidationError('"vars" is only valid with the "math" flag')
        return ()
    if raw_variables is None:
        if re.search(r"[A-Za-z_]", answer):
            raise ModelValidationError(
                'math questions with variables require a non-empty "vars" object'
            )
        return ()
    if not isinstance(raw_variables, dict) or not raw_variables:
        raise ModelValidationError('"vars" must be a non-empty object')

    variables: list[tuple[str, tuple[float | int, float | int]]] = []
    for name, interval in raw_variables.items():
        if not isinstance(name, str) or not name:
            raise ModelValidationError("math variable names must be non-empty strings")
        if not isinstance(interval, list) or len(interval) != 2:
            raise ModelValidationError(f'math variable "{name}" must have a two-number interval')
        lower, upper = interval
        if (
            isinstance(lower, bool)
            or isinstance(upper, bool)
            or not isinstance(lower, (int, float))
            or not isinstance(upper, (int, float))
            or not math.isfinite(lower)
            or not math.isfinite(upper)
        ):
            raise ModelValidationError(
                f'math variable "{name}" interval bounds must be finite numbers'
            )
        if lower > upper:
            raise ModelValidationError(
                f'math variable "{name}" interval lower bound must not exceed its upper bound'
            )
        variables.append((name, (lower, upper)))
    return tuple(variables)


def parse_question(text: str) -> Question:
    """Parse and normalize the text supplied by Docutils for a ``quiz`` role."""

    try:
        raw_model = json.loads(text)
    except json.JSONDecodeError as error:
        raise ModelValidationError(
            f"malformed JSON at column {error.colno}: {error.msg}"
        ) from error

    if not isinstance(raw_model, dict):
        raise ModelValidationError("top-level value must be an object")

    question_type = raw_model.get("type")
    if not isinstance(question_type, str):
        raise ModelValidationError('"type" must be a string')

    if question_type == "TF":
        _reject_unknown(raw_model, {"type", "answer"})
        answer = _require_string(raw_model, "answer")
        if answer not in {"T", "F"}:
            raise ModelValidationError('TF "answer" must be exactly "T" or "F"')
        return TrueFalseQuestion(answer=answer)

    if question_type == "SC":
        _reject_unknown(raw_model, {"type", "answer", "values"})
        answer = _require_string(raw_model, "answer")
        values = _require_string(raw_model, "values")
        choices = tuple(value.strip() for value in values.split(","))
        if not choices or any(not choice for choice in choices):
            raise ModelValidationError('SC "values" must contain non-empty choices')
        if answer not in choices:
            raise ModelValidationError('SC "answer" must be one of the declared choices')
        return SingleChoiceQuestion(choices=choices, answer=answer)

    if question_type == "FB":
        _reject_unknown(raw_model, _FB_PROPERTIES)
        answer = _require_string(raw_model, "answer")
        size = raw_model.get("size")
        if size is not None and (isinstance(size, bool) or not isinstance(size, int) or size <= 0):
            raise ModelValidationError('"size" must be a positive integer')
        flags = _parse_flags(raw_model)
        variables = _parse_variables(raw_model, flags, answer)
        displayed_answer = raw_model.get("displayed-answer")
        if displayed_answer is not None and not isinstance(displayed_answer, str):
            raise ModelValidationError('"displayed-answer" must be a string')
        return FillBlankQuestion(
            answer=answer,
            size=size,
            flags=flags,
            variables=variables,
            displayed_answer=displayed_answer,
        )

    raise ModelValidationError(f'unsupported question type: "{question_type}"')
