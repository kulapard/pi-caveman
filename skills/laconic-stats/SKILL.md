---
name: laconic-stats
description: >
  Estimate laconic token savings for the current session, on demand.
  No automatic tracking — the model computes a rough estimate by comparing
  laconic output against a verbose-style baseline. Triggers on /laconic-stats.
---

Laconic saves tokens by writing terse. There is no hidden token meter — Pi does
not expose per-turn usage to the extension, so stats are a manual, model-driven
estimate rather than exact receipts.

When `/laconic-stats` fires, gauge savings like this:

- Take the assistant output already produced in laconic mode this session.
- Mentally re-expand the same content into ordinary verbose prose (full
  sentences, hedging, filler) — that is the baseline.
- Estimate tokens for each (~4 chars/token is a fine rule of thumb) and report
  laconic vs baseline plus the percentage saved.

State plainly that the number is an estimate. Do not invent precise per-turn
token counts or claim they were read from a log — that data is not available.

## What is NOT here

- No on-disk usage log, no JSONL parsing, no automatic counters.
- No statusline savings badge. The statusline shows the current mode only
  (`laconic:<mode>`, e.g. `laconic:ultra`), set by the extension via
  `ctx.ui.setStatus`. It is a mode indicator, not a savings percentage.
- Verbatim guarantee still holds: code, commands, API names, file paths, and
  exact errors are never compressed when counting or reporting.
