<p align="center">
  <img src="./assets/logo-mark.svg" alt="pi-laconic logo: Pi.dev-style pixel Spartan lambda" width="120">
</p>

<h1 align="center">pi-laconic</h1>

<p align="center">
  <strong>Philip: “If I invade…” · Sparta: “If.”</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pi-laconic"><img src="https://img.shields.io/npm/v/pi-laconic" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license: MIT"></a>
  <a href="https://github.com/kulapard/pi-laconic/actions/workflows/ci.yml"><img src="https://github.com/kulapard/pi-laconic/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center"><a href="#examples">Examples</a> • <a href="#install">Install</a> • <a href="#quick-start">Quick start</a> • <a href="#commands">Commands</a> • <a href="#compression">Compression</a></p>

---

A [Pi](https://github.com/earendil-works/pi) package that makes agents answer in
laconic Spartan style: short, precise, low-filler output. It cuts roughly 65–75%
of output tokens while preserving code, commands, API names, file paths, and exact
error strings verbatim.

## Why "laconic"?

Laconia was Sparta's region. Spartans were famous for saying little and meaning
much.

Philip II threatened: "If I invade Laconia, I will raze your city." Sparta
answered: **"If."**

`pi-laconic` does the same for agent output: keep substance, cut fluff.

## Examples

<table>
<tr>
<td width="50%" valign="top">

### Normal

> In Python, if you modify a list while iterating over it with a `for` loop, you can skip elements or get unexpected results because the iterator's index shifts when items are removed. Instead, iterate over a copy of the list using `list(items)` or a list comprehension, then modify the original list afterward.

</td>
<td width="50%" valign="top">

### `/laconic`

> Don't mutate list while iterating. Index shifts → skipped items. Iterate copy: `for item in list(items):`. Or use list comprehension.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Normal

> To reduce your Docker image size, use a multi-stage build. Start with a builder stage that compiles your application, then copy only the compiled artifacts into a smaller runtime image based on Alpine or Distroless. For example, `FROM node:20 AS builder`, then `COPY --from=builder /app/dist /app/dist` in the final stage.

</td>
<td width="50%" valign="top">

### `/laconic`

> Multi-stage build → smaller image. Compile in `node:20 AS builder`. Copy artifacts to runtime image: `COPY --from=builder /app/dist /app/dist`.

</td>
</tr>
</table>

Same fix, fewer tokens. Code, commands, and exact strings stay verbatim.

Laconic preserves your language — it compresses style, not the underlying tongue.
Portuguese, Spanish, French, or any other language stays in its own words.

## Mode variants

One scenario, three intensities.

> **Prompt:** Why does my Python script fail with `UnboundLocalError`?

<table>
<tr>
<td width="33%" valign="top">

### `/laconic low`

You assigned a value to a variable inside a function after referencing it. In Python, any assignment in a function makes the variable local to that scope. To modify a variable from the outer scope, declare it with `nonlocal` or `global`, or pass it as an argument.

</td>
<td width="33%" valign="top">

### `/laconic medium`

Assignment inside function makes variable local. `UnboundLocalError` means outer var referenced before assignment. Use `nonlocal` for enclosing scope, `global` for module scope.

</td>
<td width="33%" valign="top">

### `/laconic high`

Inner assignment → local var. `UnboundLocalError` = outer ref before local assignment. Use `nonlocal`/`global`.

</td>
</tr>
</table>

## Install

pi-laconic is published to npm as
[`pi-laconic`](https://www.npmjs.com/package/pi-laconic).
Install it into a Pi setup with:

```bash
pi install npm:pi-laconic
```

You can also load it straight from a checkout on disk — see the `pi -e`
mechanism below.

### Install from GitHub

The simplest way to load the latest version directly from the repository is:

```bash
pi install https://github.com/kulapard/pi-laconic
```

Pi resolves the `pi` block in `package.json` and loads both the extension and
all skills from the cloned directory.

### Load the extension directly (per-session)

For quick testing without installing, use Pi's `-e` flag for a single session:

```bash
pi -e /path/to/pi-laconic/extensions/laconic.ts --skill /path/to/pi-laconic/skills
```

(Run from a clone of this repo, substituting its absolute path.)

### Load via the package manifest

The repo's `package.json` carries a `pi` block so Pi can resolve the extension
and skills from the package directory:

```json
"pi": {
  "extensions": ["./extensions/laconic.ts"],
  "skills": ["./skills"]
}
```

Pi resolves `pi.extensions` relative to the package directory, so the extension
loads at its current path (no move into `.pi/extensions/` is needed). Point Pi at
the package directory with `pi install /path/to/pi-laconic` if you prefer a
persistent install over a per-session `pi -e`.

### First-time setup (for development)

```bash
npm install            # fetch the Pi SDK + TypeScript dev deps
npm test               # typecheck + extension/manifest/docs unit tests
```

## Quick start

After installing, type `/laconic` in any Pi session. The statusline shows
`laconic:medium`. Say "normal mode" or run `/laconic off` to turn it off.

## Modes

Three intensity modes (default **medium**). A mode sticks until you change it or the
session ends.

| Mode | Command | Effect |
|------|---------|--------|
| **low** | `/laconic low` | Drop filler. Keep sentence structure. |
| **medium** | `/laconic` (default) | Drop articles, filler, pleasantries, hedging. Fragments OK. |
| **high** | `/laconic high` | Extreme compression. Bare fragments. Abbreviate prose words; arrows (X → Y). |

`/laconic off` disables terse mode.

## Commands

| Command | What it does |
|---------|--------------|
| <code>/laconic [mode&#124;off]</code> | Enable a mode for this session (or turn it off). |
| `/laconic-help` | Show the quick-reference card. |
| `/laconic-commit [notes]` | Generate a terse Conventional Commit message. Does **not** commit. |
| `/laconic-review [scope]` | One-line-per-finding code review comments. |
| `/laconic-compress <file> [--force]` | Rewrite a memory file (e.g. `CLAUDE.md`, `AGENTS.md`) in place, compressed. `--force` overwrites an existing `.original.<ext>` backup. |

## Command examples

Generate a commit message:

```bash
/laconic-commit add JWT guard to login route
```

Review a PR scope:

```bash
/laconic-review src/middleware/auth.ts
```

## Natural-language activation

You don't have to use a slash command. The extension watches your messages and
switches mode on phrases like:

- **Activate:** "laconic mode", "talk like a Spartan", "be laconic", "use
  laconic", "less tokens", "fewer tokens", "save tokens", "be brief" → enables
  **medium** mode.
- **Deactivate:** "stop laconic", "normal mode", "disable laconic" → turns it
  off.

## Session and project-scoped behavior

Mode state is stored as a session entry, so it survives a `/reload` within the
same session. It is also persisted per project in `.pi/laconic-mode.json`, so a
**new session in the same project directory** restores the last used mode. A
session entry always overrides the project default, and a project without a state
file falls back to `off`.

## Statusline indicator

When a UI is attached, the statusline shows the active mode as
`laconic:<mode>` (for example `laconic:high`). When laconic is off the indicator is cleared.

## Compression

The `laconic-compress` skill is invoked via the `/laconic-compress` command. It
is prompt-only: the Pi agent itself compresses a memory file in place
(writing a `FILE.original.<ext>` backup) using its own model and file tools,
preserving code, URLs, and paths verbatim — the same way the other skills work.

## Attribution & license

pi-laconic is a terse-output extension for [Pi](https://github.com/earendil-works/pi)
inspired by [caveman](https://github.com/JuliusBrussee/caveman)
by Julius Brussee. Licensed under the [MIT License](./LICENSE).
See [CHANGELOG.md](./CHANGELOG.md) for release notes.
