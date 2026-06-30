# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- Removed `agents/` package subagent personas, the `laconic-crew` skill, and the
  `laconic-commit` / `laconic-review` commands and skills. pi-laconic now does
  one thing: toggle laconic terse mode for agent output. It still ships
  `/laconic-compress` for compressing prose memory files.

## [1.0.6] - 2026-06-30

### Removed

- Removed `/laconic-stats` and the `laconic-stats` skill because token savings
  were only counterfactual estimates, not measured usage.

## [1.0.5] - 2026-06-30

### Added

- Added plain-black Pi.dev-style pixel `assets/logo.svg` and
  `assets/logo-mark.svg` using a Spartan lambda; README now displays the logo.

### Changed

- Reworked README header to match the centered upstream `caveman` layout:
  icon, title, tagline, badges, and quick links.
- Tightened the README intro and `Why "laconic"?` section to the core
  explanation.
- Added `assets` to the npm package files whitelist so the README logo ships
  with the package.
- Updated changelog compare links for `v1.0.4`.

## [1.0.4] - 2026-06-30

### Changed

- Re-compressed `AGENTS.md` with `/laconic-compress --force` and removed the
  "since v0.4.3" version qualifier.
- Removed remaining `pi-caveman` and `@kulapard/pi-caveman` references from
  `CHANGELOG.md` historical entries. Upstream `caveman` attribution preserved.

### Fixed

- Pointed the Pi project link at `https://github.com/earendil-works/pi` in the
  README, CHANGELOG, and laconic-compress skill README (the old
  `/pi-coding-agent` repo URL returns 404). The npm package name
  `@earendil-works/pi-coding-agent` is unchanged.
- README: corrected the `/laconic-compress` backup filename from `.original` to
  `.original.<ext>` in the commands table, matching the skill (e.g. `AGENTS.md`
  → `AGENTS.original.md`).
- README: tightened the Compression section wording and removed redundant
  phrasing in the Modes table.

## [1.0.3] - 2026-06-30

### Fixed

- README: fixed `medium` → `maximum` in "maximum technical accuracy" and
  "maximum meaning".
- README: escaped the pipe in `/laconic [mode|off]` table cell with the `&#124;`
  HTML entity so the row renders in one cell instead of splitting.
- README: simplified `/laconic-compress` command description to
  "Compress a prose memory file in place." (removed redundant
  "via the laconic-compress skill").

### Changed

- README: renamed the "Compression vs. upstream MCP shrink" section to
  "Compression" and removed the paragraph comparing upstream `caveman-shrink`
  MCP middleware, keeping only the description of the `laconic-compress`
  skill.
- README: removed the "no external Claude CLI" comparison from the
  Compression section; now describes `laconic-compress` on its own terms.

### Fixed

- Replaced remaining old repository URLs and compare links in `CHANGELOG.md`
  with the current `https://github.com/kulapard/pi-laconic/` URLs.

## [1.0.0] - 2026-06-30

### Changed (BREAKING)

- Renamed laconic intensity modes from `lite|full|ultra` to `low|medium|high`
  for clearer, unambiguous level names. Default mode is now `medium`
  (previously `full`).
- Removed `wenyan-lite`, `wenyan-full`, and `wenyan-ultra` modes from the
  laconic skill documentation; the extension never registered them.
- Updated injected mode instructions, command completions, statusline text,
  README, and skill docs to use `low|medium|high`.

### Migration

- Re-enable terse mode with `/laconic` (now `medium`) or `/laconic low|high`.
- Any existing `.pi/laconic-mode.json` with old mode values (`lite`, `full`,
  `ultra`) is treated as invalid and falls back to `off`. Re-enable with
  `/laconic <mode>`.

## [0.9.0] - 2026-06-30

Established the project identity as **pi-laconic** (npm `pi-laconic`,
unscoped). Earlier releases used a different name; the compression behavior is
unchanged, only the name, voice framing, and command/skill identifiers now use
laconic. *Laconic* — terse Spartan speech — frames the output mode.

### Changed (BREAKING)

- Package released as unscoped `pi-laconic`; repository at
  `kulapard/pi-laconic`.
- Commands renamed `/caveman*` → `/laconic*`: `/laconic`, `/laconic-help`,
  `/laconic-commit`, `/laconic-review`, `/laconic-compress`, `/laconic-stats`.
- Skills renamed `caveman*` → `laconic*`; the `cavecrew` subagent suite is now
  `laconic-crew` (agents `laconic-builder`, `laconic-investigator`,
  `laconic-reviewer`).
- Statusline indicator is now `laconic:<mode>`.
- Mode voice reframed to Spartan/laconic; injected instructions now read
  "Respond like a Spartan: maximum meaning, fewest words."
- Natural-language activation phrases updated: "laconic mode", "be laconic",
  "talk like a Spartan", "use laconic" (plus the unchanged generic "less/fewer/
  save tokens", "be brief"); deactivation "stop laconic", "disable laconic",
  "normal mode".
- Project-scoped state now uses `.pi/laconic-mode.json`; the session entry type
  is now `laconic-mode`.

### Migration

- No automatic migration: on upgrade, previously persisted project-scoped
  mode state files are ignored and the mode resets to `off`. Re-enable with
  `/laconic`. The previous slash-command prefixes and natural-language triggers
  are gone.
- The previous npm package is deprecated in favor of `pi-laconic`.

Attribution to upstream [caveman](https://github.com/JuliusBrussee/caveman) is
unchanged.

## [0.7.0] - 2026-06-30

### Changed

- README improvements: added npm/license/CI badges, a quick-start section,
  `/caveman-commit` and `/caveman-review` examples, a note that token savings
  are model-driven estimates, a language-preservation note, and a CHANGELOG link.

### Removed

- Dropped `wenyan-lite`, `wenyan-full`, and `wenyan-ultra` modes and the
  `wenyan`/`classical` aliases. Only `lite`, `full`, and `ultra` remain.

## [0.6.0] - 2026-06-29

### Added

- Release notes reminder: when tagging a release, also create a GitHub Release with the same tag and paste the relevant `CHANGELOG.md` section into the release notes.

### Changed

- Statusline no longer appends `ctx:XX%`; shows only `caveman:<mode>`.
- Re-compressed `AGENTS.md` with `/caveman-compress --force` to reduce session token load.

### Repository

- `.gitignore` now excludes `.pi/caveman-mode.json` (project-scoped mode state).

## [0.5.0] - 2026-06-29

### Added

- `/caveman-compress` now accepts an optional `--force` flag. With `--force`, an existing `.original.<ext>` backup is overwritten instead of aborting.

### Changed

- Updated README, AGENTS.md, caveman-help, and caveman-compress docs to reflect the project-scoped persistence added in v0.4.3 and the new `--force` flag.

## [0.4.2] - 2026-06-29

### Changed

- Compressed `AGENTS.md` with `caveman-compress` to reduce session token load.
- Added `*.original` and `*.original.*` to `.gitignore` so caveman-compress
  backups are not committed accidentally.

## [0.4.1] - 2026-06-29

### Changed

- README install instructions now recommend `pi install
  https://github.com/kulapard/pi-laconic` as the primary direct-load method,
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
  repo; now points to `kulapard/pi-laconic`.
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

Initial release — a terse-output extension for [Pi](https://github.com/earendil-works/pi)
inspired by [caveman](https://github.com/JuliusBrussee/caveman).

### Added

- Caveman output-mode extension (`extensions/caveman.ts`): six intensity modes
  (lite, full, ultra, wenyan-lite, wenyan-full, wenyan-ultra; default full),
  slash commands, natural-language activation/deactivation, and a session
  statusline indicator.
- Skills: `caveman`, `caveman-commit`, `caveman-review`, `caveman-help`,
  `caveman-stats`, `caveman-compress`, and the `cavecrew` subagent suite.
- npm packaging under a scoped, public package name with a `files` whitelist,
  a `prepublishOnly` test gate, and repository metadata.
- GitHub Actions: `ci.yml` (test on push and pull requests) and `publish.yml`
  (publish to npm via Trusted Publishing / OIDC on `v[0-9]*` tags — no stored
  token, automatic provenance, a tag-equals-version guard, and a concurrency
  group).

[Unreleased]: https://github.com/kulapard/pi-laconic/compare/v1.0.6...HEAD
[1.0.6]: https://github.com/kulapard/pi-laconic/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/kulapard/pi-laconic/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/kulapard/pi-laconic/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/kulapard/pi-laconic/compare/v1.0.2...v1.0.3
[0.9.0]: https://github.com/kulapard/pi-laconic/compare/v0.7.0...v0.9.0
[0.7.0]: https://github.com/kulapard/pi-laconic/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/kulapard/pi-laconic/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/kulapard/pi-laconic/compare/v0.4.2...v0.5.0
[0.4.2]: https://github.com/kulapard/pi-laconic/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/kulapard/pi-laconic/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/kulapard/pi-laconic/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/kulapard/pi-laconic/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kulapard/pi-laconic/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kulapard/pi-laconic/releases/tag/v0.1.0
