import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const readmePath = join(repoRoot, "README.md");

test("root README.md exists", () => {
	assert.ok(existsSync(readmePath), "README.md must exist at the repo root");
});

test("README documents the confirmed `pi -e` install mechanism", () => {
	const readme = readFileSync(readmePath, "utf8");
	assert.ok(
		readme.includes("pi -e"),
		"README must document the `pi -e` load mechanism confirmed in Task 1",
	);
});

test("README documents the GitHub install URL", () => {
	const readme = readFileSync(readmePath, "utf8");
	assert.ok(
		readme.includes("pi install https://github.com/kulapard/pi-laconic"),
		"README must document the pi install GitHub URL mechanism",
	);
});

test("README lists the three intensity modes", () => {
	const readme = readFileSync(readmePath, "utf8").toLowerCase();
	for (const mode of ["lite", "full", "ultra"]) {
		assert.ok(readme.includes(mode), `README must mention the "${mode}" mode`);
	}
});

test("README documents the /laconic command", () => {
	const readme = readFileSync(readmePath, "utf8");
	assert.ok(
		readme.includes("/laconic"),
		"README must document the /laconic command",
	);
});
