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
} from "./caveman-core.ts";
import { loadProjectMode, saveProjectMode } from "./caveman-state.ts";

const HELP_TEXT = `# Caveman for Pi

Commands:
- /caveman [lite|full|ultra|wenyan|wenyan-lite|wenyan-full|wenyan-ultra] — enable terse mode for this session.
- /caveman off — disable terse mode.
- /caveman-help — show this card.
- /caveman-commit [notes] — generate Conventional Commit message. Does not commit.
- /caveman-review [scope] — terse review comments.
- /caveman-compress <file> — compress prose file via caveman-compress skill.
- /caveman-stats — load stats skill/help.

Mode persists across sessions in the same project via \`.pi/caveman-mode.json\`, and
survives /reload via session state. Code, commands, API names, file paths, and
exact errors stay verbatim.`;

export default function cavemanExtension(pi: ExtensionAPI) {
	let mode: StoredMode = "off";

	function setStatus(ctx?: ExtensionContext) {
		if (!ctx?.hasUI) return;
		const usage = ctx.getContextUsage?.();
		const suffix =
			usage?.percent != null ? ` ctx:${Math.round(usage.percent)}%` : "";
		ctx.ui.setStatus(
			"caveman",
			mode === "off" ? undefined : `caveman:${mode}${suffix}`,
		);
	}

	function persistMode(nextMode: StoredMode, ctx?: ExtensionContext) {
		mode = nextMode;
		pi.appendEntry("caveman-mode", { mode, timestamp: Date.now() });
		setStatus(ctx);
	}

	pi.on("session_start", (_event, ctx) => {
		mode = loadProjectMode(ctx.cwd) ?? "off";
		for (const entry of ctx.sessionManager.getBranch() as Array<{
			type?: string;
			customType?: string;
			data?: { mode?: unknown };
		}>) {
			if (entry.type !== "custom" || entry.customType !== "caveman-mode")
				continue;
			const restored =
				typeof entry.data?.mode === "string"
					? normalizeMode(entry.data.mode)
					: undefined;
			if (restored) mode = restored;
		}
		setStatus(ctx);
	});

	pi.registerCommand("caveman", {
		description: "Enable caveman terse mode: lite, full, ultra, wenyan, or off",
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
				ctx.ui.notify(`Unknown caveman mode: ${args || "(empty)"}`, "error");
				return;
			}
			persistMode(nextMode, ctx);
			saveProjectMode(ctx.cwd, nextMode);
			ctx.ui.notify(
				nextMode === "off" ? "Caveman disabled" : `Caveman ${nextMode} enabled`,
				"info",
			);
		},
	});

	pi.registerCommand("caveman-help", {
		description: "Show caveman command reference",
		handler: async () => {
			pi.sendMessage({
				customType: "caveman-help",
				content: HELP_TEXT,
				display: true,
			});
		},
	});

	pi.registerCommand("caveman-commit", {
		description: "Generate terse Conventional Commit message",
		handler: async (args) => {
			const task =
				args?.trim() ||
				"Generate a commit message for current repository changes. Inspect git status and diffs as needed. Do not run git commit.";
			pi.sendUserMessage(`/skill:caveman-commit ${task}`);
		},
	});

	pi.registerCommand("caveman-review", {
		description: "Generate terse code-review comments",
		handler: async (args) => {
			const task =
				args?.trim() ||
				"Review current repository changes or PR diff. Inspect git diff as needed. Findings only.";
			pi.sendUserMessage(`/skill:caveman-review ${task}`);
		},
	});

	pi.registerCommand("caveman-compress", {
		description: "Compress prose/memory file into caveman style",
		handler: async (args, ctx) => {
			const target = args?.trim();
			if (!target) {
				ctx.ui.notify("Usage: /caveman-compress <file>", "error");
				return;
			}
			pi.sendUserMessage(`/skill:caveman-compress ${target}`);
		},
	});

	pi.registerCommand("caveman-stats", {
		description: "Show caveman stats skill/help",
		handler: async (args) => {
			pi.sendUserMessage(
				`/skill:caveman-stats ${args?.trim() || "Show caveman stats if available."}`,
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
				persistMode("full", ctx);
				saveProjectMode(ctx.cwd, "full");
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
