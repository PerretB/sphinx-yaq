# Release readiness and support policy

## Installation and support

Install with `python -m pip install sphinx-yaq`, then add
`"sphinx_yaq"` to the Sphinx `extensions` list. YAQ renders HTML builders
only. The package metadata allows Python 3.10 through 3.14 and Sphinx 7
through 9. Python 3.14 requires Sphinx 8.2 or 9. The CI workflow is configured
to exercise compatible combinations. A local clean-wheel test and the CI
results must be checked before declaring a release.

The JavaScript development toolchain uses Node 24. Browser automation uses
Playwright Chromium. Other browser engines and older versions have no declared
automated support. Published HTML works without network requests from YAQ;
Sphinx themes or the hosting site may have separate assets or policies.

## Authoring and behavior

See the [usage guide](usage_guide.md) for `quiz`, `spoiler`, question JSON,
comparison rules, and local progress. No account or server stores answers.
Browser storage is best effort and local to the current origin and profile.
Restart clears one quiz; `yaq_app.clearStoredProgress()` clears YAQ records for
the origin. The package has no configuration keys beyond enabling the extension.
Answers are present in page data, so quizzes are for self-assessment.

Controls expose accessible labels and textual grading feedback. Automated
Chromium tests cover keyboard use, narrow layout, reduced motion, and axe
serious/critical violations. Screen-reader speech and operating-system
high-contrast mode still require manual verification before an accessibility
conformance claim. Print styling shows authored content and hides interaction
controls.

## Migrating a copied legacy extension

See the [legacy migration guide](migrating_from_legacy.md) for a compatibility
table, `conf.py` example, grading changes, progress behavior, and validation
steps. The packaged extension does not import legacy cloud or cookie progress.

## Versioning and release gates

Use semantic versions for the public authoring syntax, generated HTML contract,
and progress schema. Patch releases fix compatible defects; minor releases add
compatible capabilities or change comparison behavior with migration notes;
major releases may remove syntax or invalidate saved progress. The 0.x series
is pre-release: document intentional behavior changes in `CHANGELOG.md`.

Release only after the Python/Sphinx matrix, JavaScript suite, browser and axe
suite, wheel/sdist inspection, clean wheel installation, and offline HTML
checks pass. Batch 08 regex and math work remains a release blocker as tracked
in [migration status](migration_status.md).

## PyPI publishing

The `release.yml` GitHub Actions workflow runs when a `v*` tag is pushed. It
requires the tagged commit to be reachable from `main` and the tag to equal
`v` plus the version in `pyproject.toml` (for example, `v0.1.0`). The build
job repeats Python, JavaScript, browser, documentation, and clean-wheel checks.
Only the wheel is transferred to the separate PyPI publishing job; the source
distribution is built and checked but is not uploaded by this workflow.

Before the first tag, configure a PyPI Trusted Publisher for project
`sphinx-yaq` with owner `PerretB`, repository `sphinx-yaq`, workflow filename
`release.yml`, and GitHub environment `pypi`. Create the matching GitHub
environment. A pending PyPI publisher can be used if the project has not been
registered yet. No PyPI API token is needed. Review the version and changelog,
merge the release commit into `main`, and push its matching `vX.Y.Z` tag. The
publishing job uses the environment's protection rules if configured.
