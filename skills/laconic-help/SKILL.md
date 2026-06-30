---
name: laconic-help
description: >
  Quick-reference card for all laconic modes, skills, and commands.
  One-shot display, not a persistent mode. Trigger: /laconic-help,
  "laconic help", "what laconic commands", "how do I use laconic".
---

# Laconic Help

Display this reference card when invoked. One-shot — do NOT change mode, write flag files, or persist anything. Output in laconic style.

## Modes

| Mode | Trigger | What change |
|------|---------|-------------|
| **Low** | `/laconic low` | Drop filler. Keep sentence structure. |
| **Medium** | `/laconic` (default) | Drop articles, filler, pleasantries, hedging. Fragments OK. Default. |
| **High** | `/laconic high` | Extreme compression. Bare fragments. Abbreviate prose words; arrows (X → Y). |

Mode stick until changed or session end.

## Skills

| Skill | Trigger | What it do |
|-------|---------|-----------|
| **laconic-commit** | `/laconic-commit` | Terse commit messages. Conventional Commits. ≤50 char subject. |
| **laconic-review** | `/laconic-review` | One-line PR comments: `L42: bug: user null. Add guard.` |
| **laconic-compress** | `/laconic-compress <file> [--force]` | Compress .md files to laconic prose. Saves ~46% input tokens. `--force` overwrites stale backup. |
| **laconic-stats** | `/laconic-stats` | On-demand, model-driven estimate of tokens saved this session. |
| **laconic-help** | `/laconic-help` | This card. |

## Deactivate

Say "stop laconic" or "normal mode". Resume anytime with `/laconic`.

## Language

Keep user's language by default. User write Portuguese → reply Portuguese laconic. Compress the style, not the language. Technical terms, code, commands, commit types, and exact error strings stay verbatim unless user ask for translation.

## Mode persistence

Mode set per session entry, so it survives `/reload`. Since v0.4.3 it is also
saved per project in `.pi/laconic-mode.json`; a new session in the same project
directory restores the last mode. Session entry overrides project default. No
config file? Falls back to `off`.

`/laconic` (no argument) = `medium`. Pick another with `/laconic high`,
`/laconic low`, etc. Say "stop laconic" or "normal mode" to turn off.

## More

Full docs: <https://github.com/kulapard/pi-laconic>
