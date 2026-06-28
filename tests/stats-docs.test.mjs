import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const statsDir = join(repoRoot, "skills", "caveman-stats");

const files = ["SKILL.md", "README.md"];

// Phantom Claude-Code references that must not appear in the caveman-stats docs:
// Pi has no hooks layer, no decision:"block" API, no session-log reader,
// no ⛏ savings badge, and no lifetime-savings file.
const forbidden = [
	"hooks/",
	"caveman-stats.js",
	"caveman-mode-tracker.js",
	'decision: "block"',
	'decision:"block"',
	"session log",
	"session-log",
	"⛏",
	"lifetime-savings",
];

for (const file of files) {
	test(`caveman-stats/${file} has no phantom Claude-Code references`, () => {
		const content = readFileSync(join(statsDir, file), "utf8");
		const lower = content.toLowerCase();
		for (const needle of forbidden) {
			assert.ok(
				!lower.includes(needle.toLowerCase()),
				`${file} must not reference "${needle}"`,
			);
		}
	});
}

test("caveman-stats/SKILL.md keeps valid frontmatter", () => {
	const content = readFileSync(join(statsDir, "SKILL.md"), "utf8");
	assert.match(content, /^---\n/, "SKILL.md must open with YAML frontmatter");
	assert.match(content, /\nname: caveman-stats\n/, "frontmatter must keep name");
	assert.match(
		content,
		/\ndescription: /,
		"frontmatter must keep a description",
	);
});
