# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Caveman mode is now project-scoped: `.pi/caveman-mode.json` in the working
  directory persists the mode across new sessions, while session entries still
  override it for the current session. Falls back to `off` when no state exists.
- Status bar now appends live context usage (`ctx:XX%`) when a caveman mode is
  active and Pi exposes usage data. Updates on mode changes and at each turn end.

## [0.4.2] - 2026-06-29

### Changed

- Compressed `AGENTS.md` with `caveman-compress` to reduce session token load.
- Added `*.original` and `*.original.*` to `.gitignore` so caveman-compress
  backups are not committed accidentally.

## [0.4.1] - 2026-06-29

### Changed

- README install instructions now recommend `pi install
  https://github.com/kulapard/pi-caveman` as the primary direct-load method,
  keeping `pi -e` documented as a per-session fallback.

### Added

- Guard tests for `caveman-compress` backup rules, the GitHub install URL in
  the root README, and the `caveman` skill's delegation to `caveman-commit` /
  `caveman-review`.

## [0.4.0] - 2026-06-29

### Fixed

- `caveman-compress` no longer restores from a potentially stale `.original`
  backup on validation failure; it now aborts if a backup already exists and
  only restores from the backup created during the same invocation.
- `caveman-compress` README clarified: users should edit the source file and
  remove/rename the old `.original` backup before re-compressing; extensionless
  files now have an explicit `.original` backup rule.
- Extension command handler tests now `await` async handlers, preventing false
  greens if handlers become asynchronous.

### Changed

- Workflow test now matches the actual `run: npm publish` step instead of any
  `npm publish` substring.

### Added

- `scripts/check-changelog.mjs` and a CI check (`npm run changelog:check`)
  enforce that `CHANGELOG.md` is updated for any notable file change; the
  project convention also instructs agents to update the changelog under
  `[Unreleased]`.

## [0.3.0] - 2026-06-29

### Fixed

- `/caveman-help` card linked "Full docs" to the upstream `JuliusBrussee/caveman`
  repo; now points to `kulapard/pi-caveman`.
- `caveman-help` skill table was missing `/caveman-stats`, disagreeing with the
  extension's own `HELP_TEXT`; added the row.
- `ultra` mode was documented as "Tables over prose" in the README and help
  card, contradicting the injected mode instructions; docs now match behavior
  (abbreviate prose words, arrows for causality).
- Input handler no longer throws when an input event arrives without `text`
  (`event.text.trim()` → `(event.text ?? "").trim()`).
- `caveman-compress` docs said the backup is always `FILE.original.md`, but the
  skill preserves the source extension; corrected to `FILE.original.<ext>`.

### Changed

- `engines.node` floor raised from `>=18` to `>=22.6.0`, matching the
  `node --experimental-strip-types` requirement of the test/typecheck workflow.
- Natural-language activation now also triggers on `"be brief"` (added to
  `ACTIVATION_RE`, the `caveman` skill description, and the README) so the
  deterministic regex matches the advertised triggers.

## [0.2.0] - 2026-06-29

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

[Unreleased]: https://github.com/kulapard/pi-caveman/compare/v0.4.2...HEAD
[0.4.2]: https://github.com/kulapard/pi-caveman/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/kulapard/pi-caveman/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/kulapard/pi-caveman/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/kulapard/pi-caveman/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kulapard/pi-caveman/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kulapard/pi-caveman/releases/tag/v0.1.0
