# Design: Publish pi-laconic to npm via Trusted Publishing

Date: 2026-06-29
Status: Approved

## Goal

Make `pi-laconic` installable from the public npm registry and publish it
automatically from CI, using npm **Trusted Publishing** (OIDC) — no long-lived
`NPM_TOKEN` stored anywhere.

## Constraints / facts established

- The bare name `pi-laconic` is already owned on npm by `jonjonrankin`
  (currently v1.0.7). We cannot publish under it. → publish under the scoped
  name **`@kulapard/pi-laconic`** (matches the GitHub owner `kulapard`).
- Pi loads `.ts` extensions directly, so there is **no compile step**. We ship
  the TypeScript source (`extensions/*.ts`) and the `skills/` tree as-is.
- Git origin already exists: `github.com/kulapard/pi-laconic` (the README's
  "no published origin remote" note is stale and will be corrected).
- Trusted Publishing requirements (npm docs): npm CLI **>= 11.5.1**, Node
  **>= 22.14**. No `NODE_AUTH_TOKEN`. Provenance is generated **automatically**
  (no `--provenance` flag). Workflow needs `id-token: write`.
- Trusted publisher is configured on the package's settings page on npmjs.com,
  which requires the package to **already exist** → the first publish is a
  one-time manual/local publish; CI takes over afterward.

## Changes

### 1. `package.json`

- `name`: `pi-laconic` → `@kulapard/pi-laconic`
- add `"publishConfig": { "access": "public" }` (scoped packages default to
  restricted; this keeps both the bootstrap and CI publishes public)
- add `"files": ["extensions", "skills", "agents", "AGENTS.md",
  "!**/__pycache__", "!**/*.pyc", "!skills/**/tests"]` — tarball whitelist
  (`package.json`, `README.md`, `LICENSE` are always included; `docs/` and
  `tsconfig.json` are excluded). The `!` negations prune Python dev test files
  and bytecode that `skills/` would otherwise ship wholesale — npm bypasses
  `.npmignore`/`.gitignore` under a `files` whitelist, so the exclusions must
  live in `files` itself.
- add `"repository"`, `"bugs"`, `"homepage"` pointing at
  `github.com/kulapard/pi-laconic`
- add `"prepublishOnly": "npm test"` — gate every publish on typecheck + node
  tests
- `version` stays `0.1.0` for the first publish
- the `pi` block is unchanged — `./extensions/laconic.ts` ships at that path in
  the tarball, so Pi resolves it from `node_modules` the same way

### 2. `.github/workflows/ci.yml`

On push and pull_request to `master`: `actions/setup-node` (Node 24) →
`npm ci` → `npm test`. Validates every change.

### 3. `.github/workflows/publish.yml`

Trigger: push of a tag matching `v[0-9]*`.

```yaml
concurrency:
  group: publish-${{ github.ref }}
  cancel-in-progress: false

jobs:
  publish:
    permissions:
      id-token: write   # OIDC for Trusted Publishing
      contents: read
```

Single `publish` job (no separate test job — `prepublishOnly: npm test`
already gates every publish, including the manual bootstrap):
  - `actions/setup-node` with `node-version: 24` and
    `registry-url: https://registry.npmjs.org`
  - `npm install -g npm@latest` — guarantee npm >= 11.5.1
  - `npm ci`
  - a "Verify tag matches package.json version" step — fails the run if the
    pushed `vX.Y.Z` tag does not equal `package.json` `version`
  - `npm publish` — no token, no `--provenance`, OIDC + provenance automatic

No repository secrets are required.

### 4. `tests/manifest.test.mjs`

- update the name assertion: `pkg.name === "@kulapard/pi-laconic"`
- add assertions that publish config stays present:
  - `pkg.publishConfig.access === "public"`
  - `pkg.files` includes `extensions`, `skills`, `agents`
- existing assertions (version, license, type, engines, keywords, pi block,
  devDependencies, scripts) stay; `prepublishOnly` may be covered too

### 5. `README.md`

- remove the stale "there is no published origin remote" claim
- add an npm install path: `pi install npm:@kulapard/pi-laconic` (Pi requires
  the `npm:` source prefix)
- keep the `pi -e` mechanism documented (the README test asserts it)

## Manual steps (operator: kulapard)

1. **Bootstrap once (local):** with the renamed package, `npm publish` (public
   via `publishConfig`) to create `@kulapard/pi-laconic@0.1.0`. Requires
   `npm login` first.
2. **Enable Trusted Publishing:** npmjs.com → package Settings → Trusted
   Publisher → user `kulapard`, repo `pi-laconic`, workflow `publish.yml`,
   allowed action `npm publish`.
3. *(optional hardening)* package Settings → "Require two-factor authentication
   and disallow tokens".
4. **Releases thereafter:** bump `version` → `git tag vX.Y.Z` → `git push
   --tags` → CI publishes via OIDC.

## Out of scope

- No TS→JS compile/`dist` step (Pi consumes `.ts` directly).
- No changelog/release-notes automation.
- No multi-registry (GitHub Packages) publishing.

## Post-review revisions (2026-06-29)

A `/review` pass on PR #1 produced these changes, folded into the sections above:

- **Install command:** `pi install @kulapard/pi-laconic` → `pi install
  npm:@kulapard/pi-laconic` (the `npm:` source prefix is required by Pi).
- **README wording:** softened from "is published to npm" to "Once the first
  release is live" — the package does not exist on the registry until the
  manual bootstrap publish.
- **Tarball hygiene:** `files` gained `!` negations to drop `**/__pycache__`,
  `**/*.pyc`, and `skills/**/tests` (287 kB/51 files → 94 kB/31 files).
- **publish.yml:** dropped the redundant `test` job (the gate is
  `prepublishOnly`), tightened the tag trigger to `v[0-9]*`, added a
  tag==version guard step, and added a `concurrency` group.
- **Workflow tests:** scoped the `id-token` assertion to the publish job and
  added assertions for `registry-url`, the npm upgrade, `concurrency`, and the
  version-guard step.
