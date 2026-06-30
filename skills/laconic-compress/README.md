# laconic-compress

Compress prose memory files in place using the laconic style.

## Usage

```bash
/laconic-compress AGENTS.md
```

This reads `AGENTS.md`, writes `AGENTS.original.md`, and rewrites `AGENTS.md` in laconic style while preserving code blocks, inline code, URLs, paths, commands, and exact error strings.

## `--force`

If a backup already exists, the command aborts by default. Pass `--force` to overwrite it:

```bash
/laconic-compress AGENTS.md --force
```

## What is preserved

- Code blocks and inline code
- URLs and file paths
- Shell commands, API names, CLI flags
- Exact error strings or log excerpts
- Commit-type keywords and version strings

Everything else is compressed.
