# laconic-stats

On-demand estimate of laconic token savings. Manual, not tracked.

## What it does

Pi does not hand per-turn token usage to the extension, so there is no automatic
meter and no on-disk usage record to read. Instead, `/laconic-stats` asks the
model to estimate savings on the spot: it compares the terse laconic output
already produced this session against the verbose prose it would have written
otherwise, and reports both sizes plus the percentage saved. The number is an
estimate, clearly labelled as such.

The Pi statusline shows the current mode only — `laconic:<mode>` (set by the
extension via `ctx.ui.setStatus`). It is a mode indicator, not a savings badge.

## How to invoke

```
/laconic-stats
```

## Example output

```
Laconic savings (estimate — Pi does not expose exact token counts)

Laconic output this session: ~3,900 tokens
Verbose baseline (estimated): ~11,200 tokens
Saved:                        ~7,300 tokens (~65%)
```

## See also

- [`SKILL.md`](./SKILL.md) — how the estimate is produced
- [Laconic README](../../README.md) — repo overview
