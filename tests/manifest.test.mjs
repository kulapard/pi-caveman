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
	assert.equal(pkg.name, "@kulapard/pi-caveman");
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
	for (const entry of ["extensions", "skills", "agents"]) {
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
	// Substring (not exact-string) checks so the script wording can evolve
	// without a brittle test break — we only assert the load-bearing parts.
	assert.match(
		pkg.scripts.test,
		/--test/,
		"test script must run the node --test runner",
	);
	assert.match(
		pkg.scripts.test,
		/--experimental-strip-types/,
		"test script must strip TS types (tests import .ts modules)",
	);
	assert.match(
		pkg.scripts.typecheck,
		/tsc --noEmit/,
		"typecheck script must run tsc --noEmit",
	);
	assert.match(
		pkg.scripts["test:py"],
		/pytest/,
		"test:py script must invoke pytest",
	);
	assert.match(
		pkg.scripts["test:py"],
		/skills\/caveman-compress/,
		"test:py must target the caveman-compress suite",
	);
});
