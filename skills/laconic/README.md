# laconic

Talk like smart laconic. Same brain, fewer tokens.

## What it does

Compress every model response to laconic-style prose. Drops articles, filler, pleasantries, and hedging. Keeps every technical detail, code block, error string, and symbol exact. Cuts ~65-75% of output tokens with full accuracy preserved. Mode persists for the whole session until changed or stopped.

Three intensity levels:

| Level | What change |
|-------|-------------|
| `low` | Drop filler/hedging. Sentences stay full. Professional but tight. |
| `medium` | Default. Drop articles, fragments OK, short synonyms. |
| `high` | Bare fragments. Abbreviations (DB, auth, fn). Arrows for causality. |

Auto-clarity rule: laconic drops to normal prose for security warnings, irreversible-action confirmations, multi-step sequences where fragment ambiguity risks misread, and when user repeats a question. Resumes after the clear part.

## How to invoke

```
/laconic              # medium mode (default)
/laconic low          # lighter compression
/laconic high         # extreme compression
stop laconic          # back to normal prose
```

## Example output

Question: "Why does my React component re-render?"

Normal prose:
> Your component re-renders because you create a new object reference each render. Wrapping it in `useMemo` will fix the issue.

Laconic (medium):
> New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`.

Laconic (high):
> Inline obj prop → new ref → re-render. `useMemo`.

## See also

- [`SKILL.md`](./SKILL.md) — full LLM-facing instructions
- [Laconic README](../../README.md) — repo overview, install, benchmarks
