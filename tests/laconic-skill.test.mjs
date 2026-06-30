import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const skillPath = join(repoRoot, "skills", "laconic", "SKILL.md");

test("laconic/SKILL.md does not override laconic-commit / laconic-review", () => {
	const content = readFileSync(skillPath, "utf8");
	// The skill used to say "Code/commits/PRs: write normal", which clashed
	// with the terse-output laconic-commit and laconic-review skills. It must
	// now delegate to those skills for their specific outputs.
	assert.doesNotMatch(
		content,
		/\b(Code\/commits\/PRs|commits\/PRs):\s*write normal\b/,
		"SKILL.md must not tell the agent to write commits/PRs in normal mode",
	);
	assert.match(
		content,
		/laconic-commit/,
		"SKILL.md must reference laconic-commit for commit messages",
	);
	assert.match(
		content,
		/laconic-review/,
		"SKILL.md must reference laconic-review for review comments",
	);
});
