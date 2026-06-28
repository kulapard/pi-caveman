import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";

type CavemanMode =
	| "lite"
	| "full"
	| "ultra"
	| "wenyan-lite"
	| "wenyan-full"
	| "wenyan-ultra";

type StoredMode = CavemanMode | "off";

const VALID_MODES = new Set<CavemanMode>([
	"lite",
	"full",
	"ultra",
	"wenyan-lite",
	"wenyan-full",
	"wenyan-ultra",
]);

const HELP_TEXT = `# Caveman for Pi

Commands:
- /caveman [lite|full|ultra|wenyan|wenyan-lite|wenyan-full|wenyan-ultra] — enable terse mode for this session.
- /caveman off — disable terse mode.
- /caveman-help — show this card.
- /caveman-commit [notes] — generate Conventional Commit message. Does not commit.
- /caveman-review [scope] — terse review comments.
- /caveman-compress <file> — compress prose file via caveman-compress skill.
- /caveman-stats — load stats skill/help.

Mode persists in current Pi session and survives /reload via session state.
Code, commands, API names, file paths, and exact errors stay verbatim.`;

function normalizeMode(raw: string | undefined): StoredMode | undefined {
	const value = (raw ?? "").trim().toLowerCase();
	if (!value) return "full";
	if (
		["off", "stop", "normal", "normal-mode", "disable", "disabled"].includes(
			value,
		)
	)
		return "off";
	if (value === "wenyan" || value === "classical") return "wenyan-full";
	return VALID_MODES.has(value as CavemanMode)
		? (value as CavemanMode)
		: undefined;
}

function modeInstructions(mode: CavemanMode): string {
	const base = `
CAVEMAN MODE ACTIVE. Respond terse like smart caveman. All technical substance stay. Only fluff die.

Persistence:
- Apply to every assistant response until user says "stop caveman", "normal mode", or runs /caveman off.
- Do not announce mode. No "caveman mode on", no self-reference.

Core rules:
- Drop articles, filler, pleasantries, hedging, tool-call narration.
- Prefer fragments. Pattern: [thing] [action] [reason]. [next step].
- Keep technical terms exact. Keep code blocks, inline code, commands, API names, file paths, commit types, and exact error strings verbatim.
- Preserve user's dominant language; compress style, not language.
- Avoid decorative tables/emoji unless useful or requested.
- Do not dump long raw logs unless asked; quote shortest decisive line.

Auto-clarity:
- Use normal precise prose for security warnings, irreversible confirmations, or sequences where terse fragments risk ambiguity.
- Resume terse style after clear part.`;

	const perMode: Record<CavemanMode, string> = {
		lite: "Intensity: lite. Remove filler/hedging. Keep articles and full professional sentences.",
		full: "Intensity: full. Drop articles; fragments OK; short synonyms. Classic caveman.",
		ultra:
			"Intensity: ultra. Bare fragments. Use arrows for causality. Abbreviate prose words only; never abbreviate real code symbols, function names, API names, or error strings.",
		"wenyan-lite":
			"Intensity: wenyan-lite. Semi-classical Chinese register when user writes Chinese; otherwise terse lite mode.",
		"wenyan-full":
			"Intensity: wenyan-full. Maximum classical Chinese terseness when user writes Chinese; otherwise terse full mode.",
		"wenyan-ultra":
			"Intensity: wenyan-ultra. Extreme classical Chinese compression when user writes Chinese; otherwise terse ultra mode.",
	};

	return `${base}\n\n${perMode[mode]}`;
}

const ACTIVATION_RE =
	/\b(caveman mode|talk like caveman|use caveman|less tokens|fewer tokens|save tokens)\b/i;
const DEACTIVATION_RE = /\b(stop caveman|normal mode|disable caveman)\b/i;

export default function cavemanExtension(pi: ExtensionAPI) {
	let mode: StoredMode = "off";

	function setStatus(ctx?: ExtensionContext) {
		if (!ctx?.hasUI) return;
		ctx.ui.setStatus("caveman", mode === "off" ? undefined : `caveman:${mode}`);
	}

	function persistMode(nextMode: StoredMode, ctx?: ExtensionContext) {
		mode = nextMode;
		pi.appendEntry("caveman-mode", { mode, timestamp: Date.now() });
		setStatus(ctx);
	}

	pi.on("session_start", (_event, ctx) => {
		mode = "off";
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
			const items = [
				"lite",
				"full",
				"ultra",
				"wenyan",
				"wenyan-lite",
				"wenyan-full",
				"wenyan-ultra",
				"off",
			].flatMap((value) =>
				value.startsWith(normalizedPrefix) ? [{ value, label: value }] : [],
			);
			return items.length > 0 ? items : null;
		},
		handler: (args, ctx) => {
			const nextMode = normalizeMode(args);
			if (!nextMode) {
				ctx.ui.notify(`Unknown caveman mode: ${args || "(empty)"}`, "error");
				return;
			}
			persistMode(nextMode, ctx);
			ctx.ui.notify(
				nextMode === "off" ? "Caveman disabled" : `Caveman ${nextMode} enabled`,
				"info",
			);
		},
	});

	pi.registerCommand("caveman-help", {
		description: "Show caveman command reference",
		handler: () => {
			pi.sendMessage({
				customType: "caveman-help",
				content: HELP_TEXT,
				display: true,
			});
		},
	});

	pi.registerCommand("caveman-commit", {
		description: "Generate terse Conventional Commit message",
		handler: (args) => {
			const task =
				args?.trim() ||
				"Generate a commit message for current repository changes. Inspect git status and diffs as needed. Do not run git commit.";
			pi.sendUserMessage(`/skill:caveman-commit ${task}`);
		},
	});

	pi.registerCommand("caveman-review", {
		description: "Generate terse code-review comments",
		handler: (args) => {
			const task =
				args?.trim() ||
				"Review current repository changes or PR diff. Inspect git diff as needed. Findings only.";
			pi.sendUserMessage(`/skill:caveman-review ${task}`);
		},
	});

	pi.registerCommand("caveman-compress", {
		description: "Compress prose/memory file into caveman style",
		handler: (args, ctx) => {
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
		handler: (args) => {
			pi.sendUserMessage(
				`/skill:caveman-stats ${args?.trim() || "Show caveman stats if available."}`,
			);
		},
	});

	pi.on("input", (event, ctx) => {
		const text = event.text.trim();
		if (event.source === "extension") return { action: "continue" as const };
		if (DEACTIVATION_RE.test(text)) {
			persistMode("off", ctx);
			return { action: "continue" as const };
		}
		if (mode === "off" && ACTIVATION_RE.test(text)) {
			persistMode("full", ctx);
			return { action: "continue" as const };
		}
		return { action: "continue" as const };
	});

	pi.on("before_agent_start", (event) => {
		if (mode === "off") return undefined;
		return {
			systemPrompt: `${event.systemPrompt}\n\n${modeInstructions(mode)}`,
		};
	});
}
