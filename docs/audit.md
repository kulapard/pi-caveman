# Pi Laconic — Implementation Audit (Task 1)

Discovery deliverable for plan `docs/plans/20260628-pi-laconic.md`. Records the
actual on-disk state, confirms Pi load mechanics, catalogues every phantom
Claude-Code reference (with file + line) for Tasks 6 and 8, and gates Tasks 2,
8, and 9.

Date: 2026-06-28. Auditor: automated discovery pass.

---

## 1. Toolchain & SDK (confirms Task 2 inputs)

| Tool | Version | Notes |
|------|---------|-------|
| `pi` CLI | **0.80.2** | shell function → `PI_CODING_AGENT_DIR=~/.pi/agent-base command pi` |
| node | **v26.3.0** | `--experimental-strip-types` + `node --test` both available |
| npm | **11.16.0** | |
| python3 | **3.14.5** | present |
| **pytest** | **NOT installed** | `python3 -m pytest` → "No module named pytest". Task 5 must install it. |

### SDK: `@earendil-works/pi-coding-agent@0.80.2`
- **Not in this repo's `node_modules`** (no local install yet). Installed globally at
  `/Users/kulapard/.local/share/fnm/node-versions/v26.3.0/installation/lib/node_modules/@earendil-works/pi-coding-agent`.
- **ESM-only**: `package.json` has `"type": "module"` and `"exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }` — there is **no `require`/CJS entry**. `package.json` must declare `"type": "module"`.
- Ships `dist/index.d.ts` (typed). Pre-1.0 → pin `^0.80.2` in devDependencies (API churn expected; flagged in Post-Completion).
- **Extension API surface used by `extensions/laconic.ts` all exists in the SDK types** (`dist/core/extensions/types.d.ts`): `registerCommand`, `appendEntry`, `sendMessage`, `sendUserMessage`, `ctx.ui.setStatus`, `ctx.ui.notify`, `ctx.hasUI`, `ctx.sessionManager` (+ `getBranch`). Event names `before_agent_start`, `session_start`, `input` are all valid (present in `types.d.ts` and `runner.js`).
- The extension imports `ExtensionAPI`/`ExtensionContext` as **`import type`** (line 1–4 of `laconic.ts`) — erased by `--experimental-strip-types`, so the pure-logic and fake-`pi` handler tests need no installed SDK at runtime. **Invariant for Task 4**: if `laconic.ts` ever adds a *value* import from the SDK, the handler tests must mock the module.

---

## 2. Pi load mechanics — CONFIRMED (gates Tasks 2 & 9)

### How `pi` loads a package's extensions
From the SDK loader (`dist/core/extensions/loader.js`):
- `readPiManifest(packageJsonPath)` reads `package.json` and returns its `pi` object if `pkg.pi` is a non-null object.
- `resolveExtensionEntries(dir)` checks `package.json` **first**: if `manifest.extensions` has entries, each is resolved with `path.resolve(dir, extPath)` and kept if the file exists. Falls back to `index.ts`/`index.js` only if no manifest entries.

**Conclusion**: `pi.extensions: ["./extensions/laconic.ts"]` is honored **at its current path** — Pi resolves it relative to the package dir. **The file does NOT need to move to `.pi/extensions/`.** The plan's fallback (move to `.pi/extensions/`) is unnecessary.

### Manifest resource types Pi actually understands
`ResolvedPaths` (`dist/core/package-manager.d.ts`) has exactly: **`extensions`, `skills`, `prompts`, `themes`**. There is **NO `agents` resource type** and **no `pi.agents` manifest field**. This is the gating fact for Task 8 (see §6).

So the manifest should declare only `pi: { extensions: [...], skills: ["./skills"] }`. `agents/` is not a Pi-loadable resource directory.

### Concrete non-interactive load test (performed)
- `node --experimental-strip-types --check extensions/laconic.ts` → **exit 0** (parses clean against strip-types).
- Live `pi` load, non-interactive:
  ```
  PI_CODING_AGENT_DIR=~/.pi/agent-base PI_OFFLINE=1 command pi \
    -e /Users/kulapard/projects/pi-laconic/extensions/laconic.ts \
    --offline --no-session --no-tools --print "/laconic-help"
  ```
  → **exit 0, no errors.** The extension loaded and the `/laconic-help` slash command was processed without throwing (slash command needs no provider call).
- ⚠️ The `--verbose` variant **hangs** (it blocks on the interactive TUI). Driving the interactive TUI from a non-interactive shell hangs the session, so the **full interactive smoke test (banner injection, `/laconic ultra` switching response style, statusline `laconic:<mode>`) is deferred to Post-Completion**. Recommended manual command for that smoke test:
  ```
  PI_CODING_AGENT_DIR=~/.pi/agent-base command pi -e /Users/kulapard/projects/pi-laconic/extensions/laconic.ts
  # then in the TUI:  /laconic-help   /laconic ultra   (ask a question)   stop laconic
  ```

**Verified statically + via clean non-interactive exit; live TUI smoke deferred to Post-Completion.**

### Install path for the README (Task 9)
- Dev / local: `pi -e /Users/kulapard/projects/pi-laconic` is NOT a directory form for `-e` (`-e` takes a file). The package forms are:
  - `pi install <source>` (adds to settings; source = local path or git/npm).
  - Or `pi -e ./extensions/laconic.ts --skill ./skills` for a one-off load.
- Because the manifest mechanism is honored, the natural install is `pi install /Users/kulapard/projects/pi-laconic` (package dir with `package.json` `pi` block). **No `install.sh` is required beyond documenting `pi install <path>`** — Task 9's `install.sh` is optional and can be skipped.

---

## 3. Extension (`extensions/laconic.ts`, 230 lines) — purpose & state

Default export `laconicExtension(pi: ExtensionAPI)`. Design (matches plan Overview — **do not rebuild**):
- **Modes**: `lite | full | ultra | wenyan-lite | wenyan-full | wenyan-ultra` (+ `off`). `VALID_MODES` set.
- **`normalizeMode(raw)`**: empty→`full`; `off|stop|normal|normal-mode|disable|disabled`→`off`; `wenyan|classical`→`wenyan-full`; valid mode→itself; else→`undefined`.
- **`modeInstructions(mode)`**: returns `base` (contains the literal `LACONIC MODE ACTIVE`) + per-mode line.
- **Activation/deactivation regexes** (module-private):
  - `ACTIVATION_RE = /\b(laconic mode|talk like laconic|use laconic|less tokens|fewer tokens|save tokens)\b/i`
  - `DEACTIVATION_RE = /\b(stop laconic|normal mode|disable laconic)\b/i`
- **State = session-scoped**: `persistMode` sets local `mode`, calls `pi.appendEntry("laconic-mode", {mode, timestamp})`, then `setStatus`. On `session_start` mode resets to `off`, then replays the branch (`ctx.sessionManager.getBranch()`) restoring the **last** `laconic-mode` custom entry. Resets to `off` each new session **by design** — NOT cross-session files.
- **Statusline**: `setStatus` guarded by `ctx?.hasUI`; sets `laconic:<mode>` or clears (`undefined`) when off.
- **Commands**: `/laconic` (with `getArgumentCompletions`), `/laconic-help` (sends `HELP_TEXT`), `/laconic-commit`, `/laconic-review`, `/laconic-compress` (errors if no arg), `/laconic-stats`. The latter four delegate via `pi.sendUserMessage("/skill:<name> ...")`.
- **`input` handler**: ignores `event.source === "extension"`; `DEACTIVATION_RE` → off; if `mode==="off"` and `ACTIVATION_RE` → `full`.
- **`before_agent_start`**: returns `undefined` if off; else appends `modeInstructions(mode)` to `event.systemPrompt`.

**Testability gap (Task 4)**: `normalizeMode`, `modeInstructions`, `VALID_MODES`, `ACTIVATION_RE`, `DEACTIVATION_RE`, `HELP_TEXT` are module-private (not exported). Extract to `extensions/laconic-core.ts` and import in `laconic.ts` so tests can import the pure logic directly.

**Bugs found**: none functional. The extension is internally consistent and uses only real SDK APIs.

---

## 4. Skills — purpose, declared vs implemented

7 skills, each `SKILL.md` (frontmatter `name` + trigger-phrase `description`) + `README.md`.

| Skill | Purpose | Declared-but-unimplemented / residue |
|-------|---------|--------------------------------------|
| `laconic` | Persistent terse-output mode; 6 intensities + auto-clarity. Pure prompt. | Clean. (`/laconic wenyan` shorthand handled by `normalizeMode` — OK.) |
| `laconic-commit` | Terse Conventional Commits generator. Pure prompt. | Clean (mentions "Generated with Claude Code" only as a *negative* — "do NOT add"). |
| `laconic-review` | One-line-per-finding PR review. Pure prompt. | Clean. |
| `laconic-compress` | Compress prose memory files in place via Python CLI (`python3 -m scripts <file>`), backup `FILE.original.md`. | **Real backend** (see §5). `README.md:13` still calls it "A Claude Code skill" (branding). `README.md:58` links `../../docs/assets/dancing-rock.svg` (asset may not exist — verify). Backend is **Claude-bound** (`call_claude`). |
| **`laconic-stats`** | Claims real per-session token usage + savings read from session log, injected by a hook. | **Entirely phantom on Pi** — see §7. No tracking exists. Plan Task 6 reconciles. |
| `laconic-help` | One-shot cheat-sheet of modes/skills/commands. | Declares (`SKILL.md:44–59`) a default-mode config mechanism: env `LACONIC_DEFAULT_MODE`, `~/.config/laconic/config.json`, resolution order `env > file > full`. **No Pi code reads these** — the extension always resets to `off` on `session_start`. Doc-only claim; reconcile or drop (relates to Task 6 scope; flag for Task 9 README). Also advertises `/laconic-stats`. |
| **`laconic-crew`** | Decision guide for delegating to 3 laconic subagent presets. | **Depends on a subagent mechanism Pi lacks** — see §6. Phantom presets `Explore`/`Code Reviewer`/`feature-dev:code-architect`. Plan Task 8. |

---

## 5. Python compress toolkit (`skills/laconic-compress/scripts/`)

`scripts/` **is a package** (`__init__.py`, `__version__ = "1.0.0"`, `__all__ = ["cli","compress","detect","validate"]`). Internal imports are **relative** (`from .detect import …`, `from .validate import …`), so tests must import as a package (e.g. `from scripts.compress import …` with repo/skill dir on `sys.path`), not as loose top-level modules. `validate.py` and `detect.py` carry no intra-package relative imports, so they are also importable standalone.

Entry points: `cli.py:main` (console `laconic <filepath>`) and `python -m scripts` (`__main__.py` → `from .cli import main`). `validate.py`/`detect.py`/`benchmark.py` each have their own `__main__` blocks. `compress.py` has relative imports + no `__main__`, so it is import-only.

### `compress.py` — pure vs model-bound (gates Task 5 test plan)
- **`call_claude(prompt) -> str`** (line 122): **LIVE MODEL CALL.** Tries Anthropic SDK first if `ANTHROPIC_API_KEY` set (`anthropic.Anthropic().messages.create(model=os.environ.get("LACONIC_MODEL","claude-sonnet-4-5"), max_tokens=8192, …)`), else falls back to the `claude --print` CLI via `subprocess.run([claude_bin,"--print"], input=prompt, …)`. **This is why compression is NOT unit-tested for a ratio** — non-hermetic, `claude`/key may be absent.
- **Pure / deterministic helpers** (unit-testable, no model):
  - `split_frontmatter(text)` (28) — split YAML frontmatter from body; regex only.
  - `backup_dir_for(filepath) -> Path` (69) — platform-aware out-of-tree backup dir; reads env (`%LOCALAPPDATA%`/`$XDG_DATA_HOME`/`~/.local/share`); deterministic given env; no file I/O.
  - `is_sensitive_path(filepath) -> bool` (93) — denylist of secret/PII basenames, sensitive components (`.ssh`/`.aws`/`.gnupg`/`.kube`/`.docker`), name tokens.
  - `strip_llm_wrapper(text) -> str` (106) — strip an outer ```` ```markdown ``` ```` fence wrapping whole output.
  - `build_compress_prompt` (171), `build_fix_prompt` (190) — pure f-string assembly.
- **`compress_file(filepath) -> bool`** (222) — orchestrator. **No-Claude early-return branches** (testable via monkeypatched `call_claude`, or reached before it):
  1. missing file → `FileNotFoundError` (226–227)
  2. oversize (`> MAX_FILE_SIZE = 500_000`) → `ValueError` (228–229)
  3. sensitive path → `ValueError` refusal (235–241)
  4. not natural language (`not should_compress`) → prints skip, `return False` (245–247)
  5. empty/whitespace file → `return False` (257–259)
  6. backup already exists → `return False`, abort (262–266)
  7. empty body after frontmatter removal → `return False` (275–277)
  - Post-`call_claude` (need monkeypatch): empty-response abort (283–286), **identical-output abort** (290–294), backup-write-verify failure (305–312), validate/retry loop (`MAX_RETRIES`).

### `validate.py`
- `class ValidationResult` (16): `is_valid` (default True), `errors`, `warnings`; `add_error` (flips `is_valid` False), `add_warning`.
- `extract_code_blocks(text)` (41), `extract_urls(text)` (85, returns set of `https?://…`), `extract_inline_codes(text)` (97, strips fences then inline `` `…` ``). All pure.
- `validate(original_path, compressed_path) -> ValidationResult` (173) — reads both files, runs 6 validators; **code-block / url / inline-code / heading-count mismatches are ERRORS** (verbatim guarantee); heading text/order, path, bullet-count, inline-add are warnings. This is the unit under test for "doctored compression drops a code line / URL / inline code → flagged".

### `detect.py`
- `detect_file_type(filepath) -> str` (62) → `natural_language|code|config|unknown`; extension-first, content heuristics for extensionless.
- `should_compress(filepath) -> bool` (100) → `is_file()` and not `*.original.md` and type == `natural_language`.

**Task 5 test plan confirmed**: cover `validate` (verbatim-drop detection), `detect` (classification), `compress.py` pure helpers, and `compress_file` no-Claude branches via monkeypatched `call_claude`. Do NOT write a ratio/idempotency test.

---

## 6. Pi subagent support — CONFIRMED ABSENT (gates Task 8)

- Pi's resource model (`ResolvedPaths`) has **no `agents` type** and the manifest reader has **no `pi.agents` field**. Grep of the SDK dist for `subagent|registerAgent|defineAgent|spawnSubagent|agentPreset` → **no matches** (the only `agents` hits are `~/.agents/skills` trust-dir paths, unrelated).
- Therefore the `agents/laconic-crew-*.md` files are **not loaded by Pi as subagent presets**. The laconic-crew premise ("spawn subagent → compressed tool-result into main context") has **no host mechanism in Pi 0.80.2**.

**Decision for Task 8 (recommended): mark laconic-crew OPTIONAL / OUT-OF-SCOPE for the Pi package.** Do not reword the `.md` files into something Pi cannot run. Task 8 should:
- State in `laconic-crew/README.md` that Pi (0.80.2) has no subagent-preset mechanism, so laconic-crew is not wired in; keep the files as design notes / future work (e.g. if `pi-subagents` or a future Pi feature lands).
- Still strip the **phantom Claude-Code references** from the laconic-crew files (frontmatter `tools:`/`model:`, the `hooks/*.js` + `tests/test_symlink_flag.js` example, the `Explore`/`Code Reviewer`/`feature-dev:*` presets) so the phantom-reference sweep (Task 10) passes — replace the investigator example with a real one from this repo (e.g. `extensions/laconic.ts`).
- Do NOT add `agents/` to the manifest.

---

## 7. PHANTOM Claude-Code reference catalogue (gates Tasks 6 & 8)

Every reference to a Claude-Code architecture that does not exist on Pi (no `hooks/` dir, no `.js` files, no `decision:"block"` API, no session-log reader, no `⛏` badge, no subagent presets). File + line + content.

### laconic-stats (Task 6) — the heaviest concentration
| File:Line | Content |
|-----------|---------|
| `skills/laconic-stats/SKILL.md:5` | `Reads directly from the Claude Code session log — no AI estimation.` (frontmatter description) |
| `skills/laconic-stats/SKILL.md:10` | delivered by `hooks/laconic-stats.js`, read by `hooks/laconic-mode-tracker.js` on `/laconic-stats`; "the hook returns `decision: "block"` with the formatted stats as the reason." |
| `skills/laconic-stats/README.md:7` | "Reads the current Claude Code session log directly … Numbers come from the JSONL session log on disk … Output is injected by the `laconic-mode-tracker` hook, which intercepts `/laconic-stats` and returns the formatted stats as a blocked-decision reason." |
| `skills/laconic-stats/README.md:9` | "Each run also writes a lifetime-savings suffix file used by the statusline badge (`⛏ 12.4k`)." |

Phantom items in laconic-stats: `hooks/laconic-stats.js`, `hooks/laconic-mode-tracker.js`, `decision: "block"`, "Claude Code session log" / JSONL session-log reader, "lifetime-savings suffix file", `⛏` statusline badge. **None exist on Pi.** No token tracking exists anywhere in the extension. → Task 6 default: rewrite BOTH files to reality (manual/skill-driven estimate; statusline is `laconic:<mode>`; no hooks/log/badge).

### laconic-crew skill (Task 8) — Claude-Code subagent presets
| File:Line | Content (abridged) |
|-----------|--------------------|
| `skills/laconic-crew/SKILL.md:7` | frontmatter desc: "work inline or using vanilla `Explore`. Subagent output is laconic-compressed" |
| `skills/laconic-crew/SKILL.md:14` | "Same job as Anthropic defaults (`Explore`, edit-style agents, reviewer)…" |
| `skills/laconic-crew/SKILL.md:21` | table row → `Explore` (vanilla) |
| `skills/laconic-crew/SKILL.md:23` | table row → `feature-dev:code-architect` |
| `skills/laconic-crew/SKILL.md:25` | table row → `Code Reviewer` (vanilla) |
| `skills/laconic-crew/SKILL.md:32` | "A vanilla `Explore` that returns 2k tokens … `laconic-investigator` returns ~700 tokens." |
| `skills/laconic-crew/SKILL.md:77` | "Use `Code Reviewer` for that." |
| `skills/laconic-crew/README.md:17` | "Use vanilla `Explore` or `Code Reviewer` when you want prose…" |

### agents/laconic-crew-*.md (Task 8) — Claude-Code frontmatter + phantom example
| File:Line | Content |
|-----------|---------|
| `agents/laconic-builder.md:9` | `tools: [Read, Edit, Write, Grep, Glob]` (Claude-Code frontmatter; no `model:`) |
| `agents/laconic-investigator.md:7` | description references `vanilla Explore` |
| `agents/laconic-investigator.md:8` | `tools: [Read, Grep, Glob, Bash]` |
| `agents/laconic-investigator.md:9` | `model: haiku` |
| `agents/laconic-investigator.md:49` | example: `hooks/laconic-config.js:81 — safeWriteFlag — atomic write w/ O_NOFOLLOW` |
| `agents/laconic-investigator.md:50` | example: `hooks/laconic-config.js:160 — readFlag — paired reader` |
| `agents/laconic-investigator.md:52` | example: `hooks/laconic-mode-tracker.js:33,87` |
| `agents/laconic-investigator.md:53` | example: `hooks/laconic-activate.js:40` |
| `agents/laconic-investigator.md:55` | example: `tests/test_symlink_flag.js — 12 cases` |
| `agents/laconic-reviewer.md:8` | `tools: [Read, Grep, Bash]` |
| `agents/laconic-reviewer.md:9` | `model: haiku` |

(Frontmatter `tools:`/`model:` are Claude-Code conventions; Pi does not load `agents/` at all — §6. The `hooks/*.js` and `tests/test_symlink_flag.js` citations in `laconic-investigator.md` are a *worked example*, not real files; replace with a real example such as `extensions/laconic.ts`.)

### Phantom strings NOT found (clean)
- `tests/test_symlink_flag.js` appears **only** in `agents/laconic-investigator.md:55` (an example) — **not** under `skills/`.
- No Read/Edit/Write/Grep/Glob tool-array prose inside skill bodies.
- No `⛏`, `decision:"block"`, `hooks/`, or session-log refs in any skill other than `laconic-stats`, and none in the extension or Python.

**Task 10 sweep targets**: `grep -rn -E 'hooks/|test_symlink_flag|decision.*block|⛏|Explore|Code Reviewer|feature-dev'` over the repo must hit zero after Tasks 6 & 8 (except anything actually implemented for Pi — none planned).

---

## 8. MCP `caveman-shrink` parity (gates Task 7)

- Upstream caveman ships a `caveman-shrink` MCP middleware. **No `caveman-shrink` code exists on disk** here; the only "shrink" reference is tagline prose in `laconic-compress/README.md`.
- The Pi equivalent is the Python `laconic-compress` toolkit — but note plainly it is **also Claude-bound** (`call_claude`). "Pi-native" here means "invoked via a Pi skill/command", **not** "model-independent".
- **Recommended Task 7 decision: document the Python compress toolkit as the Pi equivalent; mark MCP-shrink OUT OF SCOPE.** (Pi does have MCP support via `--mcp-config`, but building a new MCP tool that also calls a model adds no capability over the existing compress skill.)

---

## 9. Concrete gap set & task-list confirmation

The plan's task list is correct. Adjustments / confirmations from discovery:

- **Task 2**: declare `pi: { extensions: ["./extensions/laconic.ts"], skills: ["./skills"] }` — **path confirmed honored, no `.pi/extensions/` move needed** (§2). `"type":"module"`, `keywords ⊇ ["pi-package"]`. Run `npm install` to fetch SDK + typescript locally (currently absent).
- **Task 3**: tsconfig `module: nodenext`, `strict`, `noEmit`, include `extensions/**/*.ts`. SDK types resolve from `node_modules` after Task 2's install.
- **Task 4**: extract pure helpers to `laconic-core.ts`; preserve the `import type` invariant (no runtime SDK needed for tests).
- **Task 5**: **install pytest first** (not present). Test only deterministic pieces (§5). The pyc files under `scripts/__pycache__/` should be gitignored.
- **Task 6**: rewrite laconic-stats SKILL.md + README.md to reality (no tracking exists). Also consider the laconic-help default-mode config claim (`LACONIC_DEFAULT_MODE` / `~/.config/laconic/config.json`) which has no Pi implementation — flag for correction.
- **Task 7**: document Python compress as the Pi equivalent; MCP-shrink out of scope.
- **Task 8**: **laconic-crew is optional/out-of-scope** — Pi has no subagent mechanism (§6). Strip phantom refs from the 3 agent files + the laconic-crew skill regardless, so the Task 10 sweep passes; do NOT add `agents/` to the manifest.
- **Task 9**: install command = `pi install <package-dir>` (manifest honored). `install.sh` optional — `pi install` suffices.
- Repo **is already a git repo** on branch `pi-laconic` (plan's Context said "not a git repo"; it has since been initialized). Task 9's `git init` is effectively done — only the first commit / `.gitignore` remain. A `.gitignore` already exists at repo root (verify contents in Task 2).

---

## 10. Live smoke test — deferred (Post-Completion)

The interactive TUI smoke test (auto-activation banner, `/laconic ultra` response compression, statusline `laconic:<mode>`, "stop laconic" disable, session reset, `/laconic-compress` verbatim survival) requires the live interactive `pi` binary and cannot be driven from a non-interactive shell without hanging. **Verified statically + via a clean non-interactive `--print "/laconic-help"` exit (code 0).** Run manually:

```
PI_CODING_AGENT_DIR=~/.pi/agent-base command pi -e /Users/kulapard/projects/pi-laconic/extensions/laconic.ts --skill /Users/kulapard/projects/pi-laconic/skills
# /laconic-help ; /laconic ultra ; ask something ; "stop laconic" ; open new session → expect off
# /laconic-compress <a markdown file> → confirm code/URLs/paths verbatim
```

---

## 11. Task 5 — Python test setup (pytest install command)

`pytest` was NOT installed. Installed into an isolated repo-root venv. The
project pip config points at the ANNA Nexus mirror (`nexus.infra.anna.money`),
which timed out; installing from the public PyPI index directly succeeded:

```
python3 -m venv .venv
.venv/bin/pip install --no-cache-dir --isolated --index-url https://pypi.org/simple pytest
```

`.venv/` and `.pytest_cache/` are gitignored. Run the suite with:

```
.venv/bin/pytest skills/laconic-compress        # plan's test:py command
```

A real bug surfaced and was fixed in `detect.py`: a bare `.env` file has an
empty `Path.suffix`, so the `SKIP_EXTENSIONS` (`.env`) check never matched and
`detect_file_type` content-sniffed it as `natural_language` (→ `should_compress`
True). Now leading-dot files whose full name is a known skip/config name are
classified by filename first, so `.env` → `config`. (`compress_file` already had
a second safety net via `is_sensitive_path`, which still refuses `.env`.)

---

## 12. Task 7 decision — MCP `caveman-shrink` parity (DECISION RECORD)

This is the canonical decision record for Task 7. (Section 8 above is the
discovery/gating note; this section is the final, recorded decision and is the
text Task 9's root `README.md` must carry — see below.)

### The gap
- Upstream caveman (JuliusBrussee/caveman) ships a **`caveman-shrink` MCP
  middleware** that sits between the agent and the model to shrink payloads.
- **pi-laconic has none.** There is **NO `caveman-shrink` code anywhere on
  disk** — grep for `shrink` returns only tagline prose
  (`skills/laconic-compress/README.md:8`: "shrink memory file. save token every
  session.") and the analogy line in `skills/laconic-crew/SKILL.md:14` ("main
  context shrinks per delegation"). Neither is an MCP tool.

### The decision (DEFAULT — adopted)
- **The Python `laconic-compress` toolkit is the Pi equivalent of upstream's
  MCP shrink**, invoked via the `/laconic-compress` skill/command. MCP
  `caveman-shrink` is **OUT OF SCOPE for v0.1.0.**
- We did **NOT** build an MCP tool. The user did not request the non-default
  branch, and Pi MCP support (`--mcp-config`) notwithstanding, a new MCP tool
  that also calls a model would add **no capability** over the existing compress
  skill — it would only duplicate it behind a different transport.

### Honest caveat (state plainly)
- `laconic-compress` is **itself Claude-bound**: `compress.py` `call_claude()`
  performs compression via a live model call (Anthropic SDK if
  `ANTHROPIC_API_KEY` is set, else the `claude --print` CLI). So **"Pi-native"
  here means "invoked via a Pi skill/command", NOT "model-independent".** The Pi
  equivalence is one of *invocation surface*, not of *model independence*. This
  is the same nature as upstream's MCP shrink (also a model-mediated transform);
  the difference is only the integration mechanism (Pi skill vs MCP middleware).

### Consequences
- Plan **Acceptance Criteria** already reflects this (the MCP-`caveman-shrink`
  bullet: "does not exist — Python compress, itself Claude-bound, is the Pi
  equivalent unless a decision adds it"). Verified consistent — no edit needed.
- **Task 9 carry-over (action item)**: the root `README.md` created in Task 9
  must state this position explicitly — i.e. that `caveman-shrink` MCP
  middleware is out of scope and that `/laconic-compress` (Claude-bound, invoked
  via a Pi skill/command) is pi-laconic's equivalent. The root README does not
  exist yet (created in Task 9), so this text is recorded here as the canonical
  source for Task 9 to copy. **Carried over** — root `README.md`
  §"Compression vs. upstream MCP shrink" now states this position.
- **No code, no tests** for this task (decision deliverable). No
  `extensions/mcp-shrink.*` created.

---

## 13. Closing — plan executed to completion (Task 11)

The plan `docs/plans/20260628-pi-laconic.md` ran to completion. Tasks 1–10 are
all `[x]`; Task 11 (this finalization) wraps up the documentation.

### Final state
- **Packaging**: `package.json` declares `type: "module"`,
  `keywords ⊇ ["pi-package"]`, `pi: { extensions: ["./extensions/laconic.ts"],
  skills: ["./skills"] }` (extension path confirmed honored at its current
  location — no `.pi/extensions/` move). `tsconfig.json` (nodenext, strict,
  noEmit) typechecks the extension against the real SDK.
- **Tests**: extension/manifest/readme/stats-docs/laconic-crew-docs unit suites
  (`node --test`, strip-types) + a `pretest` typecheck gate; Python deterministic
  tests for the `laconic-compress` toolkit (`.venv/bin/pytest`).
- **Docs**: root `README.md` (install via `pi -e` / package manifest, six modes,
  commands, natural-language activation, session-scoped reset, `laconic:<mode>`
  statusline, MCP-shrink position, attribution + MIT). Skill SKILL.md/README
  pairs reconciled to reality; no phantom Claude-Code references remain.
- **Git**: repo under git on branch `pi-laconic`.

### Key decisions (final)
1. **Stats reconciled** (Task 6): no token meter exists — Pi does not expose
   per-turn usage to the extension. `/laconic-stats` is an **on-demand,
   model-driven estimate**; the statusline is a **`laconic:<mode>` mode
   indicator** (not a savings badge). No hooks/session-log/`⛏` badge — all
   phantom references removed.
2. **MCP `caveman-shrink` out of scope for v0.1.0** (Task 7): the Python
   `laconic-compress` toolkit (invoked via `/laconic-compress`) is the Pi
   equivalent. It is **itself Claude-bound** (`call_claude`), so "Pi-native"
   means *invoked via a Pi skill/command*, not *model-independent*. No MCP tool
   built (it would only duplicate compress behind a different transport).
3. **laconic-crew optional / out-of-scope** (Task 8): Pi 0.80.2 has **no subagent /
   `agents/` mechanism**. The three `agents/laconic-crew-*.md` files are kept as
   reference personas (design notes / future work), with Claude-Code
   frontmatter and the phantom `hooks/*.js` + `test_symlink_flag.js` example
   stripped. `agents/` is **not** added to the manifest.
4. **laconic-help config phantom removed** (Task 10 sweep): the documented
   `LACONIC_DEFAULT_MODE` env var + `~/.config/laconic/config.json` default-mode
   mechanism is read by no Pi code — the extension always resets to `off` on
   `session_start`. Both the SKILL.md and README were corrected to "mode lasts
   the session; no config file or env var".

### Final test counts (verified)
- **JS**: `npm test` → **50 passing** (manifest 7 + extension 21 + readme 4 +
  stats-docs 3 + laconic-crew-docs 15), preceded by the `pretest` typecheck.
- **Python**: `.venv/bin/pytest skills/laconic-compress` → **58 passing**.
- **Typecheck**: `npm run typecheck` (`tsc --noEmit`) exits **0** (clean).

### Pi-specific patterns worth recording (for future Pi packages)
- **Manifest resource types**: Pi's `ResolvedPaths` understands exactly
  `extensions`, `skills`, `prompts`, `themes`. There is **no `agents` type** and
  no `pi.agents` field — Claude-Code-style subagent presets do not port to Pi
  core. Declare only the resource types Pi actually loads.
- **Extension paths are resolved relative to the package dir** via
  `path.resolve(dir, extPath)` against the `package.json` `pi.extensions`
  entries (manifest checked before any `index.ts`/`index.js` fallback). No
  forced `.pi/extensions/` convention — declare the real path.
- **`import type` keeps the extension test-friendly**: importing the SDK as
  `import type` means `--experimental-strip-types` erases it, so pure-logic and
  fake-`pi` handler tests need no installed SDK at runtime. If any value import
  from the SDK is added later, those tests must mock the module. Extracting
  pure logic into a sibling `laconic-core.ts` (imported by the extension) lets
  tests import the logic directly without faking the SDK at all.
- **Session-scoped state**, not cross-session files: state lives in
  `pi.appendEntry(<key>, …)` and is restored by replaying
  `ctx.sessionManager.getBranch()` on `session_start` (taking the last matching
  entry). A new session starts clean by design — there is no global config to
  auto-enable behavior, and documenting one is a phantom.
- **Statusline**: `ctx.ui.setStatus(<id>, <text>)` guarded by `ctx.hasUI`;
  clear it by passing `undefined`. It is a string indicator, not a metrics
  surface — Pi does not hand per-turn token usage to extensions, so any
  "savings badge"/usage-meter feature has no host data to read.
- **Non-interactive load check**: `pi -e <ext>.ts --print "/some-command"`
  exits 0 to confirm an extension loads and a slash command registers without
  hanging; the full interactive TUI (banner injection, response style,
  live statusline) cannot be driven from a non-interactive shell and stays a
  manual smoke test.
