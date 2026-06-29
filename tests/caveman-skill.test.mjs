import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const skillPath = join(repoRoot, "skills", "caveman", "SKILL.md");

test("caveman/SKILL.md does not override caveman-commit / caveman-review", () => {
	const content = readFileSync(skillPath, "utf8");
	// The skill used to say "Code/commits/PRs: write normal", which clashed
	// with the terse-output caveman-commit and caveman-review skills. It must
	// now delegate to those skills for their specific outputs.
	assert.doesNotMatch(
		content,
		/\b(Code\/commits\/PRs|commits\/PRs):\s*write normal\b/,
		"SKILL.md must not tell the agent to write commits/PRs in normal mode",
	);
	assert.match(
		content,
		/caveman-commit/,
		"SKILL.md must reference caveman-commit for commit messages",
	);
	assert.match(
		content,
		/caveman-review/,
		"SKILL.md must reference caveman-review for review comments",
	);
});
