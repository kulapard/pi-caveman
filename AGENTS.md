# AGENTS.md — pi-laconic conventions

Project memory. Non-obvious only.

## Architecture (do not rebuild)

- `extensions/laconic.ts` = Pi extension. SDK-free logic in `extensions/laconic-core.ts`: `normalizeMode`, `modeInstructions`, `VALID_MODES`, regexes. Testable without fake SDK.
- Mode state **session + project-scoped**. `pi.appendEntry("laconic-mode", …)` restores from `ctx.sessionManager.getBranch()` on `session_start`; `extensions/laconic-state.ts` reads/writes `.pi/laconic-mode.json`. Session entry overrides project default; missing state file → `off`. No global/env default.
- `before_agent_start` appends `modeInstructions(mode)`. Statusline = `ctx.ui.setStatus("laconic", …)` guarded by `hasUI`.
- Extension `modeInstructions` = **canonical** activator. `skills/laconic/SKILL.md` = fallback when extension not loaded. Both active → model sees both rule sets; intentional redundancy, no de-dupe.
- Extension exposes `/laconic`, `/laconic-help`, and `/laconic-compress`. No packaged subagents. `agents/` directory, `laconic-crew`, `laconic-commit`, and `laconic-review` removed. Laconic mode still propagates to any subagent via `before_agent_start` when the extension is loaded.

## Invariants

- **SDK import `import type` only** in `extensions/*.ts`. JS tests use `--experimental-strip-types`, erases type-only imports. Value import from `@earendil-works/pi-coding-agent` breaks tests — `tests/extension.test.mjs` asserts this.
- **Verbatim preservation**: laconic-compress preserves code blocks, inline code, URLs, paths, commands, exact error strings. Self-validate against original. Mismatch unfixable → restore from `.original` backup created in same invocation; stale backups rejected before compression.
- `laconic-compress` **prompt-only**: Pi agent compresses via own model + file tools, per `SKILL.md`. No Python, no external model CLI. Coverage = `tests/compress-docs.test.mjs`.
- `/laconic-compress` supports `--force`: overwrites existing `.original.<ext>` backup instead of aborting.

## Releases

Tag push triggers npm publish via `.github/workflows/publish.yml`. On release, create GitHub Release with same tag; paste matching `CHANGELOG.md` section into notes.

## Changelog

Every notable change → `CHANGELOG.md` `[Unreleased]`. Before finish, run `npm run changelog:check`. CI runs same check per PR.

- `npm test` = `pretest` (`npm run typecheck` → `tsc --noEmit`), then `node --test tests/**/*.test.mjs`. Typecheck failures fail test run.
- Node `--test` glob expanded by runner, not shell. Directory-recursion `--test tests/` does **not** work on current Node — keep glob.
- Tests are **phantom-reference guards** (`tests/laconic-crew-docs.test.mjs`, `tests/compress-docs.test.mjs`): docs must not mention Claude-Code hooks layer, plugin install path, `⛏` badge, Claude-only subagent presets, broken asset paths. Do not reintroduce.
