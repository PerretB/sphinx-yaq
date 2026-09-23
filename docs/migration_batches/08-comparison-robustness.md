# Batch 08 — Comparison robustness and determinism

## Objective

Define, document, and test deterministic answer-comparison semantics for exact, numeric, fuzzy, sequence, regex, and mathematical questions.

## Prerequisites

- Batches 03–07 complete.
- Current documented comparison grammar captured in table-driven tests.
- Product decisions made for coercion, thresholds, legacy flag spelling, and supported math grammar.

## Recommended sub-batches

Implement and review separately:

1. **08A:** exact, numeric, fuzzy, whitespace, and sequence behavior;
2. **08B:** regex validation and matching;
3. **08C:** deterministic mathematical comparison.

Do not combine a math-library replacement with unrelated comparison cleanup.

## In scope

- Replace broad implicit numeric coercion with documented parsing.
- Make fuzzy threshold explicit and effective.
- Define Unicode normalization, case/accent, punctuation, and whitespace policy.
- Correct ordered/unordered sequences, duplicates, empty tokens, and length mismatches.
- Standardize `regex`; optionally accept `regexp` for one warning-backed compatibility cycle.
- Compile/validate authored regex patterns once and handle student input safely.
- Replace random math samples with deterministic injected samples.
- Correct floating-point tolerance logic.
- Handle singularities, non-finite results, unsupported types, unknown variables, and syntax errors predictably.
- Remove mutation of global math.js units.
- Consider replacing math.js only if frozen grammar tests prove compatibility.

## Out of scope

- New comparison modes or quiz types.
- Symbolic-proof claims.
- UI redesign.

## Validation

```text
npm run test:js
npm run build:js
python -m pytest
```

Run each table-driven suite repeatedly to demonstrate deterministic results.

## Acceptance criteria

- Comparison semantics are documented with accepted/rejected examples.
- Repeating a grading operation yields the same result.
- Fuzzy threshold is configurable/tested rather than hard-coded accidentally.
- Regex errors are diagnosed without crashing the page.
- Math results are deterministic and never described as symbolic proof.
- Existing documented valid expressions remain supported or receive explicit migration notes.

## Suggested Codex prompt

> Implement only sub-batch 08A from `docs/migration_batches/08-comparison-robustness.md`. Freeze expected examples in table-driven tests, then make exact/numeric/fuzzy/sequence behavior deterministic and documented. Do not modify regex or math behavior yet. Run all validations and update `docs/migration_status.md` before stopping for review.

