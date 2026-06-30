import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

// Every laconic-crew doc file. Pi 0.80.2 has no subagent/`agents/` mechanism, so
// these are reference personas — but they must not carry phantom Claude-Code
// references (a hooks layer, a test_symlink_flag.js fixture, Claude-Code
// `tools:`/`model:` frontmatter, or the named Claude-only subagent presets).
const laconicCrewFiles = [
	join(repoRoot, "skills", "laconic-crew", "SKILL.md"),
	join(repoRoot, "skills", "laconic-crew", "README.md"),
	join(repoRoot, "agents", "laconic-builder.md"),
	join(repoRoot, "agents", "laconic-investigator.md"),
	join(repoRoot, "agents", "laconic-reviewer.md"),
];

// Plain-substring forbidden tokens (matched case-insensitively).
const forbiddenSubstrings = [
	"hooks/",
	"test_symlink_flag.js",
	"feature-dev:",
	// `code-architect` is a Claude-Code subagent preset. Catch it directly so a
	// bare reference (without the `feature-dev:` namespace) is still flagged.
	"code-architect",
];

for (const file of laconicCrewFiles) {
	const rel = file.slice(repoRoot.length + 1);

	test(`${rel} has no phantom Claude-Code substrings`, () => {
		const lower = readFileSync(file, "utf8").toLowerCase();
		for (const needle of forbiddenSubstrings) {
			assert.ok(
				!lower.includes(needle.toLowerCase()),
				`${rel} must not reference "${needle}"`,
			);
		}
	});

	test(`${rel} has no Claude-Code tools/model frontmatter`, () => {
		const content = readFileSync(file, "utf8");
		// Claude-Code agent frontmatter declares a tools-array (`tools: [Read, ...]`)
		// and a `model:` line. Pi loads neither, so neither may appear.
		assert.doesNotMatch(
			content,
			/^tools:\s*\[/m,
			`${rel} must not declare a Claude-Code tools-array frontmatter line`,
		);
		assert.doesNotMatch(
			content,
			/^model:\s*haiku/m,
			`${rel} must not declare a Claude-Code "model: haiku" frontmatter line`,
		);
	});

	test(`${rel} does not name Claude-only subagent presets`, () => {
		const content = readFileSync(file, "utf8");
		// `Explore` / `Code Reviewer` are Claude-Code built-in subagent presets;
		// Pi has no equivalent. Match them as whole words (avoid catching the
		// verb "explore" / "review" in ordinary prose).
		assert.doesNotMatch(
			content,
			/\bExplore\b/,
			`${rel} must not reference the Claude-only "Explore" preset`,
		);
		assert.doesNotMatch(
			content,
			/\bCode Reviewer\b/,
			`${rel} must not reference the Claude-only "Code Reviewer" preset`,
		);
	});
}
