// Pure, SDK-free core logic for the caveman extension.
// Kept separate from caveman.ts so it can be unit-tested directly without a
// fake/installed Pi SDK. This module imports no runtime SDK values; any SDK
// types it ever needs MUST be imported as `import type` so --experimental-strip-types
// can erase them.

export type CavemanMode =
	| "lite"
	| "full"
	| "ultra"
	| "wenyan-lite"
	| "wenyan-full"
	| "wenyan-ultra";

export type StoredMode = CavemanMode | "off";

export const VALID_MODES = new Set<CavemanMode>([
	"lite",
	"full",
	"ultra",
	"wenyan-lite",
	"wenyan-full",
	"wenyan-ultra",
]);

// Values offered as argument completions for /caveman: the six real modes plus
// the `wenyan` alias (→ wenyan-full via normalizeMode) and `off`. These are what
// a user may type, which is a superset of VALID_MODES, so it is kept as its own
// list rather than derived from VALID_MODES.
export const COMPLETION_VALUES: readonly string[] = [
	"lite",
	"full",
	"ultra",
	"wenyan",
	"wenyan-lite",
	"wenyan-full",
	"wenyan-ultra",
	"off",
];

export function normalizeMode(raw: string | undefined): StoredMode | undefined {
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

export function modeInstructions(mode: CavemanMode): string {
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

export const ACTIVATION_RE =
	/\b(caveman mode|talk like caveman|use caveman|less tokens|fewer tokens|save tokens)\b/i;
export const DEACTIVATION_RE = /\b(stop caveman|normal mode|disable caveman)\b/i;
