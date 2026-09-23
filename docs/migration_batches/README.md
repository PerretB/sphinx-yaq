# Migration batch index

These files split `docs/migration_plan.md` into reviewable implementation contracts. Execute them in order unless the migration status explicitly documents a justified deviation.

Execute every batch in the target repository, `D:\sphinx-yaq`. Use `C:\Users\perre\Dropbox\cours\demoSphinx` only as the legacy source and behavioral oracle. Copy required material into the target; do not perform the refactoring in the legacy directory.

| Batch | Description | Main outcome |
| ---: | --- | --- |
| 00 | [Characterization baseline](00-characterization-baseline.md) | Every documented current behavior is protected by tests |
| 01 | [Package skeleton](01-package-skeleton.md) | Installable wheel/sdist without intentional behavior changes |
| 02 | [Python validation](02-python-validation.md) | Build-time models, safe output, duplicate IDs, HTML-only guard |
| 03 | [JavaScript module extraction](03-js-module-extraction.md) | Importable grading/state modules with preserved behavior |
| 04 | [Runtime state and P0 fixes](04-runtime-state.md) | Explicit transitions, corrected TF behavior, visible failures |
| 05 | [localStorage persistence](05-local-storage.md) | Local-only resilient and versioned progress storage |
| 06 | [Dependency and DOM security](06-dependency-security.md) | No legacy runtime dependencies or unsafe string-built UI |
| 07 | [Accessibility](07-accessibility.md) | Semantic keyboard-accessible controls and readable feedback |
| 08 | [Comparison robustness](08-comparison-robustness.md) | Documented deterministic answer comparison |
| 09 | [Release readiness](09-release-readiness.md) | CI, documentation, installed-wheel verification, final audit |

## Execution contract

For each batch:

1. Read this index, the active batch file, and `../migration_status.md`.
2. Consult `../migration_plan.md` only for architecture or details referenced by the batch.
3. Confirm prerequisites and unresolved decisions.
4. Add or update tests before intentional behavior changes.
5. Stay inside the batch's scope.
6. Run the batch validations and the full baseline suites.
7. Update `../migration_status.md`.
8. Stop for review before starting the next batch.

The batch prompt is a starting contract. Repository evidence and failing tests may require small in-scope adjustments, which must be documented in the handover.
