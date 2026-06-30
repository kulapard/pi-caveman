---
name: laconic-crew
description: >
  Decision guide for delegating to laconic-style subagents. Tells the main
  thread WHEN to delegate to `laconic-investigator` (locate code), `laconic-builder`
  (1-2 file edit), or `laconic-reviewer` (diff review) instead of doing the
  work inline or delegating with a plain (uncompressed) prose agent. Subagent
  output is laconic-compressed so the tool-result injected back into main
  context is ~60% smaller — main context lasts longer across long sessions.
  Trigger: "delegate to subagent", "use laconic-crew", "spawn investigator/builder/reviewer",
  "save context", "compressed agent output".
---

> ⚠️ **Optional — requires an external Pi subagent capability.** Pi 0.80.2 ships
> no subagent / `agents/` preset mechanism, so laconic-crew is **not wired into this
> package**. The three `agents/laconic-crew-*.md` files are reference personas: the
> prompts you would hand a delegated agent. They become usable only if a Pi
> subagent capability exists (e.g. a future `pi-subagents`-style package) that
> can spawn an agent and inject its compressed tool-result back into main
> context. Until then, treat this skill as design notes. See
> [`README.md`](./README.md).

Laconic-crew = three subagent personas that emit laconic output. Same jobs a delegated agent would do (locate, edit, review); the difference is the tool-result they return is compressed, so main context shrinks per delegation.

## When to use laconic-crew vs alternatives

| Task | Use |
|---|---|
| "Where is X defined / what calls Y / list uses of Z" | `laconic-investigator` |
| Same but you also want suggestions/architecture commentary | A plain prose locate agent |
| Surgical edit, ≤2 files, scope obvious | `laconic-builder` |
| New feature / 3+ files / cross-cutting refactor | Main thread or a plain architect agent |
| Review diff, branch, or file for bugs | `laconic-reviewer` |
| Deep code review with rationale + alternatives | A plain prose review agent |
| One-line answer you already know | Main thread, no subagent |

Rule of thumb: **if you'd want the subagent's output in 1/3 the tokens, pick laconic-crew. If you'd want prose, pick a plain (uncompressed) agent.**

## Why this exists (the real win)

Subagent tool results get injected into main context verbatim. A plain prose locate agent that returns 2k tokens of prose costs 2k tokens of main-context budget every time. The same finding from `laconic-investigator` returns ~700 tokens. Across 20 delegations in one session that's the difference between context exhaustion and finishing the task.

## Output contracts

What main thread can rely on per agent:

**`laconic-investigator`**
```
<Header>:
- path:line — `symbol` — short note
totals: <counts>.
```
Or `No match.` Always file-path-first, line-number-attached, backticked symbols. Safe to grep with `path:\d+`.

**`laconic-builder`**
```
<path:line-range> — <change ≤10 words>.
verified: <re-read OK | mismatch @ path:line>.
```
Or one of: `too-big.` / `needs-confirm.` / `ambiguous.` / `regressed.` (terminal first token).

**`laconic-reviewer`**
```
path:line: <emoji> <severity>: <problem>. <fix>.
totals: N🔴 N🟡 N🔵 N❓
```
Or `No issues.` Findings sorted file → line ascending.

## Chaining patterns

**Locate → fix → verify** (most common):
1. `laconic-investigator` returns site list.
2. Main thread picks 1-2 sites, hands paths to `laconic-builder`.
3. `laconic-reviewer` audits the diff.

**Parallel scout** (when investigation is broad):
Spawn 2-3 `laconic-investigator` calls in one message (different angles: defs vs callers vs tests). Aggregate in main thread.

**Single-shot edit** (when site is already known):
Skip investigator. Hand exact path:line to `laconic-builder` directly.

## What NOT to do

- Don't use `laconic-builder` when you don't already know the file. Spawn investigator first or main thread will eat tokens passing context.
- Don't chain `laconic-investigator → laconic-builder` for a 5-file refactor. Builder will return `too-big.` and you'll have wasted a turn.
- Don't ask `laconic-reviewer` for "general feedback" — it returns findings only, no architecture opinions. Use a plain prose review agent for that.
- Don't expect prose. Laconic-crew output is structured, sometimes terse to the point of cryptic. If a human will read it directly, paraphrase.

## Auto-clarity (inherited)

Subagents drop laconic → normal English for security warnings, irreversible-action confirmations, and any output where fragment ambiguity could be misread. Resume laconic after.
