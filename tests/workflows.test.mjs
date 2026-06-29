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
	assert.match(ci, /node-version:\s*['"]?24['"]?/, "ci must use Node 24");
});

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
	assert.match(pub, /run:\s*npm publish\s*$/, "must run npm publish");
	assert.match(pub, /node-version:\s*['"]?24['"]?/, "publish must use Node 24");
	// Load-bearing OIDC publish steps — deleting either silently breaks publish.
	assert.match(
		pub,
		/registry-url:/,
		"must set registry-url for OIDC token exchange",
	);
	assert.match(
		pub,
		/npm install -g npm@latest/,
		"must upgrade npm (>= 11.5.1 required for Trusted Publishing)",
	);
});

test("publish workflow guards against mismatched and duplicate publishes", () => {
	const pub = readWorkflow("publish.yml");
	assert.match(
		pub,
		/concurrency:/,
		"must declare a concurrency group so two tags can't publish at once",
	);
	assert.match(
		pub,
		/Verify tag matches package\.json version/,
		"must verify the pushed tag matches package.json version before publishing",
	);
});

test("publish workflow uses Trusted Publishing, not tokens", () => {
	const pub = readWorkflow("publish.yml");
	// Scope the check to the publish job — not merely "appears somewhere" —
	// so moving id-token to the top level (which would grant it to every job)
	// is caught.
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
