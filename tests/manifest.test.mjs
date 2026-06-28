import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function readManifest() {
	const raw = readFileSync(join(repoRoot, "package.json"), "utf8");
	return JSON.parse(raw);
}

test("package.json is valid JSON and identifies the package", () => {
	const pkg = readManifest();
	assert.equal(pkg.name, "pi-caveman");
	assert.equal(pkg.version, "0.1.0");
	assert.equal(pkg.license, "MIT");
});

test("package.json declares ESM module type", () => {
	const pkg = readManifest();
	assert.equal(pkg.type, "module");
});

test("package.json engines require Node >=18", () => {
	const pkg = readManifest();
	assert.ok(pkg.engines, "engines block must exist");
	assert.equal(pkg.engines.node, ">=18");
});

test("keywords include the pi-package marker", () => {
	const pkg = readManifest();
	assert.ok(Array.isArray(pkg.keywords), "keywords must be an array");
	assert.ok(
		pkg.keywords.includes("pi-package"),
		'keywords must include "pi-package"',
	);
});

test("pi block points at the confirmed extension path and skills dir", () => {
	const pkg = readManifest();
	assert.ok(pkg.pi, "pi block must exist");
	assert.deepEqual(pkg.pi.extensions, ["./extensions/caveman.ts"]);
	assert.deepEqual(pkg.pi.skills, ["./skills"]);
});

test("devDependencies pin the Pi SDK and TypeScript", () => {
	const pkg = readManifest();
	assert.ok(pkg.devDependencies, "devDependencies must exist");
	assert.equal(
		pkg.devDependencies["@earendil-works/pi-coding-agent"],
		"^0.80.2",
	);
	assert.equal(pkg.devDependencies.typescript, "^5");
});

test("scripts wire up test, typecheck, and test:py", () => {
	const pkg = readManifest();
	assert.ok(pkg.scripts, "scripts must exist");
	assert.equal(
		pkg.scripts.test,
		"node --experimental-strip-types --test tests/**/*.test.mjs",
	);
	assert.equal(pkg.scripts.typecheck, "tsc --noEmit");
	assert.equal(pkg.scripts["test:py"], "pytest skills/caveman-compress");
});
