# laconic-crew

Decision guide. When to delegate to laconic subagents instead of doing the work inline.

> ⚠️ **Optional — requires an external Pi subagent capability.** Pi 0.80.2 has
> **no subagent / `agents/` preset mechanism**, so laconic-crew is **not wired into
> this package**. The three `agents/laconic-crew-*.md` files are reference personas
> (the prompts you would hand a delegated agent), kept as design notes / future
> work. They become usable only if a Pi subagent capability lands — e.g. a
> `pi-subagents`-style package that can spawn an agent and inject its compressed
> tool-result back into main context. Pi core does not provide that today.

## What it does

Tells the main thread when to delegate to a laconic-style subagent versus a plain (uncompressed) prose agent. The win: subagent tool-results inject back into main context verbatim, and laconic output is roughly 1/3 the size of prose. Across 20 delegations in one session, that is the difference between context exhaustion and finishing the task.

Three subagents:

| Subagent | Job | Use when |
|----------|-----|----------|
| `laconic-investigator` | Locate code (read-only) | "Where is X defined / what calls Y / list uses of Z" |
| `laconic-builder` | Surgical edit, 1-2 files | Scope is obvious, ≤2 files. Refuses 3+ file scope. |
| `laconic-reviewer` | Diff/file review | One-line findings with severity emoji |

Use a plain (uncompressed) prose agent when you want prose, architecture commentary, or rationale. Use main thread directly for one-line answers and 3+ file refactors.

This skill is a decision guide, not a slash command. It activates when the conversation mentions delegation.

## How to invoke

Triggers on phrases like "delegate to subagent", "use laconic-crew", "spawn investigator", "save context", "compressed agent output".

## Example chaining

Locate → fix → verify (most common):

1. `laconic-investigator` returns site list (`path:line — symbol — note`)
2. Main thread picks 1-2 sites, hands paths to `laconic-builder`
3. `laconic-reviewer` audits the resulting diff

Parallel scout: spawn 2-3 `laconic-investigator` calls in one message with different angles (defs, callers, tests). Aggregate in main.

## See also

- [`SKILL.md`](./SKILL.md) — full decision matrix and output contracts
- [`agents/laconic-investigator.md`](../../agents/laconic-investigator.md)
- [`agents/laconic-builder.md`](../../agents/laconic-builder.md)
- [`agents/laconic-reviewer.md`](../../agents/laconic-reviewer.md)
- [Laconic README](../../README.md) — repo overview
