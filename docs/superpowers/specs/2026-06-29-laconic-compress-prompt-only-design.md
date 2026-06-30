# Design: laconic-compress as a prompt-only Pi skill

Date: 2026-06-29
Status: Approved

## Goal

Re-express the `laconic-compress` skill so the Pi agent performs the
compression itself (its own model + file tools), driven entirely by
instructions in `SKILL.md`. Remove the Python toolkit. This drops the only
Python from the package, removes the dependency on an external `claude`
CLI / `ANTHROPIC_API_KEY`, and makes the skill consistent with the other five
(all prompt-only markdown skills).

## Why

- The ported Python toolkit calls a model via the Anthropic SDK or `claude
  --print` — it bypasses the Pi host's own model. In a Pi environment a user
  may have neither, so the skill can be non-functional.
- Python is the package's only second runtime; `test:py` is not run in CI; the
  toolkit drags `.venv`/pytest for dev.
- The skill's core action (a model rewrites a prose file) is exactly what the
  Pi agent does natively. The deterministic detect/validate/backup/retry
  harness becomes explicit instructions to the agent — softer guarantees, but
  in keeping with the prompt-skill approach used everywhere else here.

## Scope of change

### Removed

- `skills/laconic-compress/scripts/` — entire Python package (`compress.py`,
  `detect.py`, `validate.py`, `cli.py`, `benchmark.py`, `__init__.py`,
  `__main__.py`, `__pycache__/`).
- `skills/laconic-compress/tests/` — pytest suite (`conftest.py`,
  `test_compress_helpers.py`, `test_validate_detect.py`).
- `skills/laconic-compress/SECURITY.md` — it documents only the Python
  subprocess/SDK Snyk rating; with no subprocess/SDK it is moot.

### Rewritten

- `skills/laconic-compress/SKILL.md` — replace the `## Process` section (which
  runs `python3 -m scripts`) with a prompt-only agent procedure (below). The
  existing **Compression Rules / Preserve EXACTLY / Preserve Structure /
  Compress / Pattern / Boundaries** sections are already prompt-style rules and
  are kept verbatim — they are what the agent now follows directly.
- `skills/laconic-compress/README.md` — rewrite the Python-specific parts:
  drop "Requires: Python 3.10+", the "local Python" / `scripts/` lines, the
  Security/Snyk section (lines referencing SECURITY.md), and redraw the "How
  It Work" pipeline as agent-driven (detect → compress → self-validate →
  backup, all performed by the Pi agent). Benchmarks and before/after stay.

### New `SKILL.md` procedure (replaces `## Process`)

The agent, when `/laconic-compress <filepath>` is invoked:

1. Read the target file. If it is a `*.original.*` backup, stop (never
   compress a backup).
2. Decide compressibility by extension/content per the existing **Boundaries**
   section (compress prose `.md/.txt/.rst/.typ/.typst/.tex`/extensionless;
   skip code/config). If not compressible, report and stop.
3. Write a verbatim backup to `<file>.original.<ext>` **only if that backup
   does not already exist** (do not clobber a prior backup).
4. Rewrite the file applying the Compression Rules below, treating code
   blocks / inline code / URLs / paths / commands / headings / tables as
   read-only regions.
5. Self-validate against the original: every protected token (fenced and
   inline code, URLs, file paths, headings, table structure, numbers/versions)
   must be byte-identical. If any protected token changed, fix just that
   region; if it cannot be made identical, restore from the backup and report
   the failure instead of leaving a corrupted file.
6. Report bytes before/after and the approximate reduction.

### Reference updates

- `package.json` — remove the `test:py` script; remove the `files` negations
  (`!**/__pycache__`, `!**/*.pyc`, `!skills/**/tests`) since the Python/test
  sources they pruned are gone. `files` returns to
  `["extensions", "skills", "agents", "AGENTS.md"]`.
- `tests/manifest.test.mjs` — drop the `test:py` assertions from the "scripts
  wire up …" test (rename to "scripts wire up test and typecheck"); keep the
  `test`/`typecheck`/`--experimental-strip-types` assertions.
- `tests/compress-docs.test.mjs` — keep the existing guards (no "claude code",
  no `docs/assets`/`dancing-rock`, no plugin-install path). Add guards that the
  Python era left no residue in `SKILL.md`/`README.md`: forbid `python3`,
  `scripts/`, `call_claude`, `subprocess`, `pytest`, `ANTHROPIC_API_KEY`,
  `claude --print`. Add a positive assertion that `SKILL.md` documents the
  backup step (`.original`).
- `README.md` (root) — the "Compression vs. upstream MCP shrink" section
  currently calls the Pi equivalent "the Python `laconic-compress` toolkit …
  itself Claude-bound (`call_claude`)". Update: it is now a prompt-only
  Pi-native skill — the Pi agent compresses with its own model; no Python, not
  bound to an external Claude.
- `AGENTS.md`, `skills/laconic-help/SKILL.md`, `skills/laconic-crew/SKILL.md`,
  `agents/laconic-investigator.md` — update any text describing
  laconic-compress as a Python CLI / `python3 -m scripts` / Python-requiring.
  The `/laconic-compress` command itself stays valid.

## Testing

The skill is prompt-only (markdown), so coverage is the docs tests in the
repo's existing style:

- `tests/compress-docs.test.mjs` (rewritten as above) — guards the SKILL.md /
  README invariants and the no-Python-residue rule.
- `tests/manifest.test.mjs` — updated to no longer require `test:py`.
- Full suite `npm test` stays green; there is no longer a `test:py` / pytest
  path to run.

## Out of scope

- The other skills (`laconic`, `laconic-commit`, `laconic-review`,
  `laconic-help`, `laconic-stats`, `laconic-crew`) and the extension — untouched.
- `.gitignore` Python entries (`__pycache__/`, `*.pyc`, `.venv/`,
  `.pytest_cache/`) — harmless once Python is gone; optional cleanup, not
  required.
- Historical docs (`docs/audit.md`, `docs/plans/completed/*`,
  `docs/superpowers/plans/2026-06-29-npm-publish.md`) — left as dated records.
