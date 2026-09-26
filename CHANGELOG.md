# Changelog

All notable changes to this project will be documented in this file.

## 0.1.0 - Unreleased

- Document the non-drop-in migration from copied `Sphinx_ext` installations,
  including stricter author diagnostics, grading changes, and progress reset.
- Declare Python 3.14 support with Sphinx 8.2 or 9 and add a tag-driven,
  main-commit-gated PyPI wheel publishing workflow using Trusted Publishing.
- Add release CI, package and browser verification, a support policy, and a
  migration guide. The release remains blocked on regex and math comparison
  work from Batch 08.
- Define deterministic fill-in exact, decimal, fuzzy, whitespace, and sequence
  matching. Unicode canonical equivalents and documented fuzzy typos now pass;
  blank/hexadecimal numeric coercion, mismatched duplicate tokens, and empty
  sequences no longer pass. Fuzzy matching uses an explicit `0.8` default
  threshold and supports a direct grading-call override.
- Package the imported YAQ Sphinx extension as the `sphinx-yaq` distribution.
- Namespace the unchanged legacy browser assets under `sphinx_yaq/`.
- Add the legacy demonstration site and installed-wheel smoke verification.
- Parse and validate TF, FB, and SC question models during Sphinx builds.
- Reject malformed models, duplicate document-local quiz identifiers, and
  non-HTML builders with source-aware diagnostics.
- Serialize quiz data with standard JSON and escaped HTML attributes, and
  render HTML-like titles, identifiers, choice labels, and spoiler text as
  plain text.
- Replace Watch.JS state propagation with synchronous explicit transitions,
  keep wrong true/false answers retryable and revealable, and contain browser
  initialization failures to the affected quiz or question.
- Remove Firebase, authentication, cloud synchronization, cookies, and their
  assets; persist minimal quiz progress only in resilient, versioned,
  document-scoped `localStorage` with definition compatibility checks.
- Remove both jQuery bundles and the Font Awesome request, replace string-built
  quiz controls with standard DOM APIs and compact Unicode feedback symbols
  with accessible labels, and make inline
  spoilers native buttons without inline handlers. The demo now uses Alabaster
  to avoid theme-provided jQuery and icon assets.
