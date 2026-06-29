# pi-caveman

A [Pi](https://github.com/earendil-works/pi-coding-agent) port of
[caveman](https://github.com/JuliusBrussee/caveman) — a terse-output mode for the
Pi coding agent. It makes the agent speak in compressed "caveman" prose (drop
articles, filler, and hedging; fragments over sentences) to cut output tokens by
roughly 65–75% **while keeping full technical accuracy**: code, commands, API
names, file paths, and exact error strings are always preserved verbatim.

pi-caveman ships as a Pi package: a single extension (`extensions/caveman.ts`)
plus a set of skills under `skills/`.

## Install

pi-caveman is published to npm as
[`@kulapard/pi-caveman`](https://www.npmjs.com/package/@kulapard/pi-caveman).
Install it into a Pi setup with:

```bash
pi install npm:@kulapard/pi-caveman
```

You can also load it straight from a checkout on disk — see the `pi -e`
mechanism below.

### Install from GitHub

The simplest way to load the latest version directly from the repository is:

```bash
pi install https://github.com/kulapard/pi-caveman
```

Pi resolves the `pi` block in `package.json` and loads both the extension and
all skills from the cloned directory.

### Load the extension directly (per-session)

For quick testing without installing, use Pi's `-e` flag for a single session:

```bash
pi -e /path/to/pi-caveman/extensions/caveman.ts --skill /path/to/pi-caveman/skills
```

(Run from a clone of this repo, substituting its absolute path.)

### Load via the package manifest

The repo's `package.json` carries a `pi` block so Pi can resolve the extension
and skills from the package directory:

```json
"pi": {
  "extensions": ["./extensions/caveman.ts"],
  "skills": ["./skills"]
}
```

Pi resolves `pi.extensions` relative to the package directory, so the extension
loads at its current path (no move into `.pi/extensions/` is needed). Point Pi at
the package directory with `pi install /path/to/pi-caveman` if you prefer a
persistent install over a per-session `pi -e`.

### First-time setup (for development)

```bash
npm install            # fetch the Pi SDK + TypeScript dev deps
npm test               # typecheck + extension/manifest/docs unit tests
```

## Modes

Six intensity modes (default **full**). A mode sticks until you change it or the
session ends.

| Mode | Command | Effect |
|------|---------|--------|
| **lite** | `/caveman lite` | Drop filler. Keep sentence structure. |
| **full** | `/caveman` | Drop articles, filler, pleasantries, hedging. Fragments OK. Default. |
| **ultra** | `/caveman ultra` | Extreme compression. Bare fragments. Abbreviate prose words; arrows (X → Y). |
| **wenyan-lite** | `/caveman wenyan-lite` | Classical Chinese (文言文) style, light compression. |
| **wenyan-full** | `/caveman wenyan` | Full 文言文. Maximum classical terseness. |
| **wenyan-ultra** | `/caveman wenyan-ultra` | Extreme classical terseness. |

`/caveman off` disables terse mode.

## Commands

| Command | What it does |
|---------|--------------|
| `/caveman [mode\|off]` | Enable a mode for this session (or turn it off). |
| `/caveman-help` | Show the quick-reference card. |
| `/caveman-commit [notes]` | Generate a terse Conventional Commit message. Does **not** commit. |
| `/caveman-review [scope]` | One-line-per-finding code review comments. |
| `/caveman-compress <file> [--force]` | Compress a prose file via the caveman-compress skill. `--force` overwrites an existing `.original` backup. |
| `/caveman-stats` | Load the stats skill (an on-demand, model-driven estimate). |

## Natural-language activation

You don't have to use a slash command. The extension watches your messages and
switches mode on phrases like:

- **Activate:** "caveman mode", "talk like caveman", "use caveman", "less
  tokens", "fewer tokens", "save tokens", "be brief" → enables **full** mode.
- **Deactivate:** "stop caveman", "normal mode", "disable caveman" → turns it
  off.

## Session and project-scoped behavior

Mode state is stored as a session entry, so it survives a `/reload` within the
same session. Since v0.4.3 it is also persisted per project in
`.pi/caveman-mode.json`, so a **new session in the same project directory**
restores the last used mode. A session entry always overrides the project
default, and a project without a state file falls back to `off`.

## Statusline indicator

When a UI is attached, the statusline shows the active mode as
`caveman:<mode>` (for example `caveman:ultra`), and appends live context usage
as `ctx:XX%` when Pi provides it. When caveman is off the indicator is cleared.

## Compression vs. upstream MCP shrink

Upstream caveman ships a `caveman-shrink` **MCP middleware** — a stdio proxy that
sits between an MCP client and an upstream MCP server and compresses the server's
tool descriptions. pi-caveman does **not** bundle it: that proxy works at the
MCP-client layer, independent of Pi, and upstream itself ships it as a separate
package — so it does not belong in this extension-plus-skills package.

The Pi-side equivalent is the `caveman-compress` skill, invoked via the
`/caveman-compress` command. It is prompt-only: the Pi agent itself compresses a
prose memory file in place (writing a `FILE.original.<ext>` backup) using its own
model and file tools, preserving code, URLs, and paths verbatim. No Python and no
external Claude CLI are involved — compression is performed by the host Pi agent,
the same way the other skills work.

## Attribution & license

pi-caveman is a Pi port of [caveman](https://github.com/JuliusBrussee/caveman)
by Julius Brussee. Licensed under the [MIT License](./LICENSE).
