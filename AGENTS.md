# AGENTS.md — pi-laconic conventions

Project memory. Non-obvious only.

## Architecture (do not rebuild)

- `extensions/laconic.ts` = Pi extension. `extensions/laconic-core.ts` holds SDK-free logic (`normalizeMode`, `modeInstructions`, `VALID_MODES`, regexes). Testable without fake SDK.
- Mode state **session + project-scoped**: `pi.appendEntry("laconic-mode", …)` restores from `ctx.sessionManager.getBranch()` on `session_start`; since v0.4.3 `extensions/laconic-state.ts` reads/writes `.pi/laconic-mode.json`. Session entry overrides project default; missing state file → `off`. No global/env default.
- `before_agent_start` appends `modeInstructions(mode)`. Statusline = `ctx.ui.setStatus("laconic", …)` guarded by `hasUI`.
- Extension `modeInstructions` = **canonical** activator. `skills/laconic/SKILL.md` = fallback when extension not loaded. Both active → model sees both rule sets; intentional redundancy, no de-dupe.
- Pi 0.80.2 has **no `agents/` subagent mechanism**. `agents/laconic-crew-*.md` = reference personas only; laconic-crew optional/out-of-scope.

## Invariants

- **SDK import `import type` only** in `extensions/*.ts`. JS tests use `--experimental-strip-types`, erases type-only imports. Value import from `@earendil-works/pi-coding-agent` breaks tests — `tests/extension.test.mjs` asserts this.
- **Verbatim preservation**: laconic-compress never changes code blocks, inline code, URLs, paths, commands, exact error strings. Self-validate against original. Mismatch unfixable → restore from `.original` backup created in same invocation; stale backups rejected before compression.
- `laconic-compress` **prompt-only**: Pi agent compresses with own model + file tools, driven by `SKILL.md`. No Python, no external model CLI. Coverage = `tests/compress-docs.test.mjs`.
- `/laconic-compress` supports `--force`: overwrites existing `.original.<ext>` backup instead of aborting.

## Releases

Tag push triggers npm publish via `.github/workflows/publish.yml`. On release, create GitHub Release with same tag; paste matching `CHANGELOG.md` section into notes.

## Changelog

Every notable change → `CHANGELOG.md` `[Unreleased]`. Before finish, run `npm run changelog:check`. CI runs same check per PR.

- `npm test` = `pretest` (`npm run typecheck` → `tsc --noEmit`), then `node --test tests/**/*.test.mjs`. Typecheck failures fail test run.
- Node `--test` glob expanded by runner, not shell. Directory-recursion `--test tests/` does **not** work on current Node — keep glob.
- Tests are **phantom-reference guards** (`tests/stats-docs.test.mjs`, `tests/laconic-crew-docs.test.mjs`, `tests/compress-docs.test.mjs`): docs must not mention Claude-Code hooks layer, plugin install path, `⛏` badge, Claude-only subagent presets, broken asset paths. Do not reintroduce.
