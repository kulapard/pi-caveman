# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `caveman-compress` is now a prompt-only skill: the Pi agent performs the
  compression itself (its own model and file tools), driven by `SKILL.md`. The
  `/caveman-compress` command and the compression rules are unchanged.

### Removed

- The Python `caveman-compress` toolkit (`scripts/` + the pytest suite) and the
  `test:py` script. The package no longer requires Python or an external
  `claude` CLI / `ANTHROPIC_API_KEY`.

## [0.1.0] - 2026-06-29

Initial release — a [Pi](https://github.com/earendil-works/pi-coding-agent)
port of [caveman](https://github.com/JuliusBrussee/caveman).

### Added

- Caveman output-mode extension (`extensions/caveman.ts`): six intensity modes
  (lite, full, ultra, wenyan-lite, wenyan-full, wenyan-ultra; default full),
  slash commands, natural-language activation/deactivation, and a session
  statusline indicator.
- Skills: `caveman`, `caveman-commit`, `caveman-review`, `caveman-help`,
  `caveman-stats`, `caveman-compress`, and the `cavecrew` subagent suite.
- npm packaging as `@kulapard/pi-caveman` (scoped, public) with a `files`
  whitelist, a `prepublishOnly` test gate, and repository metadata.
- GitHub Actions: `ci.yml` (test on push and pull requests) and `publish.yml`
  (publish to npm via Trusted Publishing / OIDC on `v[0-9]*` tags — no stored
  token, automatic provenance, a tag-equals-version guard, and a concurrency
  group).

[Unreleased]: https://github.com/kulapard/pi-caveman/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/kulapard/pi-caveman/releases/tag/v0.1.0
