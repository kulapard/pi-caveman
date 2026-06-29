import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import {
	normalizeMode,
	modeInstructions,
	VALID_MODES,
	COMPLETION_VALUES,
	ACTIVATION_RE,
	DEACTIVATION_RE,
} from "../extensions/caveman-core.ts";
import {
	loadProjectMode,
	saveProjectMode,
} from "../extensions/caveman-state.ts";
import cavemanExtension from "../extensions/caveman.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const ALL_MODES = [
	"lite",
	"full",
	"ultra",
	"wenyan-lite",
	"wenyan-full",
	"wenyan-ultra",
];

// --- normalizeMode mapping table ---

test("normalizeMode: empty / whitespace -> full", async () => {
	assert.equal(normalizeMode(undefined), "full");
	assert.equal(normalizeMode(""), "full");
	assert.equal(normalizeMode("   "), "full");
	assert.equal(normalizeMode("\t\n"), "full");
});

test("normalizeMode: off-like aliases -> off", async () => {
	for (const alias of [
		"off",
		"stop",
		"normal",
		"normal-mode",
		"disable",
		"disabled",
		"OFF",
		"  Stop  ",
	]) {
		assert.equal(normalizeMode(alias), "off", `alias=${JSON.stringify(alias)}`);
	}
});

test("normalizeMode: wenyan / classical -> wenyan-full", async () => {
	assert.equal(normalizeMode("wenyan"), "wenyan-full");
	assert.equal(normalizeMode("classical"), "wenyan-full");
	assert.equal(normalizeMode("  WENYAN "), "wenyan-full");
});

test("normalizeMode: each valid mode maps to itself", async () => {
	for (const mode of ALL_MODES) {
		assert.equal(normalizeMode(mode), mode, `mode=${mode}`);
		assert.equal(normalizeMode(mode.toUpperCase()), mode, `upper mode=${mode}`);
	}
});

test("normalizeMode: garbage -> undefined", async () => {
	for (const junk of ["banana", "lite-mode", "wenyan-mega", "123", "fullish"]) {
		assert.equal(
			normalizeMode(junk),
			undefined,
			`junk=${JSON.stringify(junk)}`,
		);
	}
});

test("VALID_MODES contains exactly the six intensity modes", async () => {
	assert.equal(VALID_MODES.size, 6);
	for (const mode of ALL_MODES) {
		assert.ok(VALID_MODES.has(mode), `VALID_MODES missing ${mode}`);
	}
});

// --- modeInstructions ---

test("modeInstructions: contains the active banner and per-mode line for every mode", async () => {
	const perModeNeedle = {
		lite: "Intensity: lite.",
		full: "Intensity: full.",
		ultra: "Intensity: ultra.",
		"wenyan-lite": "Intensity: wenyan-lite.",
		"wenyan-full": "Intensity: wenyan-full.",
		"wenyan-ultra": "Intensity: wenyan-ultra.",
	};
	for (const mode of ALL_MODES) {
		const text = modeInstructions(mode);
		assert.match(
			text,
			/CAVEMAN MODE ACTIVE/,
			`mode=${mode} missing CAVEMAN MODE ACTIVE`,
		);
		assert.ok(
			text.includes(perModeNeedle[mode]),
			`mode=${mode} missing per-mode line "${perModeNeedle[mode]}"`,
		);
	}
});

// --- activation / deactivation regexes ---

test("ACTIVATION_RE matches documented activation phrases", async () => {
	for (const phrase of [
		"caveman mode",
		"please use caveman mode now",
		"talk like caveman",
		"use caveman",
		"can we use less tokens",
		"fewer tokens please",
		"save tokens",
		"please be brief",
	]) {
		assert.match(phrase, ACTIVATION_RE, `should activate: ${phrase}`);
	}
});

test("ACTIVATION_RE does not match innocuous text", async () => {
	for (const phrase of [
		"let's talk about the cavemen exhibit",
		"the token bucket algorithm",
		"normal conversation about caves",
		"I want more tokens not less",
	]) {
		// "less tokens"/"fewer tokens"/"save tokens" are the only token phrases;
		// none of the above contain an activation trigger as a whole phrase.
		assert.doesNotMatch(
			phrase,
			ACTIVATION_RE,
			`should NOT activate: ${phrase}`,
		);
	}
});

test("DEACTIVATION_RE matches documented deactivation phrases", async () => {
	for (const phrase of [
		"stop caveman",
		"please stop caveman now",
		"switch to normal mode",
		"disable caveman",
	]) {
		assert.match(phrase, DEACTIVATION_RE, `should deactivate: ${phrase}`);
	}
});

test("DEACTIVATION_RE does not match innocuous text", async () => {
	for (const phrase of [
		"the caveman is friendly",
		"this is a normal day",
		"enable caveman please",
	]) {
		assert.doesNotMatch(
			phrase,
			DEACTIVATION_RE,
			`should NOT deactivate: ${phrase}`,
		);
	}
});

// --- fake-pi handler tests ---

function makeFakePi() {
	const events = new Map();
	const commands = new Map();
	const appended = [];
	const messages = [];
	const userMessages = [];
	const pi = {
		on(event, handler) {
			events.set(event, handler);
		},
		registerCommand(name, def) {
			commands.set(name, def);
		},
		appendEntry(customType, data) {
			appended.push({ customType, data });
		},
		sendMessage(msg) {
			messages.push(msg);
		},
		sendUserMessage(msg) {
			userMessages.push(msg);
		},
	};
	return { pi, events, commands, appended, messages, userMessages };
}

function makeFakeCtx(branch = [], cwd = repoRoot) {
	const notifications = [];
	const statuses = [];
	return {
		ctx: {
			cwd,
			hasUI: true,
			ui: {
				setStatus(key, value) {
					statuses.push({ key, value });
				},
				notify(message, level) {
					notifications.push({ message, level });
				},
			},
			sessionManager: {
				getBranch() {
					return branch;
				},
			},
		},
		notifications,
		statuses,
	};
}

test("before_agent_start: returns undefined when mode off", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const handler = fake.events.get("before_agent_start");
	assert.ok(handler, "before_agent_start handler must be registered");
	// default mode is off
	const result = handler({ systemPrompt: "SYS" });
	assert.equal(result, undefined);
});

test("before_agent_start: appends modeInstructions when a mode is active", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const { ctx } = makeFakeCtx();

	// activate ultra via the /caveman command handler
	const caveman = fake.commands.get("caveman");
	await caveman.handler("ultra", ctx);

	const handler = fake.events.get("before_agent_start");
	const result = handler({ systemPrompt: "SYS" });
	assert.ok(result, "should return an override object when active");
	assert.ok(result.systemPrompt.startsWith("SYS\n\n"));
	assert.match(result.systemPrompt, /CAVEMAN MODE ACTIVE/);
	assert.ok(result.systemPrompt.includes("Intensity: ultra."));
});

test("session_start: restores the LAST caveman-mode entry from the branch", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const branch = [
		{ type: "custom", customType: "caveman-mode", data: { mode: "lite" } },
		{ type: "message", customType: undefined, data: {} },
		{ type: "custom", customType: "caveman-mode", data: { mode: "ultra" } },
		{ type: "custom", customType: "other", data: { mode: "full" } },
	];
	const { ctx, statuses } = makeFakeCtx(branch);
	const handler = fake.events.get("session_start");
	handler({}, ctx);

	// last caveman-mode entry was ultra -> before_agent_start should reflect ultra
	const beforeStart = fake.events.get("before_agent_start");
	const result = beforeStart({ systemPrompt: "SYS" });
	assert.ok(result.systemPrompt.includes("Intensity: ultra."));
	// statusline reflects ultra
	assert.deepEqual(statuses.at(-1), { key: "caveman", value: "caveman:ultra" });
});

test("session_start: resets to off when no caveman-mode entry exists", async () => {
	// Use a temp cwd so a previously persisted project state does not leak in.
	const tmp = mkdtempSync(join(tmpdir(), "pi-caveman-"));
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const { ctx } = makeFakeCtx(
		[{ type: "message", customType: undefined, data: {} }],
		tmp,
	);
	const handler = fake.events.get("session_start");
	handler({}, ctx);
	const beforeStart = fake.events.get("before_agent_start");
	assert.equal(beforeStart({ systemPrompt: "SYS" }), undefined);
	rmSync(tmp, { recursive: true, force: true });
});

test("/caveman: persists a valid mode and appends a session entry", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const { ctx, notifications } = makeFakeCtx();
	const caveman = fake.commands.get("caveman");
	await caveman.handler("wenyan", ctx);

	assert.equal(fake.appended.length, 1);
	assert.equal(fake.appended[0].customType, "caveman-mode");
	assert.equal(fake.appended[0].data.mode, "wenyan-full");
	assert.equal(notifications.at(-1).level, "info");
});

test("/caveman: notifies an error on an invalid mode and persists nothing", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const { ctx, notifications } = makeFakeCtx();
	const caveman = fake.commands.get("caveman");
	await caveman.handler("banana", ctx);

	assert.equal(fake.appended.length, 0, "invalid mode must not persist");
	assert.equal(notifications.at(-1).level, "error");
	assert.match(notifications.at(-1).message, /banana/);
});

test("/caveman-compress: notifies an error when called with an empty arg", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const { ctx, notifications } = makeFakeCtx();
	const compress = fake.commands.get("caveman-compress");
	await compress.handler("", ctx);

	assert.equal(notifications.at(-1).level, "error");
	assert.match(notifications.at(-1).message, /Usage: \/caveman-compress/);
	assert.equal(
		fake.userMessages.length,
		0,
		"must not dispatch a skill message",
	);
});

test("/caveman-compress: dispatches the skill message for a valid target", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const { ctx } = makeFakeCtx();
	const compress = fake.commands.get("caveman-compress");
	await compress.handler("docs/notes.md", ctx);
	assert.equal(fake.userMessages.length, 1);
	assert.match(fake.userMessages[0], /caveman-compress docs\/notes\.md/);
});

test("/caveman-help: sends the HELP_TEXT card with customType caveman-help", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const help = fake.commands.get("caveman-help");
	await help.handler();

	assert.equal(fake.messages.length, 1);
	assert.equal(fake.messages[0].customType, "caveman-help");
	assert.equal(fake.messages[0].display, true);
	assert.match(fake.messages[0].content, /Caveman for Pi/);
	assert.match(fake.messages[0].content, /\/caveman-help/);
});

test("/caveman-commit: dispatches /skill:caveman-commit with the given notes", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const commit = fake.commands.get("caveman-commit");
	await commit.handler("only the auth module");

	assert.equal(fake.userMessages.length, 1);
	assert.match(
		fake.userMessages[0],
		/^\/skill:caveman-commit only the auth module$/,
	);
});

test("/caveman-commit: falls back to the default task on an empty arg", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const commit = fake.commands.get("caveman-commit");
	await commit.handler("");

	assert.equal(fake.userMessages.length, 1);
	assert.match(fake.userMessages[0], /^\/skill:caveman-commit /);
	assert.match(fake.userMessages[0], /Generate a commit message/);
});

test("/caveman-review: dispatches /skill:caveman-review with the given scope", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const review = fake.commands.get("caveman-review");
	await review.handler("the diff in src/");

	assert.equal(fake.userMessages.length, 1);
	assert.match(
		fake.userMessages[0],
		/^\/skill:caveman-review the diff in src\/$/,
	);
});

test("/caveman-review: falls back to the default task on an empty arg", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const review = fake.commands.get("caveman-review");
	await review.handler("");

	assert.equal(fake.userMessages.length, 1);
	assert.match(fake.userMessages[0], /^\/skill:caveman-review /);
	assert.match(fake.userMessages[0], /Review current repository changes/);
});

test("/caveman-stats: dispatches /skill:caveman-stats with the given arg", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const stats = fake.commands.get("caveman-stats");
	await stats.handler("last 3 turns");

	assert.equal(fake.userMessages.length, 1);
	assert.match(fake.userMessages[0], /^\/skill:caveman-stats last 3 turns$/);
});

test("/caveman-stats: falls back to the default prompt on an empty arg", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const stats = fake.commands.get("caveman-stats");
	await stats.handler("");

	assert.equal(fake.userMessages.length, 1);
	assert.match(fake.userMessages[0], /^\/skill:caveman-stats /);
	assert.match(fake.userMessages[0], /Show caveman stats if available\./);
});

// --- getArgumentCompletions for /caveman ---

test("getArgumentCompletions: filters mode list by prefix", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const caveman = fake.commands.get("caveman");
	const items = caveman.getArgumentCompletions("wen");
	assert.ok(Array.isArray(items));
	assert.deepEqual(
		items.map((i) => i.value),
		["wenyan", "wenyan-lite", "wenyan-full", "wenyan-ultra"],
	);
	// each item carries a matching label
	for (const item of items) assert.equal(item.label, item.value);
});

test("getArgumentCompletions: empty prefix returns the full list", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const caveman = fake.commands.get("caveman");
	const items = caveman.getArgumentCompletions("");
	assert.equal(items.length, COMPLETION_VALUES.length); // 6 modes + wenyan alias + off
	assert.ok(items.some((i) => i.value === "off"));
	assert.ok(items.some((i) => i.value === "ultra"));
});

test("getArgumentCompletions: no match returns null (not an empty array)", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const caveman = fake.commands.get("caveman");
	assert.equal(caveman.getArgumentCompletions("zzz"), null);
});

// --- statusline clear when switching to off ---

test("statusline: clears (undefined) when /caveman off is issued", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const { ctx, statuses } = makeFakeCtx();
	const caveman = fake.commands.get("caveman");
	await caveman.handler("ultra", ctx);
	assert.deepEqual(statuses.at(-1), { key: "caveman", value: "caveman:ultra" });

	await caveman.handler("off", ctx);
	assert.deepEqual(statuses.at(-1), { key: "caveman", value: undefined });
});

// --- pi.on("input") activation / deactivation handler ---

test("input handler: activation phrase from a user source persists full", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const { ctx } = makeFakeCtx();
	const input = fake.events.get("input");
	assert.ok(input, "input handler must be registered");

	const result = input(
		{ text: "please use caveman mode", source: "user" },
		ctx,
	);
	assert.deepEqual(result, { action: "continue" });
	assert.equal(fake.appended.length, 1);
	assert.equal(fake.appended[0].data.mode, "full");
});

test("input handler: deactivation phrase persists off", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const { ctx } = makeFakeCtx();
	const input = fake.events.get("input");

	// First activate, then deactivate.
	input({ text: "use caveman", source: "user" }, ctx);
	assert.equal(fake.appended.at(-1).data.mode, "full");

	input({ text: "switch to normal mode now", source: "user" }, ctx);
	assert.equal(fake.appended.at(-1).data.mode, "off");
});

test("input handler: source 'extension' is ignored (self-echo guard)", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const { ctx } = makeFakeCtx();
	const input = fake.events.get("input");

	const result = input(
		{ text: "please use caveman mode", source: "extension" },
		ctx,
	);
	assert.deepEqual(result, { action: "continue" });
	assert.equal(fake.appended.length, 0, "self-echo must not persist a mode");
});

test("input handler: activation while already in a non-off mode does not overwrite", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const { ctx } = makeFakeCtx();
	const caveman = fake.commands.get("caveman");
	const input = fake.events.get("input");

	// Already in ultra via the command.
	await caveman.handler("ultra", ctx);
	assert.equal(fake.appended.length, 1);
	assert.equal(fake.appended[0].data.mode, "ultra");

	// An activation phrase must NOT downgrade ultra to full.
	input({ text: "use caveman", source: "user" }, ctx);
	assert.equal(fake.appended.length, 1, "must not persist a second entry");

	const beforeStart = fake.events.get("before_agent_start");
	const r = beforeStart({ systemPrompt: "SYS" });
	assert.ok(r.systemPrompt.includes("Intensity: ultra."), "mode stays ultra");
});

test("input handler: deactivation while already off does not persist a redundant entry", async () => {
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const { ctx } = makeFakeCtx();
	const input = fake.events.get("input");

	// Default mode is off; a deactivation phrase must be a no-op.
	input({ text: "stop caveman", source: "user" }, ctx);
	assert.equal(
		fake.appended.length,
		0,
		"deactivation while off must not persist a redundant entry",
	);
});

// --- type-only SDK import invariant ---

test("session_start: falls back to project state when no caveman-mode entry exists", async () => {
	const tmp = mkdtempSync(join(tmpdir(), "pi-caveman-"));
	saveProjectMode(tmp, "ultra");
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const { ctx, statuses } = makeFakeCtx([], tmp);
	const handler = fake.events.get("session_start");
	handler({}, ctx);

	const beforeStart = fake.events.get("before_agent_start");
	const result = beforeStart({ systemPrompt: "SYS" });
	assert.ok(
		result.systemPrompt.includes("Intensity: ultra."),
		"mode should be restored from project state",
	);
	assert.deepEqual(statuses.at(-1), { key: "caveman", value: "caveman:ultra" });
	rmSync(tmp, { recursive: true, force: true });
});

test("session_start: session entry overrides project state", async () => {
	const tmp = mkdtempSync(join(tmpdir(), "pi-caveman-"));
	saveProjectMode(tmp, "ultra");
	const fake = makeFakePi();
	cavemanExtension(fake.pi);
	const branch = [
		{ type: "custom", customType: "caveman-mode", data: { mode: "lite" } },
	];
	const { ctx } = makeFakeCtx(branch, tmp);
	const handler = fake.events.get("session_start");
	handler({}, ctx);

	const beforeStart = fake.events.get("before_agent_start");
	const result = beforeStart({ systemPrompt: "SYS" });
	assert.ok(
		result.systemPrompt.includes("Intensity: lite."),
		"session entry must override project state",
	);
	rmSync(tmp, { recursive: true, force: true });
});

test("loadProjectMode: returns undefined for missing or invalid state", () => {
	const tmp = mkdtempSync(join(tmpdir(), "pi-caveman-"));
	assert.equal(
		loadProjectMode(tmp),
		undefined,
		"missing state returns undefined",
	);
	rmSync(tmp, { recursive: true, force: true });
});

// --- type-only SDK import invariant ---

test("SDK import in caveman.ts is type-only (erasable by strip-types)", async () => {
	const src = readFileSync(join(repoRoot, "extensions/caveman.ts"), "utf8");
	assert.match(
		src,
		/import\s+type\s+\{[^}]*\}\s+from\s+["']@earendil-works\/pi-coding-agent["']/,
		"caveman.ts must import the SDK as `import type` only",
	);
	// no value import from the SDK
	assert.doesNotMatch(
		src,
		/import\s+(?!type\b)[^;]*from\s+["']@earendil-works\/pi-coding-agent["']/,
		"caveman.ts must not add a value import from the SDK",
	);
});

test("SDK import in caveman-core.ts (if any) is type-only", async () => {
	const src = readFileSync(
		join(repoRoot, "extensions/caveman-core.ts"),
		"utf8",
	);
	const importsSdk = /@earendil-works\/pi-coding-agent/.test(src);
	if (importsSdk) {
		assert.doesNotMatch(
			src,
			/import\s+(?!type\b)[^;]*from\s+["']@earendil-works\/pi-coding-agent["']/,
			"caveman-core.ts must not add a value import from the SDK",
		);
	} else {
		assert.ok(true, "caveman-core.ts does not import the SDK");
	}
});
