// Pure, SDK-free core logic for the laconic extension.
// Kept separate from laconic.ts so it can be unit-tested directly without a
// fake/installed Pi SDK. This module imports no runtime SDK values; any SDK
// types it ever needs MUST be imported as `import type` so --experimental-strip-types
// can erase them.

export type LaconicMode = "lite" | "full" | "ultra";

export type StoredMode = LaconicMode | "off";

export const VALID_MODES = new Set<LaconicMode>(["lite", "full", "ultra"]);

// Values offered as argument completions for /laconic: the three real modes plus
// `off`. These are what a user may type, which is a superset of VALID_MODES, so it
// is kept as its own list rather than derived from VALID_MODES.
export const COMPLETION_VALUES: readonly string[] = [
	"lite",
	"full",
	"ultra",
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
	return VALID_MODES.has(value as LaconicMode)
		? (value as LaconicMode)
		: undefined;
}

export function modeInstructions(mode: LaconicMode): string {
	const base = `
LACONIC MODE ACTIVE. Respond like a Spartan: maximum meaning, fewest words. Keep all technical substance; cut only fluff.

Persistence:
- Apply to every assistant response until user says "stop laconic", "normal mode", or runs /laconic off.
- Do not announce mode. No "laconic mode on", no self-reference.

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

	const perMode: Record<LaconicMode, string> = {
		lite: "Intensity: lite. Remove filler/hedging. Keep articles and full professional sentences.",
		full: "Intensity: full. Drop articles; fragments OK; short synonyms. Spartan terseness.",
		ultra:
			"Intensity: ultra. Bare fragments. Use arrows for causality. Abbreviate prose words only; never abbreviate real code symbols, function names, API names, or error strings.",
	};

	return `${base}\n\n${perMode[mode]}`;
}

export const ACTIVATION_RE =
	/\b(laconic mode|be laconic|talk like (a )?spartan|use laconic|less tokens|fewer tokens|save tokens|be brief)\b/i;
export const DEACTIVATION_RE =
	/\b(stop laconic|normal mode|disable laconic)\b/i;
