# Pi Laconic — Finish & Package the Existing Implementation

## Overview
- A substantial **Pi version of laconic already exists** at `/Users/kulapard/projects/pi-laconic/` (built earlier today using the real Pi SDK `@earendil-works/pi-coding-agent`). The goal of this plan is **not** a greenfield port — it is to **finish and package** that implementation so it is installable, typechecked, tested, documented, and consistent.
- Laconic compresses agent output (~65–75%) while preserving technical substance. The existing Pi implementation already covers the feature surface: six intensity modes, slash commands, natural-language activation, a session statusline, a Python-backed compress tool, and laconic-crew subagents.
- ⚠️ **This plan respects the existing architecture. Do NOT rebuild it.** The earlier draft of this plan assumed a Superpowers-style `context`-injection + content-marker + cross-session config-file design. The shipped code deliberately uses a *different, working* approach and that approach stays:
  - **Activation** = `pi.on("before_agent_start")` appends mode instructions to `event.systemPrompt` (not user-message injection, no markers, no dual-dedup needed).
  - **State** = **session-scoped** via `pi.appendEntry("laconic-mode", …)` + restore from `ctx.sessionManager.getBranch()` on `session_start` (mode resets to `off` each new session by design — NOT cross-session files).
  - **Statusline** = `ctx.ui.setStatus("laconic", "laconic:<mode>")` guarded by `ctx.hasUI`.
  - **Commands** = `pi.registerCommand(...)` for `/laconic`, `/laconic-help`, `/laconic-commit`, `/laconic-review`, `/laconic-compress`, `/laconic-stats` (with argument completions).
- The real, missing work is: a `package.json` Pi manifest (the package currently cannot be loaded as a Pi package), TypeScript typechecking, an automated test suite (there are zero tests), reconciling features that are declared but not implemented (stats tracking, savings badge, MCP shrink), a root README/install path, and git init.

## Context (from discovery — actual on-disk state)
- **`extensions/laconic.ts`** (230 lines, verified) — imports `ExtensionAPI`/`ExtensionContext` from `@earendil-works/pi-coding-agent`. Exports `default function laconicExtension(pi)`. Module-private helpers `normalizeMode`, `modeInstructions`, and constants `VALID_MODES`, `ACTIVATION_RE`, `DEACTIVATION_RE`, `HELP_TEXT`. Modes: `lite | full | ultra | wenyan-lite | wenyan-full | wenyan-ultra` (+ `off`). `normalizeMode` maps empty→`full`, `wenyan`/`classical`→`wenyan-full`, `off`/`stop`/`normal`…→`off`, invalid→`undefined`.
- **`skills/`** — 7 skills, each with `SKILL.md` (frontmatter `name` + `description` with trigger phrases) and `README.md`: `laconic`, `laconic-commit`, `laconic-review`, `laconic-compress`, `laconic-stats`, `laconic-help`, `laconic-crew`.
- **`skills/laconic-compress/scripts/`** — real Python: `compress.py` (13k, with `ValidationResult`, URL/path/fence regexes), `validate.py`, `detect.py`, `cli.py`, `benchmark.py`, `__init__.py`, `__main__.py`. This is how compress actually works (script, not the model, not an MCP tool).
- **`agents/`** — `laconic-builder.md`, `laconic-investigator.md`, `laconic-reviewer.md`. `skills/laconic-crew/SKILL.md` references `Explore` and "spawn investigator/builder/reviewer" — Claude-Code-flavored subagent language that needs a Pi-tooling sanity check.
- **`LICENSE`** present. Empty root **`scripts/`** dir. **No `package.json`, no tests, not a git repo.**
- **Toolchain available**: `pi` CLI installed (`pi 0.80.2`, shell function → `command pi`, base dir `~/.pi/agent-base`), Node `v26.3.0`, npm `11.16.0`, SDK `@earendil-works/pi-coding-agent@0.80.2` (ESM-only, ships `dist/index.d.ts`). `node --test` + `node --experimental-strip-types` both work. ⚠️ **`pytest` is NOT installed** — Task 5 must add it. `python3` is present.
- ⚠️ **Phantom Claude-Code architecture in the docs**: several shipped skills/agents reference a Claude Code hooks layer that was never ported and does not exist on disk (no `hooks/` dir, no `.js` files): `laconic-stats/SKILL.md` and `laconic-stats/README.md` cite `hooks/laconic-stats.js`, `hooks/laconic-mode-tracker.js`, `decision: "block"`, a "Claude Code session log", and a `⛏ 12.4k` statusline badge; `agents/laconic-investigator.md`'s example cites `hooks/laconic-config.js:81`, `hooks/laconic-activate.js`, `tests/test_symlink_flag.js`; all three `agents/laconic-crew-*.md` use Claude Code frontmatter (`tools: [Read, Edit, Write, Grep, Glob]`, `model: haiku`); `laconic-crew/SKILL.md`+README reference Claude Code subagent presets (`Explore`, `Code Reviewer`, `feature-dev:code-architect`). These are doc-reconciliation work (Tasks 6, 8).
- **`laconic-compress` is Claude-bound**: `compress.py` performs compression via a live model call (`call_claude()` → Anthropic SDK or `claude --print` CLI), not a deterministic transform. The deterministic, unit-testable pieces are `detect.py`, `validate.py`, and `compress.py`'s pure helpers (`split_frontmatter`, `strip_llm_wrapper`, `is_sensitive_path`, `backup_dir_for`).
- **Pi packaging convention** (from the shipped Superpowers `package.json`): `type: "module"`, `keywords` ⊇ `["pi-package"]`, `pi.extensions: ["<path>.ts"]`, `pi.skills: ["./skills"]`. The extension path in the manifest is explicit, so the existing `./extensions/laconic.ts` location can be declared directly — but whether Pi *requires* `.pi/extensions/` must be confirmed against the real `pi` (Task 1), not assumed.

## Development Approach
- **testing approach**: TDD (tests first) — write failing tests for each unit before implementing/fixing, then GREEN.
- **respect the existing architecture** — finish and harden it; do not replace `before_agent_start`/session-entry/`setStatus`/`registerCommand` with a different design.
- complete each task fully before the next; small, focused changes.
- **CRITICAL: every task with code changes MUST include new/updated tests** (success + error cases). Discovery/decision tasks produce notes instead and are marked as such.
- **CRITICAL: all tests must pass before starting the next task.**
- **CRITICAL: update this plan file when scope changes** (e.g. a decision task descopes a feature).
- run tests after each change; preserve verbatim-content guarantees (code/commands/URLs/paths/errors).

## Testing Strategy
- **Extension unit tests** (`node --test`, strip-types): import the extension module and its exported helpers; drive handlers with a fake `pi`/`ctx`. Assert: `normalizeMode` mapping table; `before_agent_start` returns `undefined` when `off` and appends `modeInstructions(mode)` otherwise; `input` regex activates (`full`) / deactivates (`off`); `session_start` restores the last `laconic-mode` entry from a fake branch; `registerCommand` handlers (valid mode notifies + persists, invalid notifies error, compress with no arg errors). Requires exporting the currently-private helpers (Task 4).
- **Python tests** (`pytest`, must be installed first) for `laconic-compress` — **deterministic functions only** (compression itself calls a live model, so it is NOT unit-tested for a ratio): `validate.py` `ValidationResult` + `extract_code_blocks`/`extract_urls`/`extract_inline_codes` flag a doctored compression that drops a code line/URL; `detect.py` `detect_file_type`/`should_compress` classify correctly; `compress.py` pure helpers (`split_frontmatter`, `strip_llm_wrapper`, `is_sensitive_path`, `backup_dir_for`); and `compress_file`'s no-Claude branches via a **monkeypatched `call_claude`** (sensitive-path refusal, empty body, oversize, backup-already-exists, identical-output abort). Real compression-ratio checks belong to the Post-Completion manual smoke test.
- **Package/typecheck checks**: a manifest test asserts the `pi` block; `tsc --noEmit` (or `node --experimental-strip-types` parse) confirms the extension typechecks against the SDK types.
- **No UI e2e framework** — Pi is a terminal agent. Real-Pi behavior (banner injection, `/laconic ultra`, statusline) is a manual smoke test in Post-Completion, since it needs the live `pi` binary.

## Progress Tracking
- mark completed items `[x]` immediately; add discovered tasks with ➕; blockers with ⚠️.
- keep the plan in sync; if a decision task drops a feature, update Acceptance Criteria.

## Acceptance Criteria
- `pi` can load the package: `package.json` declares `type: "module"`, `keywords` ⊇ `["pi-package"]`, `pi.extensions` (pointing at the confirmed extension path), `pi.skills: ["./skills"]`.
- The extension typechecks against `@earendil-works/pi-coding-agent` with no errors.
- Automated tests exist and pass: extension unit tests (`npm test`) and Python compress tests (`pytest`).
- Every *declared* feature is either implemented or its skill/UX text is corrected to match reality: `/laconic-stats` (no token tracking exists), the savings statusline (currently shows mode, not %), and MCP `caveman-shrink` (does not exist — **Task 7 decision: out of scope for v0.1.0**; the Python `laconic-compress` toolkit, itself Claude-bound and invoked via the `/laconic-compress` skill/command, is the Pi equivalent — decision record in `docs/audit.md` §12).
- **No phantom references remain**: no skill or agent references `hooks/*.js`, `decision: "block"`, a "Claude Code session log" reader, the `⛏` savings badge, `tests/test_symlink_flag.js`, or Claude-Code-only subagent presets (`Explore`/`Code Reviewer`/`feature-dev:*`) unless that thing is actually implemented for Pi. (Checkable in Task 10.)
- Verbatim preservation (code/commands/URLs/paths/errors) holds in compress and in the skill instructions.
- Root `README.md` documents install (the confirmed `pi` mechanism), commands, and modes; repo is under git.
- A manual smoke test in a real Pi session confirms auto-activation, mode switching, and statusline.

## Solution Overview
- Keep the existing extension and skills as the source of truth. Add the **packaging layer** (`package.json`, `tsconfig.json`, test runner config) around them.
- Make the extension's pure logic **testable** by exporting `normalizeMode`/`modeInstructions`/regexes (or extracting them to a sibling `lib.ts`/`lib.mjs` the extension imports), then cover them with `node --test`.
- Add `pytest` coverage to the already-real Python compress toolkit.
- **Reconcile declared-but-unbuilt features** via explicit decision tasks rather than silently building the heavy Superpowers machinery: stats tracking, savings badge, MCP shrink. Default to correcting the docs/UX to match the (good, simpler) reality unless the user wants the feature built.
- Add README/install and git.

## Technical Details
- **package.json**: `name: "pi-laconic"`, `version: "0.1.0"`, `type: "module"`, MIT, `engines.node: ">=18"`, `keywords: ["pi-package", …]`, `pi: { extensions: ["./extensions/laconic.ts"], skills: ["./skills"] }`, `devDependencies: { "@earendil-works/pi-coding-agent": "^0.80.2", "typescript": "^5" }` (SDK is ESM-only + pre-1.0 → pin to `^0.80.2`; Post-Completion already flags API churn), scripts: `test` (`node --experimental-strip-types --test tests/**/*.test.mjs`), `typecheck` (`tsc --noEmit`), `test:py` (`pytest skills/laconic-compress`).
- **Extension testability**: the cleanest refactor is to move `normalizeMode`, `modeInstructions`, `VALID_MODES`, `ACTIVATION_RE`, `DEACTIVATION_RE` into `extensions/laconic-core.ts` and have `laconic.ts` import them; tests import `laconic-core.ts` directly (no fake SDK needed for the pure logic), and a thin handler test uses a fake `pi`.
- **Mode semantics to preserve**: session-scoped, resets to `off` on `session_start`, restored from the *last* `laconic-mode` custom entry in the branch. Do not change to cross-session persistence (that contradicts the design; only revisit if a decision task explicitly chooses it).
- **Extension path**: declare `./extensions/laconic.ts` in the manifest; if Task 1's real-`pi` check shows Pi only loads `.pi/extensions/`, move the file there and update the manifest + this plan.

## What Goes Where
- **Implementation Steps** (`[ ]`): packaging, typecheck config, tests, doc/UX reconciliation, README/install, git — all doable in this repo.
- **Post-Completion** (no checkboxes): real-Pi smoke testing, publishing/distribution, optional upstream PR to JuliusBrussee/caveman adding Pi support.

## Implementation Steps

### Task 1: Audit existing implementation and confirm Pi load mechanics

**Files:**
- Create: `/Users/kulapard/projects/pi-laconic/docs/audit.md`

- [x] read every `skills/*/SKILL.md` + `README.md`, the 3 `agents/laconic-crew-*.md`, and the Python files; record purpose, declared-vs-implemented features, and bugs in `docs/audit.md` — explicitly catalogue the phantom Claude-Code references (the `hooks/*.js`, `decision:"block"`, `⛏` badge, `tests/test_symlink_flag.js`, and subagent-preset citations listed in Context) with file+line for Tasks 6/8 — done (audit §3–§7; full phantom catalogue with file:line in §7)
- [x] **concrete load test**: actually load the package via the real `pi` (a draft `package.json` with the `pi` block, then `pi -e /Users/kulapard/projects/pi-laconic` or the package mechanism) and confirm `/laconic-help` registers and `/laconic ultra` works — this verifies whether `pi.extensions: ["./extensions/laconic.ts"]` is honored at this path or whether the file must move to `.pi/extensions/`. Record the working mechanism (this gates Tasks 2 and 9) — done: `pi -e extensions/laconic.ts --print "/laconic-help"` exits 0 (loads clean); SDK loader honors `pi.extensions` at the current path via `path.resolve(dir, extPath)` — **no `.pi/extensions/` move needed** (audit §2). Live interactive TUI smoke (`/laconic ultra` response style + statusline) verified statically; deferred to Post-Completion to avoid hanging the non-interactive shell.
- [x] **confirm Pi subagent support**: determine whether Pi honors an `agents/` subagent-preset mechanism at all (it is a Claude Code concept). The laconic-crew premise ("spawn subagent → compressed tool-result into main context") depends on it; record whether laconic-crew can be ported, must use `pi-subagents`, or should be marked optional/out-of-scope (gates Task 8) — done: Pi 0.80.2 has **NO `agents` resource type and no subagent API** (`ResolvedPaths` = extensions/skills/prompts/themes only; no `registerAgent`/`subagent` in SDK). → **laconic-crew = optional/out-of-scope**; Task 8 only strips phantom refs (audit §6).
- [x] confirm the SDK version (`0.80.2`) and ESM-only nature for `package.json` — done: `@earendil-works/pi-coding-agent@0.80.2`, `"type":"module"`, exports only `import` (no CJS) (audit §1).
- [x] list the concrete gap set and confirm/adjust the task list below — done (audit §9); task list confirmed, with adjustments: no `.pi/` move (T2), pytest must be installed (T5), laconic-crew out-of-scope (T8), repo already git-initialized (T9).
- [x] discovery task → no code, no tests; deliverable is `docs/audit.md` — done.

### Task 2: package.json and Pi manifest

**Files:**
- Create: `/Users/kulapard/projects/pi-laconic/package.json`
- Create: `/Users/kulapard/projects/pi-laconic/.gitignore`
- Create: `/Users/kulapard/projects/pi-laconic/tests/manifest.test.mjs`

- [x] write `tests/manifest.test.mjs` asserting `package.json` has `type: "module"`, `keywords` ⊇ `["pi-package"]`, `pi.skills: ["./skills"]`, `pi.extensions` pointing at the Task-1-confirmed extension path, and the `test`/`typecheck` scripts — done (7 assertions; also covers name/version/MIT, engines.node `>=18`, devDependencies pins, and `test:py`)
- [x] run test — verify RED (no `package.json`) — done: all 7 failed with ENOENT on `package.json`
- [x] create `package.json` (name/version/MIT/engines/keywords/pi block/devDependencies/scripts) and `.gitignore` (`node_modules`, `__pycache__`, `*.tgz`) — done: created `package.json`; `.gitignore` already existed with `node_modules/`, `__pycache__/`, `*.pyc`, `*.tgz` (kept as-is)
- [x] run `npm install` to fetch the SDK + typescript dev deps — done: SDK `@earendil-works/pi-coding-agent@0.80.2` + typescript resolved from registry; `package-lock.json` generated (141 packages, 0 vulnerabilities)
- [x] run test — verify GREEN before next task — done: `npm test` → 7/7 pass

### Task 3: TypeScript typecheck of the extension

**Files:**
- Create: `/Users/kulapard/projects/pi-laconic/tsconfig.json`
- Modify: `/Users/kulapard/projects/pi-laconic/extensions/laconic.ts` (only if typecheck surfaces errors)

- [x] add `tsconfig.json` (module `nodenext`, `noEmit`, `strict`, include `extensions/**/*.ts`) — done: created `tsconfig.json` with `module`/`moduleResolution` `nodenext`, `target es2022`, `strict`, `noEmit`, `skipLibCheck` (SDK ships internal `.ts` import specifiers resolved via its own `.d.ts`), `include: ["extensions/**/*.ts"]`
- [x] run `npm run typecheck` — capture any type errors against the real SDK types (this is the RED state if errors exist) — done: RED — 6× TS2322 errors, all the same shape: `registerCommand` handlers `(args, ctx) => void` not assignable to SDK's `handler: (args, ctx) => Promise<void>` (laconic.ts lines 144/160/171/181/191/203)
- [x] fix any type errors in `laconic.ts` (keep behavior identical) — done: made all 6 command handlers `async` (an async fn with no `await` returns `Promise<void>`; Pi already awaits the returned promise, so runtime behavior, all 6 modes, and logic are identical). No value-import added; SDK import stays type-only.
- [x] add a test/CI assertion that `tsc --noEmit` exits 0 (wire into `npm test` or a `pretest`) — done: added `"pretest": "npm run typecheck"` to package.json scripts. npm runs `pretest` automatically before `test`, so `npm test` now fails if typecheck fails. Left `test`/`typecheck` script *values* unchanged so the Task-2 manifest test (exact-string asserts) still passes.
- [x] run `npm run typecheck` — verify GREEN — done: `npm run typecheck` exits 0; `npm test` runs pretest (typecheck exit 0) then 7/7 manifest tests pass

### Task 4: Make extension logic testable + unit tests

**Files:**
- Create: `/Users/kulapard/projects/pi-laconic/extensions/laconic-core.ts`
- Modify: `/Users/kulapard/projects/pi-laconic/extensions/laconic.ts`
- Create: `/Users/kulapard/projects/pi-laconic/tests/extension.test.mjs`

- [x] write failing `tests/extension.test.mjs`: `normalizeMode` table (empty→`full`, `wenyan`→`wenyan-full`, `off`/`stop`/`normal`→`off`, garbage→`undefined`, each valid mode→itself); `modeInstructions(mode)` contains `LACONIC MODE ACTIVE` + the per-mode line; `ACTIVATION_RE`/`DEACTIVATION_RE` match the documented phrases and not innocuous text — done (21 extension assertions covering the full table + per-mode lines + both regexes positive/negative)
- [x] run test — verify RED (helpers not exported) — done: RED was `ERR_MODULE_NOT_FOUND` for `extensions/laconic-core.ts` (module not yet created)
- [x] extract the pure helpers/constants into `extensions/laconic-core.ts`; import them in `laconic.ts` (no behavior change) — done: moved `LaconicMode`/`StoredMode` types, `VALID_MODES`, `normalizeMode`, `modeInstructions`, `ACTIVATION_RE`, `DEACTIVATION_RE` into `laconic-core.ts` (exported); `laconic.ts` now imports them (value import of the local core + `import type { StoredMode }`). `HELP_TEXT` stays in `laconic.ts` (extension-only). Required `allowImportingTsExtensions: true` in `tsconfig.json` so `tsc` accepts the `.ts` import specifier that the strip-types test runner needs — no behavior change.
- [x] add fake-`pi` handler tests that import `laconic.ts` and call the exported `laconicExtension(fakePi)` factory: `before_agent_start` returns `undefined` when `off` and appends `modeInstructions` when active; `session_start` restores the last `laconic-mode` branch entry; `/laconic` handler persists valid mode / errors on invalid; `/laconic-compress` with empty arg notifies error — done (fake `pi` captures `on`/`registerCommand`/`appendEntry`/`sendMessage`/`sendUserMessage`; fake `ctx` captures `hasUI`/`ui.setStatus`/`ui.notify`/`sessionManager.getBranch`; covers off→undefined, active→appended instructions, last-entry restore, no-entry reset, valid persist, invalid error+no-persist, empty-compress error, valid-compress dispatch)
- [x] ⚠️ these handler tests work only because `laconic.ts` imports the SDK as **type-only** (erased by `--experimental-strip-types`, so no installed-SDK runtime needed) — assert/verify this invariant in the task; if `laconic.ts` ever adds a value import from the SDK, these tests must mock the module — done: two tests read the source files and assert the SDK import is `import type` only (and no SDK value import) in both `laconic.ts` and `laconic-core.ts`
- [x] run test — verify GREEN — done: `npm test` → pretest typecheck exit 0, then 28/28 pass (21 extension + 7 manifest)

### Task 5: Python tests for laconic-compress

**Files:**
- Create: `/Users/kulapard/projects/pi-laconic/skills/laconic-compress/tests/test_validate_detect.py`
- Create: `/Users/kulapard/projects/pi-laconic/skills/laconic-compress/tests/test_compress_helpers.py`
- Create: `/Users/kulapard/projects/pi-laconic/skills/laconic-compress/tests/conftest.py` (if a shared fake/monkeypatch fixture is useful)

> ⚠️ **Compression is a live model call** (`compress.py` `call_claude()` → Anthropic SDK / `claude --print`). Do NOT write a deterministic "compression ratio / idempotent" unit test — it is non-hermetic and `claude` may be absent in CI. Test only the deterministic pieces; the real ratio is checked manually (Post-Completion).

- [x] install pytest into the project's Python env (and note the command in the README / `test:py` setup) — it is currently NOT installed — done: isolated repo-root venv (`python3 -m venv .venv`); ANNA Nexus mirror timed out, so installed from public PyPI: `.venv/bin/pip install --no-cache-dir --isolated --index-url https://pypi.org/simple pytest` (pytest 9.1.1). `.venv/` + `.pytest_cache/` added to `.gitignore`; command recorded in `docs/audit.md` §11. Plan's `test:py` runs via `.venv/bin/pytest skills/laconic-compress`.
- [x] write failing `test_validate_detect.py`: `validate.py` `ValidationResult` + `extract_code_blocks`/`extract_urls`/`extract_inline_codes` flag a doctored compression that drops a code line / URL / inline code; `detect.py` `detect_file_type`/`should_compress` classify fixtures correctly — done (36 tests: ValidationResult state, extractors, doctored-drop validators for code/URL/inline + heading-count, `detect_file_type` extension table + extensionless content sniffing, `should_compress` gate incl. backup/missing-file). Added `tests/conftest.py` to put the skill root on `sys.path` so `from scripts import …` resolves (compress.py uses package-relative imports).
- [x] write failing `test_compress_helpers.py`: pure helpers `split_frontmatter`, `strip_llm_wrapper`, `is_sensitive_path`, `backup_dir_for`; and `compress_file`'s no-Claude branches via a **monkeypatched `call_claude`** (sensitive-path refusal, empty body, oversize, backup-already-exists, identical-output abort) — done (22 tests). Helpers cover frontmatter/CRLF, outer-fence strip (incl. tilde), sensitive denylist (name + directory component), and `backup_dir_for` XDG + home-default branches. `compress_file` branches use a `no_claude` fixture that raises if `call_claude` is reached (proving sensitive/oversize/empty/backup-exists never call the model) plus an `isolated_backup_dir` fixture redirecting `$XDG_DATA_HOME` to tmp; identical-output abort monkeypatches `call_claude` to echo the body and asserts the source file is untouched + no backup written.
- [x] run `pytest` — verify RED (no tests yet / any real bug found) — done: RED was 1 real bug — `test_detect_file_type_by_extension[.env-config]` failed (`natural_language` != `config`). Bare `.env` has empty `Path.suffix`, so the `SKIP_EXTENSIONS` (`.env`) check never matched and `detect_file_type` content-sniffed it as natural language → `should_compress` True (it would offer `.env` for compression to a third-party API).
- [x] fix any validate/detect/helper bugs the tests expose (keep the verbatim guarantees) — done: fixed `detect.py` — in the extensionless branch, leading-dot files whose full lowercase name is a known `SKIP_EXTENSIONS` entry are now classified by filename first (`.env` → `config`) before content sniffing. No verbatim-preservation logic touched; `compress_file`'s `is_sensitive_path` net still independently refuses `.env`.
- [x] run `pytest` — verify GREEN — done: `.venv/bin/pytest skills/laconic-compress` → 58 passed. `npm test` still 28/28 (JS suite untouched).

### Task 6: Reconcile stats + statusline with reality

**Files:**
- Modify: `/Users/kulapard/projects/pi-laconic/skills/laconic-stats/SKILL.md`
- Modify: `/Users/kulapard/projects/pi-laconic/skills/laconic-stats/README.md`
- Modify: `/Users/kulapard/projects/pi-laconic/extensions/laconic.ts` (only if implementing tracking)

- [x] enumerate the specific phantom claims in BOTH files: `laconic-stats/SKILL.md` references `hooks/laconic-stats.js`, `hooks/laconic-mode-tracker.js`, `decision: "block"`, and a "Claude Code session log"; `laconic-stats/README.md` references the same hooks plus the `⛏ 12.4k` statusline badge and a "lifetime-savings suffix file" — none of which exist on Pi — done: confirmed against current files (SKILL.md:5,10; README.md:7,9) and audit §7
- [x] **decision** (default: rewrite BOTH SKILL.md and README.md to match reality — stats are a manual/skill-driven estimate, statusline is a `laconic:<mode>` indicator, no hooks/session-log/badge): if the user instead wants real tracking, add a minimal session-entry counter in the extension and surface it via `setStatus` + the skill — done: took the DEFAULT (corrected docs). Rewrote both files: stats = on-demand model-driven estimate (Pi exposes no per-turn usage), statusline = `laconic:<mode>` mode indicator. No tracking added to the extension (non-default branch; not requested)
- [x] if docs were corrected: add a content test asserting neither `laconic-stats` file references `hooks/*.js`, `decision:"block"`, a session-log reader, or the `⛏` badge. If tracking was implemented: add unit tests for the counter — done: `tests/stats-docs.test.mjs` reads both files and asserts absence of `hooks/`, `laconic-stats.js`, `laconic-mode-tracker.js`, `decision: "block"`/`decision:"block"`, "session log"/"session-log", `⛏`, "lifetime-savings"; plus a frontmatter-validity assertion
- [x] run relevant tests — verify GREEN — done: `npm test` → pretest typecheck exit 0, then 31/31 pass (28 prior + 3 new). Python unaffected: `.venv/bin/pytest skills/laconic-compress` → 58 passed

### Task 7: Decide MCP caveman-shrink parity

**Files:**
- Modify: `/Users/kulapard/projects/pi-laconic/docs/audit.md` (decision record)
- Create (only if building): `/Users/kulapard/projects/pi-laconic/extensions/mcp-shrink.*` + tests

- [x] record the gap: upstream caveman ships a `caveman-shrink` MCP middleware; there is NO `caveman-shrink` code on disk (the only "shrink" reference is tagline prose in `laconic-compress/README.md`). The Pi impl instead uses the Python `laconic-compress` toolkit — but note plainly that compress is **also Claude-bound** (`call_claude`), so "Pi-native" means "invoked via a Pi skill/command", NOT "model-independent" — done: recorded as the canonical decision record in `docs/audit.md` §12 (gap + honest Claude-bound caveat stated plainly)
- [x] **decision** (default: document the Python compress toolkit as the Pi equivalent and mark MCP-shrink out of scope): only if the user wants MCP parity, confirm Pi MCP support and whether an MCP tool may call a model, then add `shrink()` (TDD, verbatim-preserving) and register it — done: took the DEFAULT. Documented the Python `laconic-compress` toolkit (invoked via `/laconic-compress`) as the Pi equivalent; MCP `caveman-shrink` marked OUT OF SCOPE for v0.1.0. Non-default branch NOT taken (user did not request it); no MCP tool built — a model-calling MCP tool would only duplicate the existing compress skill behind a different transport
- [x] update Acceptance Criteria + README to state the chosen position — done: Acceptance Criteria tweaked to state the Task 7 decision (out of scope for v0.1.0) and point at `docs/audit.md` §12. README position recorded in `docs/audit.md` §12 as the canonical text **for Task 9 to carry into the root `README.md`** (root README does not exist yet — created in Task 9, per plan)
- [x] if built: tests RED→GREEN; if documented: no code (decision deliverable) — done: documented path → no code, no tests; no `extensions/mcp-shrink.*` created

### Task 8: laconic-crew Pi-compatibility (depends on Task 1's subagent finding)

**Files:**
- Modify: `/Users/kulapard/projects/pi-laconic/skills/laconic-crew/SKILL.md` + `README.md`
- Modify: `/Users/kulapard/projects/pi-laconic/agents/laconic-builder.md`, `laconic-investigator.md`, `laconic-reviewer.md`

> ⚠️ **Gate on Task 1**: if Pi has no `agents/` subagent mechanism, the whole laconic-crew premise ("spawn subagent, compressed tool-result into main context") may not be portable — in that case mark laconic-crew **optional/out-of-scope** and say so in its README rather than rewording into something that does not run.

- [x] **frontmatter**: the three `laconic-crew-*.md` use Claude Code frontmatter (`tools: [Read, Edit, Write, Grep, Glob]`, `model: haiku`) — convert to Pi's agent format (or remove) per the Task-1 finding — done: removed the Claude-Code `tools:`/`model:` lines from all three; kept minimal accurate frontmatter (`name` + `description` only) and added a "Reference persona — not wired into Pi" note to each (Pi 0.80.2 has no `agents/` mechanism, per Task 1 / audit §6). Lowercased in-body tool names to Pi built-ins (`read`/`edit`/`bash`/`grep`)
- [x] **phantom example**: `laconic-investigator.md`'s example cites `hooks/laconic-config.js:81`, `hooks/laconic-mode-tracker.js`, `hooks/laconic-activate.js`, `tests/test_symlink_flag.js` — none exist; replace with a real example from this repo (e.g. `extensions/laconic.ts`) — done: replaced with a real "where mode normalized + injected?" example using verified symbols/lines from this repo (`extensions/laconic-core.ts:26` `normalizeMode`, `:41` `modeInstructions`; callers `extensions/laconic.ts:52,78,160`; tests `tests/extension.test.mjs`)
- [x] **presets**: `laconic-crew/SKILL.md`+README reference Claude Code subagent presets (`Explore`, `Code Reviewer`, `feature-dev:code-architect`) and tool names — reword to Pi's mechanism + lowercase built-ins (`read`/`write`/`edit`/`bash`/`grep`), or mark optional per the gate — done: reworded all preset references to plain "(uncompressed) prose agent" language (no `Explore`/`Code Reviewer`/`feature-dev:`); added an "Optional — requires an external Pi subagent capability" banner to both `laconic-crew/SKILL.md` and `README.md` per the Task-1 gate (Pi core has no subagent mechanism; laconic-crew usable only with a future `pi-subagents`-style package)
- [x] add a content test asserting no laconic-crew file references `hooks/*.js`, `tests/test_symlink_flag.js`, Claude Code tool-array frontmatter, or the named Claude-only presets — done: `tests/laconic-crew-docs.test.mjs` (15 assertions) reads all 5 laconic-crew files and asserts absence of `hooks/`, `test_symlink_flag.js`, `feature-dev:`, a `tools: [` frontmatter line, `model: haiku`, and the `Explore`/`Code Reviewer` presets (whole-word)
- [x] run test — verify GREEN — done: `npm test` → pretest typecheck exit 0, then 46/46 pass (31 prior + 15 new laconic-crew-docs)

### Task 9: Root README, install path, and git init

**Files:**
- Create: `/Users/kulapard/projects/pi-laconic/README.md`
- Create: `/Users/kulapard/projects/pi-laconic/install.sh` (if a script is warranted beyond `pi -e`)
- Create: `/Users/kulapard/projects/pi-laconic/tests/readme.test.mjs`

- [x] write a failing test asserting `README.md` exists and contains a few **load-bearing** strings only (keep it non-brittle): the Task-1-confirmed install command, the mode names, and the `/laconic` command — not full prose — done: `tests/readme.test.mjs` (4 tests) asserts README exists and contains `pi -e`, the mode names (`lite`/`full`/`ultra`/`wenyan`), and `/laconic`; no prose asserted
- [x] run test — verify RED — done: RED was `ENOENT` on `README.md` (file did not exist) for all four assertions
- [x] author `README.md`; add `install.sh` only if Task 1 showed Pi needs more than `pi -e <path>` (idempotent; prints the activation line) — done: authored root `README.md` (what pi-laconic is, `pi -e` + package `pi`-block install with the no-origin-remote/local-package note, six modes, all commands, natural-language activation/deactivation, session-scoped reset behavior, `laconic:<mode>` statusline, the Task-7 MCP-shrink-out-of-scope / compress-is-the-Claude-bound-Pi-equivalent position from audit §12, upstream JuliusBrussee/caveman attribution, MIT). **No `install.sh` created** — Task 1 (audit §2/§9) confirmed `pi -e <file>` is sufficient; a config-editing installer is unwarranted, so the optional checkbox does not apply. No phantom features documented (no hooks, no ⛏ badge, no token tracking)
- [x] `git init`, add a sensible first commit (normal commit message; not in laconic style) — repo already initialized (done in setup): `git status` works on branch `pi-laconic`; not re-running `git init`/reset. First commit is the normal-style commit made by this task
- [x] run test — verify GREEN — done: `npm test` → pretest typecheck exit 0, then 50/50 pass (4 new readme + 46 existing)

### Task 10: Verify acceptance criteria
- [x] verify every Acceptance Criterion is met (manifest, typecheck, tests, reconciled features, verbatim preservation, README, git) — done: `package.json` pi block correct (`type:module`, `keywords`⊇`pi-package`, `pi.extensions:["./extensions/laconic.ts"]` at confirmed path, `pi.skills:["./skills"]`, scripts wired incl. `pretest`→typecheck); typecheck exit 0; `npm test` 50/50; `.venv/bin/pytest` 58/58; stats/statusline + MCP-shrink reconciled (README §Statusline + §"Compression vs. upstream MCP shrink" match audit §12); root `README.md` present (5.1k); repo under git on branch `pi-laconic`
- [x] run full suites: `npm run typecheck && npm test && pytest skills/laconic-compress` — done: `typecheck=0`, `npm_test=0` (50 pass), `pytest=0` (58 pass, run as `.venv/bin/pytest skills/laconic-compress` since pytest lives in the repo venv)
- [x] no UI e2e suite (terminal agent) — confirm N/A; rely on the Post-Completion manual Pi smoke test — done: N/A. `tests/` holds only unit + content suites (manifest/extension/readme/stats-docs/laconic-crew-docs); Pi is a terminal agent so live banner/statusline behavior stays a Post-Completion manual smoke test
- [x] **phantom-reference sweep**: `grep -rn` the repo for `hooks/`, `test_symlink_flag`, `decision: "block"`, `⛏`, `Explore`, `feature-dev:` — confirm zero hits remain except where a feature was actually implemented for Pi — done: `grep -rn` (excluding node_modules/.venv/.git, the plan file, docs/audit.md, and the two assert-absence test files) → ZERO hits for all six patterns. Found + FIXED one extra phantom the task flagged: `skills/laconic-help/SKILL.md` documented an unimplemented `LACONIC_DEFAULT_MODE` env var + `~/.config/laconic/config.json` (extension reads neither — verified no `process.env`/config read in `extensions/`); reworded SKILL.md "Configure Default Mode" → "Mode lasts the session" and README.md line 7 to "no config file or env var". Re-ran `npm test` → 50/50 still green, frontmatter valid
- [x] confirm each decision task (6, 7, 8) left the docs and Acceptance Criteria internally consistent — done: T6 (stats) — README/skill/audit all describe stats as on-demand model estimate + `laconic:<mode>` statusline (no hooks/badge/tracking); T7 (MCP shrink) — README §"Compression vs. upstream MCP shrink" = out-of-scope v0.1.0, compress is the Claude-bound Pi equivalent, matches audit §12 and Acceptance Criteria line 47; T8 (laconic-crew) — marked optional/out-of-scope, phantom refs stripped, matches audit §6. No contradictions across README/skill docs/audit.md/plan

### Task 11: Finalize documentation
- [x] ensure `docs/audit.md` reflects final decisions; update skill READMEs touched by Tasks 6–8 — done: added `docs/audit.md` §13 (closing) recording plan-executed-to-completion, the four key decisions (stats → on-demand model estimate + `laconic:<mode>` statusline; MCP shrink out of scope v0.1.0; laconic-crew optional — Pi has no subagent mechanism; laconic-help config phantom removed), and final test counts (50 JS, 58 Python, typecheck exit 0). Verified `skills/laconic-stats/README.md` and `skills/laconic-crew/README.md` read coherently with their SKILL.md and the root README — already consistent (no wholesale rewrite; no edits needed)
- [x] note any Pi-specific patterns worth recording for future work — done: recorded in `docs/audit.md` §13 ("Pi-specific patterns worth recording"): manifest resource types (no `agents`), extension paths resolved relative to package dir, the `import type` test-friendliness invariant + `laconic-core.ts` extraction, session-scoped state (not cross-session files), statusline is an indicator not a metrics surface, and the non-interactive `pi -e … --print` load check
- [x] move this plan to `docs/plans/completed/` (create dir if needed) — [x] (harness moves the plan after all phases — not moved here)

## Post-Completion
*Items requiring manual intervention or external systems — no checkboxes, informational only*

**Manual verification**
- Install into the real Pi (`pi -e /Users/kulapard/projects/pi-laconic` or the confirmed mechanism) and launch a session; confirm `/laconic ultra` switches mode, responses compress, the statusline shows `laconic:<mode>`, and "normal mode"/"stop laconic" disables it.
- Open a new session and confirm mode resets to `off` (session-scoped design) and restores correctly after `/reload`.
- Run `/laconic-compress <a markdown file>` and confirm code/URLs/paths survive verbatim.

**External system updates**
- Publish `pi-laconic` to wherever Pi sources packages, if distribution is desired.
- Optionally open an upstream PR to JuliusBrussee/caveman adding Pi as a supported agent, reusing this package.
- Re-run the smoke test against new Pi / SDK releases (the `@earendil-works/pi-coding-agent` API surface may change).
