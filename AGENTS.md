# AGENTS.md — pi-caveman conventions

Project memory for agents working in this repo. Non-obvious conventions only.

## Architecture (do not rebuild)

- `extensions/caveman.ts` is the Pi extension; `extensions/caveman-core.ts` holds
  the pure, SDK-free logic (`normalizeMode`, `modeInstructions`, `VALID_MODES`,
  the activation/deactivation regexes) so it is unit-testable without a fake SDK.
- Mode state is **session-scoped**: stored via `pi.appendEntry("caveman-mode", …)`
  and restored from `ctx.sessionManager.getBranch()` on `session_start`. A new
  session always starts `off`. There is **no** cross-session config file or env var.
- Activation = `before_agent_start` appends `modeInstructions(mode)` to the
  system prompt. Statusline = `ctx.ui.setStatus("caveman", …)` guarded by `hasUI`.
- Pi 0.80.2 has **no `agents/` subagent mechanism**. The `agents/cavecrew-*.md`
  files are reference personas only and cavecrew is optional/out-of-scope.

## Invariants

- **SDK import is `import type` only** in `extensions/*.ts`. The JS tests run via
  `--experimental-strip-types`, which erases type-only imports, so no installed
  SDK is needed at test time. A value import from `@earendil-works/pi-coding-agent`
  would break the tests — `tests/extension.test.mjs` asserts this invariant.
- **Verbatim preservation**: caveman-compress never alters code blocks, inline
  code, URLs, file paths, commands, or exact error strings. `validate.py` enforces
  this and `compress.py` aborts + restores the original on any validation failure.
- `caveman-compress` is **model-bound**: `compress.py` `call_claude()` calls the
  Anthropic SDK (if `ANTHROPIC_API_KEY` is set) or the `claude --print` CLI. The
  deterministic, unit-tested pieces are `detect.py`, `validate.py`, and the pure
  helpers; the live model call is never exercised in tests (it is monkeypatched).

## Tests / validation

- `npm test` runs `pretest` (`npm run typecheck` → `tsc --noEmit`) first, then the
  `node --test` suites under `tests/`. Typecheck failures fail the test run.
- The JS test glob (`tests/**/*.test.mjs`) is expanded by the Node `--test` runner,
  not the shell. Directory-recursion (`--test tests/`) does **not** work on the
  current Node — keep the glob.
- **Python tests are not on PATH.** Create a venv and install pytest:
  `python3 -m venv .venv && .venv/bin/pip install pytest`, then run
  `npm run test:py` (which calls `.venv/bin/pytest skills/caveman-compress`).
- Several tests are **phantom-reference guards** (`tests/stats-docs.test.mjs`,
  `tests/cavecrew-docs.test.mjs`, `tests/compress-docs.test.mjs`): they assert the
  docs do **not** mention a Claude-Code hooks layer, a plugin install path, the
  `⛏` badge, Claude-only subagent presets, or broken asset paths. Do not
  reintroduce those references.
