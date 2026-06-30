import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
	ACTIVATION_RE,
	COMPLETION_VALUES,
	DEACTIVATION_RE,
	modeInstructions,
	normalizeMode,
	type StoredMode,
} from "./laconic-core.ts";
import { loadProjectMode, saveProjectMode } from "./laconic-state.ts";

const HELP_TEXT = `# Laconic for Pi

Commands:
- /laconic [low|medium|high] — enable terse mode for this session.
- /laconic off — disable terse mode.
- /laconic-help — show this card.
- /laconic-commit [notes] — generate Conventional Commit message. Does not commit.
- /laconic-review [scope] — terse review comments.
- /laconic-compress <file> [--force] — compress prose file via laconic-compress skill. --force overwrites an existing .original backup.

Mode persists across sessions in the same project via \`.pi/laconic-mode.json\`, and
survives /reload via session state. Code, commands, API names, file paths, and
exact errors stay verbatim.`;

export default function laconicExtension(pi: ExtensionAPI) {
	let mode: StoredMode = "off";

	function setStatus(ctx?: ExtensionContext) {
		if (!ctx?.hasUI) return;
		ctx.ui.setStatus("laconic", mode === "off" ? undefined : `laconic:${mode}`);
	}

	function persistMode(nextMode: StoredMode, ctx?: ExtensionContext) {
		mode = nextMode;
		pi.appendEntry("laconic-mode", { mode, timestamp: Date.now() });
		setStatus(ctx);
	}

	pi.on("session_start", (_event, ctx) => {
		mode = loadProjectMode(ctx.cwd) ?? "off";
		for (const entry of ctx.sessionManager.getBranch() as Array<{
			type?: string;
			customType?: string;
			data?: { mode?: unknown };
		}>) {
			if (entry.type !== "custom" || entry.customType !== "laconic-mode")
				continue;
			const restored =
				typeof entry.data?.mode === "string"
					? normalizeMode(entry.data.mode)
					: undefined;
			if (restored) mode = restored;
		}
		setStatus(ctx);
	});

	pi.registerCommand("laconic", {
		description: "Enable laconic terse mode: low, medium, high, or off",
		getArgumentCompletions: (prefix) => {
			const normalizedPrefix = prefix.trim().toLowerCase();
			const items = COMPLETION_VALUES.flatMap((value) =>
				value.startsWith(normalizedPrefix) ? [{ value, label: value }] : [],
			);
			return items.length > 0 ? items : null;
		},
		handler: async (args, ctx) => {
			const nextMode = normalizeMode(args);
			if (!nextMode) {
				ctx.ui.notify(`Unknown laconic mode: ${args || "(empty)"}`, "error");
				return;
			}
			persistMode(nextMode, ctx);
			saveProjectMode(ctx.cwd, nextMode);
			ctx.ui.notify(
				nextMode === "off" ? "Laconic disabled" : `Laconic ${nextMode} enabled`,
				"info",
			);
		},
	});

	pi.registerCommand("laconic-help", {
		description: "Show laconic command reference",
		handler: async () => {
			pi.sendMessage({
				customType: "laconic-help",
				content: HELP_TEXT,
				display: true,
			});
		},
	});

	pi.registerCommand("laconic-commit", {
		description: "Generate terse Conventional Commit message",
		handler: async (args) => {
			const task =
				args?.trim() ||
				"Generate a commit message for current repository changes. Inspect git status and diffs as needed. Do not run git commit.";
			pi.sendUserMessage(`/skill:laconic-commit ${task}`);
		},
	});

	pi.registerCommand("laconic-review", {
		description: "Generate terse code-review comments",
		handler: async (args) => {
			const task =
				args?.trim() ||
				"Review current repository changes or PR diff. Inspect git diff as needed. Findings only.";
			pi.sendUserMessage(`/skill:laconic-review ${task}`);
		},
	});

	pi.registerCommand("laconic-compress", {
		description:
			"Compress prose/memory file into laconic style (optional --force)",
		handler: async (args, ctx) => {
			const raw = args?.trim() ?? "";
			const tokens = raw.split(/\s+/).filter(Boolean);
			const force = tokens.includes("--force");
			const target = tokens.filter((t) => t !== "--force").join(" ");
			if (!target) {
				ctx.ui.notify("Usage: /laconic-compress <file> [--force]", "error");
				return;
			}
			pi.sendUserMessage(
				`/skill:laconic-compress ${target}${force ? " --force" : ""}`,
			);
		},
	});

	pi.on("input", (event, ctx) => {
		// Ignore the extension's own echoed input (self-echo guard).
		if (event.source !== "extension") {
			const text = (event.text ?? "").trim();
			if (DEACTIVATION_RE.test(text)) {
				if (mode !== "off") {
					persistMode("off", ctx);
					saveProjectMode(ctx.cwd, "off");
				}
			} else if (mode === "off" && ACTIVATION_RE.test(text)) {
				persistMode("medium", ctx);
				saveProjectMode(ctx.cwd, "medium");
			}
		}
		return { action: "continue" as const };
	});

	pi.on("turn_end", (_event, ctx) => {
		setStatus(ctx);
	});

	pi.on("before_agent_start", (event) => {
		if (mode === "off") return undefined;
		return {
			systemPrompt: `${event.systemPrompt}\n\n${modeInstructions(mode)}`,
		};
	});
}
