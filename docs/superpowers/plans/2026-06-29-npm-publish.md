# npm Trusted Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the package to npm as `@kulapard/pi-laconic` and auto-publish from CI via npm Trusted Publishing (OIDC), with no stored tokens.

**Architecture:** Rename the package to a scoped name and add publish config to `package.json`. Add two GitHub Actions workflows: `ci.yml` (test on push/PR) and `publish.yml` (test + `npm publish` on `v*` tags, authenticating via OIDC). Lock the publish invariants with string-assertion unit tests that match the repo's existing `manifest`/`readme` test style (no new dependencies).

**Tech Stack:** npm (Node test runner `node --test` with `--experimental-strip-types`), TypeScript (`tsc --noEmit`), GitHub Actions, npm Trusted Publishing.

## Global Constraints

- Package name: `@kulapard/pi-laconic` (bare `pi-laconic` is owned by another user).
- Ship TypeScript source — **no** compile/`dist` step. The `pi` block stays `"extensions": ["./extensions/laconic.ts"]`, `"skills": ["./skills"]`.
- Publishes must be public: `publishConfig.access` = `"public"`.
- Trusted Publishing: workflow needs `id-token: write`; **no** `NODE_AUTH_TOKEN`, **no** `secrets.NPM_TOKEN`, **no** `--provenance` flag (provenance is automatic). Requires npm CLI >= 11.5.1, Node >= 22.14 — CI uses Node 24 plus `npm install -g npm@latest`.
- Publish tag trigger is `v[0-9]*`; the published tarball excludes dev test files via `files` `!` negations (see Task 1). (Both refined post-review — see "Post-review revisions" at the end.)
- Tests use string `includes`/regex assertions only — do not add a YAML parser or any dependency.
- Run the full suite with `npm test` (runs `pretest` → `tsc --noEmit`, then the node tests). Expected baseline: all green.
- Commit messages end with the `Co-Authored-By` trailer used in this repo.

## File Structure

- `package.json` — rename + publish config (`name`, `publishConfig`, `files`, `repository`, `bugs`, `homepage`, `prepublishOnly`).
- `package-lock.json` — regenerated to match the new name.
- `tests/manifest.test.mjs` — assert the new name + publish config.
- `tests/workflows.test.mjs` — **new**; assert both workflows exist and hold the Trusted-Publishing invariants.
- `.github/workflows/ci.yml` — **new**; test on push/PR.
- `.github/workflows/publish.yml` — **new**; test + publish on tags.
- `README.md` — correct the stale "no published origin remote" note; add the npm install path.

---

### Task 1: Rename package to `@kulapard/pi-laconic` + add publish config

**Files:**
- Modify: `tests/manifest.test.mjs:15-20` (name assertion + new publish-config asserts)
- Modify: `package.json` (name, publishConfig, files, repository, bugs, homepage, prepublishOnly)
- Modify: `package-lock.json` (regenerated)

**Interfaces:**
- Consumes: nothing.
- Produces: `package.json` with `name` = `"@kulapard/pi-laconic"`, `publishConfig.access` = `"public"`, `files` = `["extensions","skills","agents","AGENTS.md"]`, `scripts.prepublishOnly` = `"npm test"`. Later tasks rely on these exact values.

- [ ] **Step 1: Update the failing assertions in `tests/manifest.test.mjs`**

Replace the first test (currently lines 15-20) with:

```javascript
test("package.json is valid JSON and identifies the package", () => {
	const pkg = readManifest();
	assert.equal(pkg.name, "@kulapard/pi-laconic");
	assert.equal(pkg.version, "0.1.0");
	assert.equal(pkg.license, "MIT");
});

test("package.json carries public publish config", () => {
	const pkg = readManifest();
	assert.ok(pkg.publishConfig, "publishConfig block must exist");
	assert.equal(pkg.publishConfig.access, "public");
});

test("files whitelist ships the extension, skills, and agents", () => {
	const pkg = readManifest();
	assert.ok(Array.isArray(pkg.files), "files must be an array");
	for (const entry of ["extensions", "skills", "agents", "AGENTS.md"]) {
		assert.ok(
			pkg.files.includes(entry),
			`files whitelist must include "${entry}"`,
		);
	}
});

test("prepublishOnly gates publish on the test suite", () => {
	const pkg = readManifest();
	assert.match(
		pkg.scripts.prepublishOnly,
		/npm test/,
		"prepublishOnly must run the test suite before publish",
	);
});
```

- [ ] **Step 2: Run the manifest tests to verify they fail**

Run: `node --experimental-strip-types --test tests/manifest.test.mjs`
Expected: FAIL — name assertion expects `@kulapard/pi-laconic` but gets `pi-laconic`; `publishConfig`/`files`/`prepublishOnly` asserts fail (fields absent).

- [ ] **Step 3: Edit `package.json`**

Set `name` and add the publish fields. The top of the file becomes:

```json
{
  "name": "@kulapard/pi-laconic",
  "version": "0.1.0",
  "description": "Laconic for Pi: ultra-compressed agent output that preserves technical substance. Six intensity modes, slash commands, natural-language activation, and a session statusline.",
  "type": "module",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/kulapard/pi-laconic.git"
  },
  "bugs": {
    "url": "https://github.com/kulapard/pi-laconic/issues"
  },
  "homepage": "https://github.com/kulapard/pi-laconic#readme",
  "publishConfig": {
    "access": "public"
  },
  "files": [
    "extensions",
    "skills",
    "agents",
    "AGENTS.md",
    "!**/__pycache__",
    "!**/*.pyc",
    "!skills/**/tests"
  ],
  "engines": {
    "node": ">=18"
  },
```

In the `scripts` block, add `prepublishOnly` (keep the other scripts unchanged):

```json
  "scripts": {
    "pretest": "npm run typecheck",
    "test": "node --experimental-strip-types --test tests/**/*.test.mjs",
    "typecheck": "tsc --noEmit",
    "test:py": ".venv/bin/pytest skills/laconic-compress",
    "prepublishOnly": "npm test"
  },
```

- [ ] **Step 4: Resync the lockfile**

The lockfile still has the old name in two places, which would break `npm ci` in CI.

Run: `npm install`
Expected: `package-lock.json` updates its `name` fields to `@kulapard/pi-laconic`; no dependency version changes.

Verify: `git diff --stat package-lock.json` shows only the lockfile changed, and `grep -c '"@kulapard/pi-laconic"' package-lock.json` returns `>= 1`.

- [ ] **Step 5: Run the manifest tests to verify they pass**

Run: `node --experimental-strip-types --test tests/manifest.test.mjs`
Expected: PASS — all manifest tests green.

- [ ] **Step 6: Run the full suite to confirm nothing else regressed**

Run: `npm test`
Expected: PASS — `pretest` typecheck clean, all node tests green.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tests/manifest.test.mjs
git commit -m "build: rename to @kulapard/pi-laconic and add npm publish config

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Update README install docs

**Files:**
- Modify: `README.md` (Install section — remove stale remote note, add npm path)

**Interfaces:**
- Consumes: package name `@kulapard/pi-laconic` from Task 1.
- Produces: README documenting `pi install @kulapard/pi-laconic`, still mentioning `pi -e` (the readme test requires it).

- [ ] **Step 1: Confirm the README test guards the strings we must keep**

Run: `node --experimental-strip-types --test tests/readme.test.mjs`
Expected: PASS now. These tests assert the README keeps `pi -e`, the mode names (`lite`/`full`/`ultra`/`wenyan`), and `/laconic`. Keep all of those strings present through the edit.

- [ ] **Step 2: Edit the Install section of `README.md`**

Replace the stale paragraph:

```markdown
pi-laconic is a **local package** — there is no published origin remote; you
load it from a checkout on disk.
```

with:

```markdown
pi-laconic publishes to npm as
[`@kulapard/pi-laconic`](https://www.npmjs.com/package/@kulapard/pi-laconic).
Once the first release is live, install it into a Pi setup with:

```bash
pi install npm:@kulapard/pi-laconic
```

You can also load it straight from a checkout on disk (no install needed) — see
the `pi -e` mechanism below.
```

Leave the rest of the Install section (the `pi -e` instructions, the package
manifest block, and First-time setup) unchanged.

- [ ] **Step 3: Run the README tests to verify they still pass**

Run: `node --experimental-strip-types --test tests/readme.test.mjs`
Expected: PASS — `pi -e`, mode names, and `/laconic` still present.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document npm install path for @kulapard/pi-laconic

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: CI workflow (test on push/PR)

**Files:**
- Create: `tests/workflows.test.mjs`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `tests/workflows.test.mjs` exporting nothing but defining a `repoRoot`-based `readWorkflow(name)` helper reused in Task 4; `.github/workflows/ci.yml`.

- [ ] **Step 1: Write the failing test**

Create `tests/workflows.test.mjs`:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function readWorkflow(name) {
	return readFileSync(join(repoRoot, ".github", "workflows", name), "utf8");
}

test("ci workflow exists", () => {
	assert.ok(
		existsSync(join(repoRoot, ".github", "workflows", "ci.yml")),
		"ci.yml must exist",
	);
});

test("ci workflow runs the test suite on push and pull_request", () => {
	const ci = readWorkflow("ci.yml");
	assert.match(ci, /on:/, "must declare triggers");
	assert.match(ci, /push:/, "must trigger on push");
	assert.match(ci, /pull_request:/, "must trigger on pull_request");
	assert.match(ci, /npm ci/, "must install with npm ci");
	assert.match(ci, /npm test/, "must run the test suite");
});
```

- [ ] **Step 2: Run the workflows test to verify it fails**

Run: `node --experimental-strip-types --test tests/workflows.test.mjs`
Expected: FAIL — `ci.yml must exist` (file not created yet).

- [ ] **Step 3: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npm test
```

- [ ] **Step 4: Run the workflows test to verify it passes**

Run: `node --experimental-strip-types --test tests/workflows.test.mjs`
Expected: PASS — ci.yml tests green.

- [ ] **Step 5: Commit**

```bash
git add tests/workflows.test.mjs .github/workflows/ci.yml
git commit -m "ci: add test workflow for push and pull requests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Publish workflow (Trusted Publishing on tags)

**Files:**
- Modify: `tests/workflows.test.mjs` (append publish-workflow assertions)
- Create: `.github/workflows/publish.yml`

**Interfaces:**
- Consumes: the `readWorkflow(name)` helper from Task 3.
- Produces: `.github/workflows/publish.yml` that publishes via OIDC.

- [ ] **Step 1: Append the failing tests to `tests/workflows.test.mjs`**

Add at the end of the file:

```javascript
test("publish workflow exists", () => {
	assert.ok(
		existsSync(join(repoRoot, ".github", "workflows", "publish.yml")),
		"publish.yml must exist",
	);
});

test("publish workflow triggers on version tags and publishes", () => {
	const pub = readWorkflow("publish.yml");
	assert.match(pub, /tags:/, "must trigger on tags");
	assert.match(pub, /v\[0-9\]\*/, "must trigger on semver-style v tags");
	assert.match(pub, /npm publish/, "must run npm publish");
	assert.match(pub, /node-version:\s*['"]?24['"]?/, "publish must use Node 24");
	assert.match(pub, /registry-url:/, "must set registry-url for OIDC token exchange");
	assert.match(pub, /npm install -g npm@latest/, "must upgrade npm (>= 11.5.1)");
});

test("publish workflow guards against mismatched and duplicate publishes", () => {
	const pub = readWorkflow("publish.yml");
	assert.match(pub, /concurrency:/, "must declare a concurrency group");
	assert.match(
		pub,
		/Verify tag matches package\.json version/,
		"must verify the tag matches package.json version before publishing",
	);
});

test("publish workflow uses Trusted Publishing, not tokens", () => {
	const pub = readWorkflow("publish.yml");
	assert.match(
		pub,
		/publish:[\s\S]*permissions:[\s\S]*id-token:\s*write/,
		"id-token: write must be scoped to the publish job",
	);
	assert.doesNotMatch(
		pub,
		/NODE_AUTH_TOKEN/,
		"Trusted Publishing must not use NODE_AUTH_TOKEN",
	);
	assert.doesNotMatch(
		pub,
		/NPM_TOKEN/,
		"Trusted Publishing must not reference an NPM_TOKEN secret",
	);
	assert.doesNotMatch(
		pub,
		/--provenance/,
		"provenance is automatic under Trusted Publishing; no flag needed",
	);
});
```

- [ ] **Step 2: Run the workflows test to verify the new tests fail**

Run: `node --experimental-strip-types --test tests/workflows.test.mjs`
Expected: FAIL — `publish.yml must exist` (file not created yet).

- [ ] **Step 3: Create `.github/workflows/publish.yml`**

```yaml
name: Publish

on:
  push:
    tags:
      - 'v[0-9]*'

concurrency:
  group: publish-${{ github.ref }}
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          registry-url: 'https://registry.npmjs.org'
      - run: npm install -g npm@latest
      - run: npm ci
      - name: Verify tag matches package.json version
        run: |
          TAG="${GITHUB_REF_NAME#v}"
          PKG="$(node -p "require('./package.json').version")"
          if [ "$TAG" != "$PKG" ]; then
            echo "::error::tag v$TAG does not match package.json version $PKG"
            exit 1
          fi
      # `npm publish` runs prepublishOnly (npm test) as the gate — no separate
      # test job needed.
      - run: npm publish
```

- [ ] **Step 4: Run the workflows test to verify all pass**

Run: `node --experimental-strip-types --test tests/workflows.test.mjs`
Expected: PASS — all ci + publish assertions green.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — typecheck clean, every node test green (manifest, readme, workflows, and the existing suites).

- [ ] **Step 6: Commit**

```bash
git add tests/workflows.test.mjs .github/workflows/publish.yml
git commit -m "ci: publish to npm via Trusted Publishing on version tags

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Post-implementation manual steps (operator: kulapard)

These are **not** code tasks — they happen on npmjs.com and the local machine, once, after the code above is merged.

1. **Bootstrap publish (local, one-time):** from a clean checkout on the new name, `npm login` then `npm publish`. `publishConfig.access: public` makes it public. This creates `@kulapard/pi-laconic@0.1.0` so the package exists. Note: the local working tree may contain dev artifacts (gitignored `__pycache__/*.pyc` files from running pytest) that a `files`-whitelisted directory ships wholesale, so run `git clean -fdx` (or publish from a fresh clone) before the bootstrap `npm publish` to keep the tarball clean — CI publishes from a clean checkout and is unaffected.
2. **Enable Trusted Publishing:** npmjs.com → the package → Settings → Trusted Publisher → GitHub Actions → user `kulapard`, repo `pi-laconic`, workflow filename `publish.yml`, allowed action `npm publish`.
3. *(optional hardening)* Settings → "Require two-factor authentication and disallow tokens".
4. **Release flow thereafter:** bump `version` in `package.json` → commit → `git tag vX.Y.Z` → `git push --tags`. The `publish.yml` workflow publishes via OIDC; no local login needed.

---

## Self-Review

**Spec coverage:**
- Scoped name → Task 1. publishConfig/files/repository/prepublishOnly → Task 1. Lockfile resync (implied by `npm ci` in CI) → Task 1 Step 4. README → Task 2. ci.yml → Task 3. publish.yml + OIDC/no-token/no-provenance + tag trigger → Task 4. Manual bootstrap + Trusted Publisher config → Post-implementation section. All spec sections covered.

**Placeholder scan:** No TBD/TODO; every code and YAML block is complete; every command has expected output.

**Type/name consistency:** `@kulapard/pi-laconic`, `publishConfig.access`, `files` entries (`extensions`/`skills`/`agents`), `prepublishOnly` = `npm test`, `readWorkflow(name)` helper (defined Task 3, reused Task 4), workflow filenames `ci.yml`/`publish.yml` — all consistent across tasks.

---

## Post-review revisions (2026-06-29)

A `/review` pass on PR #1 surfaced 8 findings; the fixes are folded into the
task blocks above so a re-run reproduces the final state, not the pre-review
version:

- **Install command** (Task 2): `pi install @kulapard/pi-laconic` →
  `pi install npm:@kulapard/pi-laconic`. Pi requires the `npm:` source prefix;
  the bare form fails. README wording also softened to "Once the first release
  is live" since the package 404s until the manual bootstrap publish.
- **Tarball hygiene** (Task 1): `files` gained `!**/__pycache__`, `!**/*.pyc`,
  `!skills/**/tests`. npm bypasses `.npmignore`/`.gitignore` when a `files`
  whitelist is set, so the exclusions must live in `files`. Result: 287 kB/51
  files → 94 kB/31 files.
- **publish.yml** (Task 4): dropped the redundant `test` job — `prepublishOnly:
  npm test` already gates every publish (CI and the manual bootstrap), so the
  gate is covered by Task 1's `prepublishOnly` assertion rather than a
  `needs: test` check. Tag trigger tightened to `v[0-9]*`; added a tag==version
  guard step and a `concurrency` group.
- **Workflow tests** (Task 4): `id-token` assertion scoped to the publish job;
  added assertions for `registry-url`, the npm upgrade, `concurrency`, and the
  version-guard step.
- **Manifest test** (Task 1): the `files` loop now also asserts `AGENTS.md`.
