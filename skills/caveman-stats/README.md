# caveman-stats

On-demand estimate of caveman token savings. Manual, not tracked.

## What it does

Pi does not hand per-turn token usage to the extension, so there is no automatic
meter and no on-disk usage record to read. Instead, `/caveman-stats` asks the
model to estimate savings on the spot: it compares the terse caveman output
already produced this session against the verbose prose it would have written
otherwise, and reports both sizes plus the percentage saved. The number is an
estimate, clearly labelled as such.

The Pi statusline shows the current mode only — `caveman:<mode>` (set by the
extension via `ctx.ui.setStatus`). It is a mode indicator, not a savings badge.

## How to invoke

```
/caveman-stats
```

## Example output

```
Caveman savings (estimate — Pi does not expose exact token counts)

Caveman output this session: ~3,900 tokens
Verbose baseline (estimated): ~11,200 tokens
Saved:                        ~7,300 tokens (~65%)
```

## See also

- [`SKILL.md`](./SKILL.md) — how the estimate is produced
- [Caveman README](../../README.md) — repo overview
