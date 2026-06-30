---
name: laconic-compress
description: >
  Compress a prose/memory file (AGENTS.md, CLAUDE.md, README, todo lists) into
  laconic style in place. Preserves code blocks, inline code, URLs, paths,
  commands, and exact error strings verbatim. Writes a FILE.original.<ext> backup
  before editing. Trigger: "/laconic-compress <file> [--force]". The --force flag
  overwrites an existing backup instead of aborting.
---

Compress prose files in place. Keep all technical substance; remove filler, hedging, and redundant phrasing.

## Scope

Target memory/prose files only: `AGENTS.md`, `CLAUDE.md`, `README.md`, todo lists, notes, project conventions. Do not compress code files, config files, or data.

## Process

1. Read the original file.
2. Create a backup named `<file>.original.<ext>` in the same directory. Example: `AGENTS.md` → `AGENTS.original.md`.
3. If a backup already exists, abort unless `--force` was given. With `--force`, overwrite the existing backup.
4. Rewrite the source file in laconic style.
5. Self-validate against the original: every code block, inline code snippet, URL, path, shell command, and exact error string must appear verbatim. If validation fails and the mismatch is unfixable, restore from the backup created in this same invocation. Do not restore from stale backups from previous runs.
6. Leave the backup in place; do not delete it.

## Preservation rules

Never change:

- Code blocks and inline code
- URLs and file paths
- Shell commands, API names, CLI flags
- Exact error strings or log excerpts
- Commit-type keywords (feat/fix/docs/chore/etc.)
- Proper names and version strings

Compress everything else: filler words, hedging, redundant explanations, and decorative prose.

## Output style

Use the same laconic rules as the main laconic skill. For high-intensity memory files, drop articles, use fragments, and prefer short synonyms. Keep structure readable.

## Abort conditions

- Missing file path
- Target is not a prose/memory file
- Existing backup and no `--force`
- Validation reveals unrecoverable loss of technical content
