---
name: caveman-help
description: >
  Quick-reference card for all caveman modes, skills, and commands.
  One-shot display, not a persistent mode. Trigger: /caveman-help,
  "caveman help", "what caveman commands", "how do I use caveman".
---

# Caveman Help

Display this reference card when invoked. One-shot — do NOT change mode, write flag files, or persist anything. Output in caveman style.

## Modes

| Mode | Trigger | What change |
|------|---------|-------------|
| **Lite** | `/caveman lite` | Drop filler. Keep sentence structure. |
| **Full** | `/caveman` | Drop articles, filler, pleasantries, hedging. Fragments OK. Default. |
| **Ultra** | `/caveman ultra` | Extreme compression. Bare fragments. Abbreviate prose words; arrows (X → Y). |
| **Wenyan-Lite** | `/caveman wenyan-lite` | Classical Chinese style, light compression. |
| **Wenyan-Full** | `/caveman wenyan` | Full 文言文. Maximum classical terseness. |
| **Wenyan-Ultra** | `/caveman wenyan-ultra` | Extreme. Ancient scholar on a budget. |

Mode stick until changed or session end.

## Skills

| Skill | Trigger | What it do |
|-------|---------|-----------|
| **caveman-commit** | `/caveman-commit` | Terse commit messages. Conventional Commits. ≤50 char subject. |
| **caveman-review** | `/caveman-review` | One-line PR comments: `L42: bug: user null. Add guard.` |
| **caveman-compress** | `/caveman-compress <file> [--force]` | Compress .md files to caveman prose. Saves ~46% input tokens. `--force` overwrites stale backup. |
| **caveman-stats** | `/caveman-stats` | On-demand, model-driven estimate of tokens saved this session. |
| **caveman-help** | `/caveman-help` | This card. |

## Deactivate

Say "stop caveman" or "normal mode". Resume anytime with `/caveman`.

## Language

Keep user's language by default. User write Portuguese → reply Portuguese caveman. Compress the style, not the language. Technical terms, code, commands, commit types, and exact error strings stay verbatim unless user ask for translation.

## Mode persistence

Mode set per session entry, so it survives `/reload`. Since v0.4.3 it is also
saved per project in `.pi/caveman-mode.json`; a new session in the same project
directory restores the last mode. Session entry overrides project default. No
config file? Falls back to `off`.

`/caveman` (no argument) = `full`. Pick another with `/caveman ultra`,
`/caveman lite`, etc. Say "stop caveman" or "normal mode" to turn off.

## More

Full docs: <https://github.com/kulapard/pi-caveman>
