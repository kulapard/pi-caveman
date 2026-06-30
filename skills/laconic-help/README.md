# laconic-help

Quick-reference card. One shot, no mode change.

## What it does

Prints a cheat sheet of all laconic modes, sibling skills, deactivation
triggers, and how mode persists: it is stored as a session entry (survives
`/reload`), and since v0.4.3 it is also saved per project in
`.pi/laconic-mode.json` (a new session in the same project directory restores
the last mode). No config file? Falls back to `off`. One-shot display — does not
flip the active mode, write flag files, or persist anything. Use when you forget
the slash commands.

## How to invoke

```
/laconic-help
```

Also triggers on "laconic help", "what laconic commands", "how do I use laconic".

## Example output

```
Modes:
  /laconic              full (default)
  /laconic lite         lighter
  /laconic ultra        extreme
  /laconic wenyan       classical Chinese

Skills:
  /laconic-commit       terse Conventional Commits
  /laconic-review       one-line PR comments
  /laconic-stats        session token savings

Deactivate:
  "stop laconic" or "normal mode"
```

## See also

- [`SKILL.md`](./SKILL.md) — full reference card
- [Laconic README](../../README.md) — repo overview
