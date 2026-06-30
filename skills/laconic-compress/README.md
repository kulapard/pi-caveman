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
AGENTS.original.md ← human-readable backup (snapshot taken at first compression)
```

Original never lost — first compression writes a verbatim backup. To edit and re-compress, **edit `AGENTS.md` itself**, then delete or rename the existing `AGENTS.original.md` so the next `/laconic-compress` can create a fresh backup. Or use `/laconic-compress AGENTS.md --force` to overwrite the existing backup in one step.

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
/laconic-compress <filepath> [--force]
```

Examples:

```
/laconic-compress AGENTS.md
/laconic-compress CLAUDE.md
/laconic-compress docs/preferences.md
/laconic-compress todos.md
/laconic-compress AGENTS.md --force
```

### What files work

| Type | Compress? |
|------|-----------|
| `.md`, `.txt`, `.rst`, `.typ`, `.typst`, `.tex` | ✅ Yes |
| Extensionless natural language | ✅ Yes |
| `.py`, `.js`, `.ts`, `.json`, `.yaml` | ❌ Skip (code/config) |
| `*.original.md` | ❌ Skip (backup files) |
| `*.original` (extensionless) | ❌ Skip (backup files) |

## How It Work

```
/laconic-compress AGENTS.md
        ↓
agent detects file type      (prose? else skip)
        ↓
agent checks for existing backup  →  abort if stale `.original` exists
        ↓
agent backs up original once  →  AGENTS.original.md   (verbatim snapshot)
        ↓
agent rewrites prose to laconic, code/URLs/paths left exact
        ↓
agent self-validates: protected tokens byte-identical to original
        ↓
if a protected token changed: fix it, or restore from the just-created backup and report
        ↓
write compressed  →  AGENTS.md

To re-compress, edit `AGENTS.md`, then remove/rename the old `AGENTS.original.md`
so the skill can create a fresh snapshot.
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

This skill ships with pi-laconic, a [Pi](https://github.com/earendil-works/pi-coding-agent) terse-output extension inspired by [caveman](https://github.com/JuliusBrussee/caveman) — making the agent use fewer tokens without losing accuracy.

- **laconic** — make the agent *speak* like laconic (cuts response tokens ~65%)
- **laconic-compress** — make the agent *read* less (cuts context tokens ~46%)
