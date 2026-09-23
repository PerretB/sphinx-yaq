# Batch 01 — Package skeleton and reproducible build

## Objective

Turn the implementation imported from the legacy reference into an installable Python distribution in `D:\sphinx-yaq` without intentionally changing quiz behavior.

## Prerequisites

- Batch 00 complete.
- Clean committed baseline strongly recommended.
- Distribution name and license selected.

## In scope

- Add `pyproject.toml` with standard project metadata and build backend.
- Create the `src/sphinx_yaq/` package.
- Copy and adapt the imported Python extension code and static assets into the package.
- Namespace packaged assets under `_static/sphinx_yaq/`.
- Copy the legacy demonstration site to target `examples/demo/`; do not remove or restructure the legacy site.
- Make tests and demo consume the editable/installed package without `sys.path` manipulation.
- Add `README.md`, `LICENSE`, and `CHANGELOG.md` at project root as needed.
- Remove archive generation side effects from demo `conf.py`; replace with an explicit build task only if the downloadable archive remains required.
- Build and inspect wheel and source distribution.
- Install the wheel in a clean environment and build a minimal HTML fixture.

## Out of scope

- Model validation or safe-serialization redesign.
- JavaScript refactoring.
- Firebase removal.
- User-visible bug fixes.

## Compatibility rule

All characterization tests must continue to pass with equivalent expectations. Necessary path and asset-URL assertions may be updated to the new namespace, but behavior must not change.

## Validation

```text
npm run test:js
python -m pytest
python -m build
```

Also inspect wheel contents and perform a clean installed-wheel Sphinx HTML build.

## Acceptance criteria

- Wheel and sdist build successfully.
- `pip install <wheel>` provides `sphinx_yaq`.
- Consumer configuration uses `extensions = ["sphinx_yaq"]`.
- Wheel contains namespaced JavaScript and CSS assets.
- Demo and tests no longer inject `source` into `sys.path`.
- Clean installed-wheel fixture builds without access to repository source imports.
- No intentional runtime behavior changes.
- Migration status records chosen names, license, and tested version bounds.

## Suggested Codex prompt

> Implement only Batch 01 from `docs/migration_batches/01-package-skeleton.md` in `D:\sphinx-yaq`. Create the installable package from the imported implementation without intentional behavior changes. Preserve the characterization suite, leave the legacy reference untouched, add installed-wheel smoke verification, run all validations, and update `docs/migration_status.md`. Do not begin parser or JavaScript refactoring.
