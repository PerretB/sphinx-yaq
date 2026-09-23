# Changelog

All notable changes to this project will be documented in this file.

## 0.1.0 - Unreleased

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
