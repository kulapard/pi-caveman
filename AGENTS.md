# AGENTS.md — pi-caveman conventions

Project memory. Non-obvious only.

## Architecture (do not rebuild)

- `extensions/caveman.ts` = Pi extension. `extensions/caveman-core.ts` = pure SDK-free logic (`normalizeMode`, `modeInstructions`, `VALID_MODES`, regexes). Unit-testable without fake SDK.
- Mode state **session + project-scoped**: `pi.appendEntry("caveman-mode", …)`
  restores from `ctx.sessionManager.getBranch()` on `session_start`; since
  v0.4.3 `extensions/caveman-state.ts` also reads/writes `.pi/caveman-mode.json`
  in the project directory. A session entry overrides the project default; a
  project without a state file falls back to `off`. No global/env default.
- Activation = `before_agent_start` appends `modeInstructions(mode)`. Statusline = `ctx.ui.setStatus("caveman", …)` guarded by `hasUI`.
- Extension `modeInstructions` = **canonical** activator. `skills/caveman/SKILL.md` = fallback for hosts loading skills but not extension. Both active → model sees both rule sets; intentional redundancy, no de-dupe.
- Pi 0.80.2 has **no `agents/` subagent mechanism**. `agents/cavecrew-*.md` = reference personas only; cavecrew optional/out-of-scope.

## Invariants

- **SDK import `import type` only** in `extensions/*.ts`. JS tests run via `--experimental-strip-types`, erases type-only imports. Value import from `@earendil-works/pi-coding-agent` breaks tests — `tests/extension.test.mjs` asserts this.
- **Verbatim preservation**: caveman-compress never changes code blocks, inline code, URLs, paths, commands, exact error strings. Self-validate against original. Mismatch unfixable → restore from `.original` backup created in same invocation (stale backups rejected before compression).
- `caveman-compress` is **prompt-only**: Pi agent compresses with own model + file tools, driven by `SKILL.md`. No Python, no external model CLI. Coverage = `tests/compress-docs.test.mjs`.
- `/caveman-compress` supports `--force`: overwrites existing `.original.<ext>` backup instead of aborting.

## Changelog

Every notable change update `CHANGELOG.md` under `[Unreleased]`. Before finishing, run `npm run changelog:check`. CI runs same check on every PR.

- `npm test` runs `pretest` (`npm run typecheck` → `tsc --noEmit`), then `node --test tests/**/*.test.mjs`. Typecheck failures fail test run.
- Node `--test` glob expanded by runner, not shell. Directory-recursion `--test tests/` does **not** work on current Node — keep glob.
- Tests are **phantom-reference guards** (`tests/stats-docs.test.mjs`, `tests/cavecrew-docs.test.mjs`, `tests/compress-docs.test.mjs`): docs must not mention Claude-Code hooks layer, plugin install path, `⛏` badge, Claude-only subagent presets, broken asset paths. Do not reintroduce.
