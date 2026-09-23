# Batch 09 — Release readiness, documentation, and final audit

## Objective

Finish cleanup, establish the supported version matrix, verify installed artifacts, publish complete user/developer documentation, and audit the migration definition of done.

## Prerequisites

- Batches 00–08 complete.
- No unresolved P0 issue.
- Public behavior and storage schema stable enough for a pre-release.

## In scope

- Resolve remaining Sphinx deprecations and unused Python/JavaScript code.
- Add type hints, formatter/linter configuration, and focused static checks.
- Finalize CSS namespacing, theme variables, responsive and print behavior.
- Establish and test supported Python, Sphinx, Node, and browser versions.
- Add CI jobs for unit, Sphinx matrix, browser e2e/accessibility, and package verification.
- Build wheel/sdist, inspect contents, install wheel cleanly, and build docs offline.
- Complete installation, authoring, configuration, local progress, limitations, accessibility, and migration documentation.
- Add release notes and semantic-versioning policy.
- Audit every item in `docs/migration_plan.md` Definition of done.
- Ensure the demo consumes the installed package.

## Out of scope

- New quiz types or educational features.
- Cloud services.
- Non-HTML builders.
- Unplanned architectural rewrites.

## Validation

Run every supported command, including:

```text
npm ci
npm run test:js
npm run build:js
python -m pytest
python -m build
```

Also run clean-wheel installation, Sphinx version matrix, Playwright, accessibility, and offline generated-page checks.

## Acceptance criteria

- Every definition-of-done item is satisfied or explicitly deferred with owner/reason; no P0/P1 item is silently deferred.
- CI passes on the declared support matrix.
- Wheel contains only intended package/runtime files.
- Clean installation and HTML build work without repository path injection or remote extension assets.
- Documentation matches actual behavior and limitations.
- Migration guide explains removal of copied extension files, Firebase/cloud behavior, and local progress clearing.
- `docs/migration_status.md` marks the migration complete and records final validation evidence.

## Suggested Codex prompt

> Implement Batch 09 from `docs/migration_batches/09-release-readiness.md`. Audit the complete definition of done, finish only cleanup/documentation/CI/package work, and do not add features. Run the full version, browser, accessibility, and clean-wheel validation set. Update `docs/migration_status.md` with evidence for every completed or explicitly deferred item.

