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
