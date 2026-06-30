# Prompt-only laconic-compress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Python `laconic-compress` toolkit with a prompt-only Pi skill (the Pi agent compresses files itself), removing all Python from the package.

**Architecture:** `SKILL.md` becomes the whole implementation — an instruction set the Pi agent follows (detect → backup → rewrite → self-validate → report) using its own model and file tools. The Python `scripts/` and pytest `tests/` are deleted; package wiring (`test:py`, `files` negations) and cross-references (root README, AGENTS.md) are cleaned up. Coverage is the repo's existing doc-guard tests.

**Tech Stack:** Markdown skills, Node test runner (`node --test` via `--experimental-strip-types`), `npm`.

## Global Constraints

- No Python anywhere in the package after this change — no `scripts/*.py`, no pytest, no `test:py`, no `python3 -m scripts` references in shipped docs.
- The `/laconic-compress` command and the skill's compression **rules** (Preserve EXACTLY / Preserve Structure / Compress / Boundaries) are kept — only the *execution mechanism* changes from Python CLI to agent instructions.
- Backups: write `<file>.original.<ext>` verbatim, never overwrite an existing backup, never compress a `*.original.*` file.
- Tests use string `includes`/regex assertions only — no new dependency.
- Full suite command: `npm test` (runs `pretest` → `tsc --noEmit`, then `node --test tests/**/*.test.mjs`). Must stay green.
- Commit messages end with the repo's `Co-Authored-By` trailer.

## File Structure

- `skills/laconic-compress/SKILL.md` — rewrite the `## Process` section to prompt-only; keep the rules sections.
- `skills/laconic-compress/README.md` — rewrite to drop Python/Requires/Security; redraw "How It Work" as agent-driven.
- `skills/laconic-compress/SECURITY.md` — **delete** (only documents the Python subprocess/Snyk rating).
- `skills/laconic-compress/scripts/` — **delete** (entire Python package).
- `skills/laconic-compress/tests/` — **delete** (pytest suite).
- `tests/compress-docs.test.mjs` — rewrite: keep existing guards, add no-Python-residue guards + a backup-step assertion.
- `tests/manifest.test.mjs` — drop the `test:py` assertions.
- `package.json` — remove `test:py` script and the `files` negations.
- `README.md` (root) — remove the Python venv test block; reword the MCP-shrink comparison paragraph.
- `AGENTS.md` — reword the two `compress.py`/`validate.py`/`call_claude` bullets; remove the Python-tests bullet.

---

### Task 1: Rewrite docs to prompt-only (SKILL.md, README.md, delete SECURITY.md) + docs test

**Files:**
- Modify: `tests/compress-docs.test.mjs` (rewrite)
- Modify: `skills/laconic-compress/SKILL.md` (replace `## Process`)
- Modify: `skills/laconic-compress/README.md` (rewrite Python-specific parts)
- Delete: `skills/laconic-compress/SECURITY.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a prompt-only `SKILL.md` whose `## Process` tells the agent to detect → backup `<file>.original.<ext>` → rewrite → self-validate → report. No later task depends on its exact wording.

- [ ] **Step 1: Rewrite the failing test `tests/compress-docs.test.mjs`**

Replace the entire file with:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const compressDir = join(repoRoot, "skills", "laconic-compress");

const files = ["SKILL.md", "README.md"];

// Wrong-provider framing and broken assets that must not regress.
const forbiddenSubstrings = [
	"claude code", // wrong-provider framing
	"docs/assets", // broken image path
	"dancing-rock", // broken image asset
];

// The skill is prompt-only — the Pi agent performs the compression. No Python
// toolkit, no external model CLI. These tokens must not appear in the docs.
const forbiddenPythonResidue = [
	"python3",
	"scripts/",
	"call_claude",
	"compress.py",
	"validate.py",
	"detect.py",
	"subprocess",
	"pytest",
	"anthropic_api_key",
	"claude --print",
];

for (const file of files) {
	test(`laconic-compress/${file} has no Claude-Code / plugin-install residue`, () => {
		const content = readFileSync(join(compressDir, file), "utf8");
		const lower = content.toLowerCase();
		for (const needle of forbiddenSubstrings) {
			assert.ok(
				!lower.includes(needle),
				`${file} must not reference "${needle}"`,
			);
		}
	});

	test(`laconic-compress/${file} has no Python-toolkit residue`, () => {
		const content = readFileSync(join(compressDir, file), "utf8");
		const lower = content.toLowerCase();
		for (const needle of forbiddenPythonResidue) {
			assert.ok(
				!lower.includes(needle),
				`${file} is prompt-only and must not reference "${needle}"`,
			);
		}
	});
}

test("laconic-compress/README.md does not document a plugin-based install path", () => {
	const content = readFileSync(join(compressDir, "README.md"), "utf8");
	assert.doesNotMatch(
		content,
		/install (the )?`?laconic`? (plugin|once)/i,
		"README must not document the Claude-Code plugin install path",
	);
});

test("SKILL.md documents the in-place backup step", () => {
	const content = readFileSync(join(compressDir, "SKILL.md"), "utf8");
	assert.match(
		content,
		/\.original\./,
		"SKILL.md must document the <file>.original.<ext> backup",
	);
});

test("the Python-only SECURITY.md is gone", () => {
	assert.ok(
		!existsSync(join(compressDir, "SECURITY.md")),
		"SECURITY.md documented the Python subprocess/Snyk rating and must be removed",
	);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test tests/compress-docs.test.mjs`
Expected: FAIL — current `SKILL.md` contains `python3`/`scripts/`, `README.md` contains `python3`/`Python`/`subprocess`, and `SECURITY.md` still exists.

- [ ] **Step 3: Replace the `## Process` section of `skills/laconic-compress/SKILL.md`**

In `skills/laconic-compress/SKILL.md`, replace the current `## Process` section (the block from `## Process` through the `4. Return result to user` line — i.e. the `python3 -m scripts` instructions) with:

```markdown
## Process

You (the Pi agent) perform the compression directly — there is no separate tool to run. Given `/laconic-compress <filepath>`:

1. **Skip backups.** If the path ends in `.original.<ext>` (e.g. `AGENTS.original.md`), stop — never compress a backup file.
2. **Check it is compressible** per **Boundaries** below: prose files (`.md`, `.txt`, `.rst`, `.typ`, `.typst`, `.tex`, or extensionless natural language). If it is code/config (`.py`, `.js`, `.ts`, `.json`, `.yaml`, …) or larger than ~500 KB, report it is out of scope and stop.
3. **Read** the file's full contents.
4. **Back up the original.** Write a verbatim copy to `<filename>.original.<ext>` (e.g. `AGENTS.md` → `AGENTS.original.md`), **only if that backup does not already exist** — never overwrite an existing `.original` backup.
5. **Rewrite** the file in place, applying the **Compression Rules** below. Treat code blocks, inline code, URLs, paths, commands, headings, and table structure as read-only regions.
6. **Self-validate** against the contents you read in step 3: every protected token — fenced and inline code, URLs, file paths, heading text, table structure, dates/version numbers — must be byte-for-byte identical. If any changed, fix just that region; if you cannot make it identical, restore the file from the `.original` backup and report the failure rather than leave a corrupted file.
7. **Report** the result: bytes before/after and the approximate reduction.

Only the rewrite needs the model (you); detection, backup, and validation are mechanical.
```

Leave every other section of `SKILL.md` (frontmatter, Purpose, Trigger, Compression Rules, Preserve EXACTLY, Preserve Structure, Compress, Pattern, Boundaries) unchanged.

- [ ] **Step 4: Rewrite `skills/laconic-compress/README.md`**

Replace the entire file with:

```markdown
<p align="center">
  <img src="https://em-content.zobj.net/source/apple/391/rock_1faa8.png" width="80" />
</p>

<h1 align="center">laconic-compress</h1>

<p align="center">
  <strong>shrink memory file. save token every session.</strong>
</p>

---

A Pi skill that compresses your project memory files (`AGENTS.md`, `CLAUDE.md`, todos, preferences) into laconic format — so every session loads fewer tokens automatically.

The agent reads its memory file (`AGENTS.md` / `CLAUDE.md`) on every session start. If file big, cost big. Laconic make file small. Cost go down forever.

## What It Do

```
/laconic-compress AGENTS.md
```

```
AGENTS.md          ← compressed (the agent reads this — fewer tokens every session)
AGENTS.original.md ← human-readable backup (you edit this)
```

Original never lost. You can read and edit `.original.md`. Run skill again to re-compress after edits.

## Benchmarks

Real results on real project files:

| File | Original | Compressed | Saved |
|------|----------:|----------:|------:|
| `claude-md-preferences.md` | 706 | 285 | **59.6%** |
| `project-notes.md` | 1145 | 535 | **53.3%** |
| `claude-md-project.md` | 1122 | 636 | **43.3%** |
| `todo-list.md` | 627 | 388 | **38.1%** |
| `mixed-with-code.md` | 888 | 560 | **36.9%** |
| **Average** | **898** | **481** | **46%** |

Headings, code blocks, URLs, and file paths preserved exactly.

## Before / After

<table>
<tr>
<td width="50%">

### 📄 Original (706 tokens)

> "I strongly prefer TypeScript with strict mode enabled for all new code. Please don't use `any` type unless there's genuinely no way around it, and if you do, leave a comment explaining the reasoning. I find that taking the time to properly type things catches a lot of bugs before they ever make it to runtime."

</td>
<td width="50%">

### <img src="https://em-content.zobj.net/source/apple/391/rock_1faa8.png" width="20" height="20" alt="rock"/> Laconic (285 tokens)

> "Prefer TypeScript strict mode always. No `any` unless unavoidable — comment why if used. Proper types catch bugs early."

</td>
</tr>
</table>

**Same instructions. ~60% fewer tokens in this example (46% average across the files above). Every. Single. Session.**

## Install

This skill ships inside the pi-laconic package. Load the package (see the
[root README](../../README.md) for the `pi -e … --skill …` / `pi install`
mechanism), then use `/laconic-compress` in a Pi session.

No extra runtime is required: the Pi agent performs the compression itself with
its own model and file tools — there is no separate tool or language to install.

## Usage

```
/laconic-compress <filepath>
```

Examples:
```
/laconic-compress AGENTS.md
/laconic-compress CLAUDE.md
/laconic-compress docs/preferences.md
/laconic-compress todos.md
```

### What files work

| Type | Compress? |
|------|-----------|
| `.md`, `.txt`, `.rst`, `.typ`, `.typst`, `.tex` | ✅ Yes |
| Extensionless natural language | ✅ Yes |
| `.py`, `.js`, `.ts`, `.json`, `.yaml` | ❌ Skip (code/config) |
| `*.original.md` | ❌ Skip (backup files) |

## How It Work

```
/laconic-compress AGENTS.md
        ↓
agent detects file type      (prose? else skip)
        ↓
agent backs up original  →  AGENTS.original.md   (verbatim, never overwritten)
        ↓
agent rewrites prose to laconic, code/URLs/paths left exact
        ↓
agent self-validates: protected tokens byte-identical to original
        ↓
if a protected token changed: fix it, or restore from backup and report
        ↓
write compressed  →  AGENTS.md
```

The agent does this with its own model and file tools — no external CLI, no separate runtime.

## What Is Preserved

Laconic compress natural language. It never touch:

- Code blocks (` ``` ` fenced or indented)
- Inline code (`` `backtick content` ``)
- URLs and links
- File paths (`/src/components/...`)
- Commands (`npm install`, `git commit`)
- Technical terms, library names, API names
- Headings (exact text preserved)
- Tables (structure preserved, cell text compressed)
- Dates, version numbers, numeric values

## Why This Matter

A memory file (`AGENTS.md` / `CLAUDE.md`) loads on **every session start**. A 1000-token project memory file costs tokens every single time you open a project. Over 100 sessions that's 100,000 tokens of overhead — just for context you already wrote.

Laconic cut that by ~46% on average. Same instructions. Same accuracy. Less waste.

## Part of Laconic

This skill is part of the [caveman](https://github.com/JuliusBrussee/caveman) toolkit — making the agent use fewer tokens without losing accuracy. pi-laconic is the [Pi](https://github.com/earendil-works/pi-coding-agent) port.

- **laconic** — make the agent *speak* like laconic (cuts response tokens ~65%)
- **laconic-compress** — make the agent *read* less (cuts context tokens ~46%)
```

- [ ] **Step 5: Delete `skills/laconic-compress/SECURITY.md`**

Run: `git rm skills/laconic-compress/SECURITY.md`
Expected: file staged for deletion.

- [ ] **Step 6: Run the docs test to verify it passes**

Run: `node --experimental-strip-types --test tests/compress-docs.test.mjs`
Expected: PASS — no forbidden substrings, no Python residue, backup step documented, `SECURITY.md` gone.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS — typecheck clean, all node tests green. (`npm run test:py` is NOT part of `npm test`, so the still-present Python is not exercised here; it is removed in Task 2.)

- [ ] **Step 8: Commit**

```bash
git add skills/laconic-compress/SKILL.md skills/laconic-compress/README.md tests/compress-docs.test.mjs
git rm skills/laconic-compress/SECURITY.md
git commit -m "refactor: make laconic-compress a prompt-only skill (docs)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Remove the Python toolkit and its wiring

**Files:**
- Delete: `skills/laconic-compress/scripts/` (all files)
- Delete: `skills/laconic-compress/tests/` (all files)
- Modify: `tests/manifest.test.mjs` (drop `test:py` assertions)
- Modify: `package.json` (remove `test:py` script and `files` negations)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `package.json` with no `test:py` script and `files` = `["extensions","skills","agents","AGENTS.md"]`.

- [ ] **Step 1: Update `tests/manifest.test.mjs` — drop the `test:py` assertions**

Find the test titled `"scripts wire up test, typecheck, and test:py"` and replace it (the whole `test(...)` block) with:

```javascript
test("scripts wire up test and typecheck", () => {
	const pkg = readManifest();
	assert.ok(pkg.scripts, "scripts must exist");
	// Substring (not exact-string) checks so the script wording can evolve
	// without a brittle test break — we only assert the load-bearing parts.
	assert.match(
		pkg.scripts.test,
		/--test/,
		"test script must run the node --test runner",
	);
	assert.match(
		pkg.scripts.test,
		/--experimental-strip-types/,
		"test script must strip TS types (tests import .ts modules)",
	);
	assert.match(
		pkg.scripts.typecheck,
		/tsc --noEmit/,
		"typecheck script must run tsc --noEmit",
	);
	assert.equal(
		pkg.scripts["test:py"],
		undefined,
		"laconic-compress is prompt-only — there is no Python test script",
	);
});
```

- [ ] **Step 2: Run the manifest test to confirm it still passes**

Run: `node --experimental-strip-types --test tests/manifest.test.mjs`
Expected: FAIL — `test:py` is still defined in `package.json`, so the new `assert.equal(..., undefined)` fails. (This is the RED that drives the package.json edit.)

- [ ] **Step 3: Edit `package.json` — remove the `test:py` script**

In the `scripts` block, remove the `test:py` line. The block becomes:

```json
  "scripts": {
    "pretest": "npm run typecheck",
    "test": "node --experimental-strip-types --test tests/**/*.test.mjs",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm test"
  },
```

- [ ] **Step 4: Edit `package.json` — remove the now-unneeded `files` negations**

The Python test sources the negations pruned are being deleted, so the negations are dead. Replace the `files` array with:

```json
  "files": [
    "extensions",
    "skills",
    "agents",
    "AGENTS.md"
  ],
```

- [ ] **Step 5: Delete the Python toolkit and pytest suite**

Run:
```bash
git rm -r skills/laconic-compress/scripts skills/laconic-compress/tests
```
Expected: all `scripts/*.py` and `tests/*.py` (and `__pycache__`) staged for deletion.

- [ ] **Step 6: Run the manifest test to verify it passes**

Run: `node --experimental-strip-types --test tests/manifest.test.mjs`
Expected: PASS — `test:py` is now `undefined`.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS — typecheck clean, all node tests green.

- [ ] **Step 8: Verify the published tarball is clean**

Run: `npm pack --dry-run 2>&1 | grep -E "laconic-compress|total files"`
Expected: only `skills/laconic-compress/README.md` and `skills/laconic-compress/SKILL.md` appear under that dir — no `scripts/`, no `tests/`, no `SECURITY.md`, no `.py`/`.pyc`.

- [ ] **Step 9: Commit**

```bash
git add package.json tests/manifest.test.mjs
git rm -r skills/laconic-compress/scripts skills/laconic-compress/tests
git commit -m "refactor: drop the Python laconic-compress toolkit and test:py wiring

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Update cross-references (root README, AGENTS.md)

**Files:**
- Modify: `README.md` (remove Python venv test block; reword MCP-shrink paragraph)
- Modify: `AGENTS.md` (reword the `compress.py`/`validate.py`/`call_claude` bullets; remove the Python-tests bullet)

**Interfaces:**
- Consumes: the prompt-only model established in Tasks 1–2.
- Produces: no shipped doc claims laconic-compress is Python / model-CLI-bound.

- [ ] **Step 1: Edit `README.md` — remove the Python venv block in "First-time setup"**

Replace this block:

````markdown
```bash
npm install            # fetch the Pi SDK + TypeScript dev deps
npm test               # typecheck + extension/manifest/docs unit tests

# Python tests for the laconic-compress toolkit need pytest in a local venv
# (pytest is not on PATH on a fresh checkout):
python3 -m venv .venv
.venv/bin/pip install pytest
npm run test:py        # runs: .venv/bin/pytest skills/laconic-compress
```
````

with:

````markdown
```bash
npm install            # fetch the Pi SDK + TypeScript dev deps
npm test               # typecheck + extension/manifest/docs unit tests
```
````

- [ ] **Step 2: Edit `README.md` — reword the MCP-shrink comparison paragraph**

Replace:

```markdown
The Pi-side equivalent is the Python `laconic-compress` toolkit, invoked via the
`/laconic-compress` skill/command, which compresses prose memory files in place
(writing a `FILE.original.md` backup) while preserving code, URLs, and paths
verbatim. Note `laconic-compress` is **itself Claude-bound** — it compresses via
a live model call (the Anthropic SDK if `ANTHROPIC_API_KEY` is set, otherwise the
`claude --print` CLI). So "Pi equivalent" means *invoked via a Pi skill/command*,
not *model-independent*.
```

with:

```markdown
The Pi-side equivalent is the `laconic-compress` skill, invoked via the
`/laconic-compress` command. It is prompt-only: the Pi agent itself compresses a
prose memory file in place (writing a `FILE.original.md` backup) using its own
model and file tools, preserving code, URLs, and paths verbatim. No Python and no
external Claude CLI are involved — compression is performed by the host Pi agent,
the same way the other skills work.
```

- [ ] **Step 3: Edit `AGENTS.md` — reword the verbatim-preservation bullet**

Replace:

```markdown
- **Verbatim preservation**: laconic-compress never alters code blocks, inline
  code, URLs, file paths, commands, or exact error strings. `validate.py` enforces
  this and `compress.py` aborts + restores the original on any validation failure.
```

with:

```markdown
- **Verbatim preservation**: laconic-compress never alters code blocks, inline
  code, URLs, file paths, commands, or exact error strings. The skill instructs
  the agent to self-validate these against the original and, on any mismatch it
  cannot fix, restore from the `.original` backup rather than leave a corrupted file.
```

- [ ] **Step 4: Edit `AGENTS.md` — reword the model-bound bullet**

Replace:

```markdown
- `laconic-compress` is **model-bound**: `compress.py` `call_claude()` calls the
  Anthropic SDK (if `ANTHROPIC_API_KEY` is set) or the `claude --print` CLI. The
  deterministic, unit-tested pieces are `detect.py`, `validate.py`, and the pure
  helpers; the live model call is never exercised in tests (it is monkeypatched).
```

with:

```markdown
- `laconic-compress` is **prompt-only**: the Pi agent performs the compression
  with its own model and file tools, driven by `SKILL.md`. There is no Python and
  no external model CLI; coverage is the doc-guard test `tests/compress-docs.test.mjs`.
```

- [ ] **Step 5: Edit `AGENTS.md` — remove the Python-tests bullet**

Delete this bullet from the "Tests / validation" section:

```markdown
- **Python tests are not on PATH.** Create a venv and install pytest:
  `python3 -m venv .venv && .venv/bin/pip install pytest`, then run
  `npm run test:py` (which calls `.venv/bin/pytest skills/laconic-compress`).
```

(Leave the surrounding bullets, including the `tests/compress-docs.test.mjs` phantom-reference-guard bullet, unchanged.)

- [ ] **Step 6: Verify no Python references remain outside historical docs**

Run:
```bash
git grep -nE "python3 -m scripts|Requires.*Python|local Python|call_claude|test:py|\.venv/bin/pytest" -- ':!docs/' || echo "CLEAN"
```
Expected: `CLEAN` (no matches outside `docs/`, which holds dated historical records).

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS — including `tests/readme.test.mjs` (still finds `pi -e`, the mode names, and `/laconic`).

- [ ] **Step 8: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: update references for prompt-only laconic-compress

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Remove `scripts/` + `tests/` → Task 2. Delete `SECURITY.md` → Task 1. Rewrite `SKILL.md` Process → Task 1. Rewrite skill `README.md` → Task 1. `package.json` `test:py` + `files` negations → Task 2. `manifest.test.mjs` → Task 2. `compress-docs.test.mjs` rewrite → Task 1. Root README (venv block + MCP paragraph) → Task 3. `AGENTS.md` (two bullets reworded + Python-tests bullet removed) → Task 3. All spec sections covered.

**Placeholder scan:** No TBD/TODO; every edit gives exact old/new text or full file content; every command has expected output.

**Type/name consistency:** `.original.<ext>` backup naming, the `/laconic-compress` command, the forbidden-residue token list, and `files` = `["extensions","skills","agents","AGENTS.md"]` are consistent across tasks. The `compress-docs.test.mjs` rewrite (Task 1) and the doc rewrites it guards (Task 1) are in the same task, so the test and its subjects land together.

**Cross-task ordering note:** Task 1's test forbids Python residue only in `skills/laconic-compress/{SKILL,README}.md` (rewritten in Task 1). The root README / AGENTS.md Python references are cleaned in Task 3 and are not covered by Task 1's test — Task 3 Step 6 grep is their gate. No task leaves the suite red.
