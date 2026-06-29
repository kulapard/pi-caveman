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

test("publish workflow exists", () => {
	assert.ok(
		existsSync(join(repoRoot, ".github", "workflows", "publish.yml")),
		"publish.yml must exist",
	);
});

test("publish workflow triggers on version tags and publishes", () => {
	const pub = readWorkflow("publish.yml");
	assert.match(pub, /tags:/, "must trigger on tags");
	assert.match(pub, /v\*/, "must match v* tags");
	assert.match(pub, /npm publish/, "must run npm publish");
});

test("publish workflow uses Trusted Publishing, not tokens", () => {
	const pub = readWorkflow("publish.yml");
	assert.match(
		pub,
		/id-token:\s*write/,
		"must request the OIDC id-token permission",
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
