import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const compressDir = join(repoRoot, "skills", "laconic-compress");

const files = ["SKILL.md", "README.md"];

// Wrong-provider framing and broken assets that must not regress.
const forbiddenSubstrings = [
	"claude code", // wrong-provider framing
	"docs/assets", // broken image path
	"dancing-rock", // broken image asset
];

// The skill is prompt-only — the Pi agent performs the compression. No Python
// toolkit, no external model CLI. These tokens must not appear in the docs.
const forbiddenPythonResidue = [
	"python3",
	"scripts/",
	"call_claude",
	"compress.py",
	"validate.py",
	"detect.py",
	"subprocess",
	"pytest",
	"anthropic_api_key",
	"claude --print",
];

for (const file of files) {
	test(`laconic-compress/${file} has no Claude-Code / plugin-install residue`, () => {
		const content = readFileSync(join(compressDir, file), "utf8");
		const lower = content.toLowerCase();
		for (const needle of forbiddenSubstrings) {
			assert.ok(
				!lower.includes(needle),
				`${file} must not reference "${needle}"`,
			);
		}
	});

	test(`laconic-compress/${file} has no Python-toolkit residue`, () => {
		const content = readFileSync(join(compressDir, file), "utf8");
		const lower = content.toLowerCase();
		for (const needle of forbiddenPythonResidue) {
			assert.ok(
				!lower.includes(needle),
				`${file} is prompt-only and must not reference "${needle}"`,
			);
		}
	});
}

test("laconic-compress/README.md does not document a plugin-based install path", () => {
	const content = readFileSync(join(compressDir, "README.md"), "utf8");
	assert.doesNotMatch(
		content,
		/install (the )?`?laconic`? (plugin|once)/i,
		"README must not document the Claude-Code plugin install path",
	);
});

test("SKILL.md documents the in-place backup step", () => {
	const content = readFileSync(join(compressDir, "SKILL.md"), "utf8");
	assert.match(
		content,
		/\.original\./,
		"SKILL.md must document the <file>.original.<ext> backup",
	);
});

test("SKILL.md aborts on stale backup and restores only from the same invocation", () => {
	const content = readFileSync(join(compressDir, "SKILL.md"), "utf8");
	assert.match(
		content,
		/abort/i,
		"SKILL.md must tell the agent to abort when a backup already exists",
	);
	assert.match(
		content,
		/stale|same invocation|created during the same invocation/i,
		"SKILL.md must clarify that restoration is only from the same-invocation backup",
	);
});

test("the Python-only SECURITY.md is gone", () => {
	assert.ok(
		!existsSync(join(compressDir, "SECURITY.md")),
		"SECURITY.md documented the Python subprocess/Snyk rating and must be removed",
	);
});
