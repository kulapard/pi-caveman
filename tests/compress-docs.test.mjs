import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const compressDir = join(repoRoot, "skills", "caveman-compress");

const files = ["SKILL.md", "README.md"];

// Phantom / wrong-provider references that must not regress into the
// caveman-compress docs. The skill is shipped as a Pi package skill — not a
// "Claude Code skill" and not installed via a Claude-Code "plugin". The broken
// docs/assets image path must also stay gone (the directory does not exist).
const forbiddenSubstrings = [
	"claude code", // wrong-provider framing
	"docs/assets", // broken image path
	"dancing-rock", // broken image asset
];

for (const file of files) {
	test(`caveman-compress/${file} has no Claude-Code / plugin-install residue`, () => {
		const content = readFileSync(join(compressDir, file), "utf8");
		const lower = content.toLowerCase();
		for (const needle of forbiddenSubstrings) {
			assert.ok(
				!lower.includes(needle),
				`${file} must not reference "${needle}"`,
			);
		}
	});
}

test("caveman-compress/README.md does not document a plugin-based install path", () => {
	const content = readFileSync(join(compressDir, "README.md"), "utf8");
	// The upstream "Install the `caveman` plugin once" instruction is
	// Claude-Code-only and unrunnable on Pi. The Pi install path is `pi -e` /
	// `pi install` (documented in the root README).
	assert.doesNotMatch(
		content,
		/install (the )?`?caveman`? (plugin|once)/i,
		"README must not document the Claude-Code plugin install path",
	);
});
