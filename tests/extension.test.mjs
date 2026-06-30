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
} from "../extensions/laconic-core.ts";
import {
	loadProjectMode,
	saveProjectMode,
} from "../extensions/laconic-state.ts";
import laconicExtension from "../extensions/laconic.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const ALL_MODES = ["low", "medium", "high"];

// --- normalizeMode mapping table ---

test("normalizeMode: empty / whitespace -> medium", async () => {
	assert.equal(normalizeMode(undefined), "medium");
	assert.equal(normalizeMode(""), "medium");
	assert.equal(normalizeMode("   "), "medium");
	assert.equal(normalizeMode("\t\n"), "medium");
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

test("normalizeMode: each valid mode maps to itself", async () => {
	for (const mode of ALL_MODES) {
		assert.equal(normalizeMode(mode), mode, `mode=${mode}`);
		assert.equal(normalizeMode(mode.toUpperCase()), mode, `upper mode=${mode}`);
	}
});

test("normalizeMode: garbage -> undefined", async () => {
	for (const junk of ["banana", "low-mode", "high-mega", "123", "mediumish"]) {
		assert.equal(
			normalizeMode(junk),
			undefined,
			`junk=${JSON.stringify(junk)}`,
		);
	}
});

test("VALID_MODES contains exactly the three intensity modes", async () => {
	assert.equal(VALID_MODES.size, 3);
	for (const mode of ALL_MODES) {
		assert.ok(VALID_MODES.has(mode), `VALID_MODES missing ${mode}`);
	}
});

// --- modeInstructions ---

test("modeInstructions: contains the active banner and per-mode line for every mode", async () => {
	const perModeNeedle = {
		low: "Intensity: low.",
		medium: "Intensity: medium.",
		high: "Intensity: high.",
	};
	for (const mode of ALL_MODES) {
		const text = modeInstructions(mode);
		assert.match(
			text,
			/LACONIC MODE ACTIVE/,
			`mode=${mode} missing LACONIC MODE ACTIVE`,
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
		"laconic mode",
		"please use laconic mode now",
		"talk like a spartan",
		"be laconic",
		"use laconic",
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
		"stop laconic",
		"please stop laconic now",
		"switch to normal mode",
		"disable laconic",
	]) {
		assert.match(phrase, DEACTIVATION_RE, `should deactivate: ${phrase}`);
	}
});

test("DEACTIVATION_RE does not match innocuous text", async () => {
	for (const phrase of [
		"the laconic is friendly",
		"this is a normal day",
		"enable laconic please",
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
	laconicExtension(fake.pi);
	const handler = fake.events.get("before_agent_start");
	assert.ok(handler, "before_agent_start handler must be registered");
	// default mode is off
	const result = handler({ systemPrompt: "SYS" });
	assert.equal(result, undefined);
});

test("before_agent_start: appends modeInstructions when a mode is active", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx } = makeFakeCtx();

	// activate high via the /laconic command handler
	const laconic = fake.commands.get("laconic");
	await laconic.handler("high", ctx);

	const handler = fake.events.get("before_agent_start");
	const result = handler({ systemPrompt: "SYS" });
	assert.ok(result, "should return an override object when active");
	assert.ok(result.systemPrompt.startsWith("SYS\n\n"));
	assert.match(result.systemPrompt, /LACONIC MODE ACTIVE/);
	assert.ok(result.systemPrompt.includes("Intensity: high."));
});

test("session_start: restores the LAST laconic-mode entry from the branch", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const branch = [
		{ type: "custom", customType: "laconic-mode", data: { mode: "low" } },
		{ type: "message", customType: undefined, data: {} },
		{ type: "custom", customType: "laconic-mode", data: { mode: "high" } },
		{ type: "custom", customType: "other", data: { mode: "medium" } },
	];
	const { ctx, statuses } = makeFakeCtx(branch);
	const handler = fake.events.get("session_start");
	handler({}, ctx);

	// last laconic-mode entry was high -> before_agent_start should reflect high
	const beforeStart = fake.events.get("before_agent_start");
	const result = beforeStart({ systemPrompt: "SYS" });
	assert.ok(result.systemPrompt.includes("Intensity: high."));
	// statusline reflects high
	assert.deepEqual(statuses.at(-1), { key: "laconic", value: "laconic:high" });
});

test("session_start: resets to off when no laconic-mode entry exists", async () => {
	// Use a temp cwd so a previously persisted project state does not leak in.
	const tmp = mkdtempSync(join(tmpdir(), "pi-laconic-"));
	const fake = makeFakePi();
	laconicExtension(fake.pi);
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

test("/laconic: persists a valid mode and appends a session entry", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx, notifications } = makeFakeCtx();
	const laconic = fake.commands.get("laconic");
	await laconic.handler("high", ctx);

	assert.equal(fake.appended.length, 1);
	assert.equal(fake.appended[0].customType, "laconic-mode");
	assert.equal(fake.appended[0].data.mode, "high");
	assert.equal(notifications.at(-1).level, "info");
});

test("/laconic: notifies an error on an invalid mode and persists nothing", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx, notifications } = makeFakeCtx();
	const laconic = fake.commands.get("laconic");
	await laconic.handler("banana", ctx);

	assert.equal(fake.appended.length, 0, "invalid mode must not persist");
	assert.equal(notifications.at(-1).level, "error");
	assert.match(notifications.at(-1).message, /banana/);
});

test("/laconic-compress: notifies an error when called with an empty arg", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx, notifications } = makeFakeCtx();
	const compress = fake.commands.get("laconic-compress");
	await compress.handler("", ctx);

	assert.equal(notifications.at(-1).level, "error");
	assert.match(notifications.at(-1).message, /Usage: \/laconic-compress/);
	assert.equal(
		fake.userMessages.length,
		0,
		"must not dispatch a skill message",
	);
});

test("/laconic-compress: dispatches the skill message for a valid target", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx } = makeFakeCtx();
	const compress = fake.commands.get("laconic-compress");
	await compress.handler("docs/notes.md", ctx);
	assert.equal(fake.userMessages.length, 1);
	assert.match(
		fake.userMessages[0],
		/^\/skill:laconic-compress docs\/notes\.md$/,
	);
});

test("/laconic-compress: --force before file appends the flag", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx, notifications } = makeFakeCtx();
	const compress = fake.commands.get("laconic-compress");
	await compress.handler("--force docs/notes.md", ctx);
	assert.equal(notifications.length, 0);
	assert.equal(fake.userMessages.length, 1);
	assert.match(
		fake.userMessages[0],
		/^\/skill:laconic-compress docs\/notes\.md --force$/,
	);
});

test("/laconic-compress: --force after file appends the flag", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx, notifications } = makeFakeCtx();
	const compress = fake.commands.get("laconic-compress");
	await compress.handler("docs/notes.md --force", ctx);
	assert.equal(notifications.length, 0);
	assert.equal(fake.userMessages.length, 1);
	assert.match(
		fake.userMessages[0],
		/^\/skill:laconic-compress docs\/notes\.md --force$/,
	);
});

test("/laconic-help: sends the HELP_TEXT card with customType laconic-help", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const help = fake.commands.get("laconic-help");
	await help.handler();

	assert.equal(fake.messages.length, 1);
	assert.equal(fake.messages[0].customType, "laconic-help");
	assert.equal(fake.messages[0].display, true);
	assert.match(fake.messages[0].content, /Laconic for Pi/);
	assert.match(fake.messages[0].content, /\/laconic-help/);
});

test("/laconic-commit: dispatches /skill:laconic-commit with the given notes", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const commit = fake.commands.get("laconic-commit");
	await commit.handler("only the auth module");

	assert.equal(fake.userMessages.length, 1);
	assert.match(
		fake.userMessages[0],
		/^\/skill:laconic-commit only the auth module$/,
	);
});

test("/laconic-commit: falls back to the default task on an empty arg", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const commit = fake.commands.get("laconic-commit");
	await commit.handler("");

	assert.equal(fake.userMessages.length, 1);
	assert.match(fake.userMessages[0], /^\/skill:laconic-commit /);
	assert.match(fake.userMessages[0], /Generate a commit message/);
});

test("/laconic-review: dispatches /skill:laconic-review with the given scope", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const review = fake.commands.get("laconic-review");
	await review.handler("the diff in src/");

	assert.equal(fake.userMessages.length, 1);
	assert.match(
		fake.userMessages[0],
		/^\/skill:laconic-review the diff in src\/$/,
	);
});

test("/laconic-review: falls back to the default task on an empty arg", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const review = fake.commands.get("laconic-review");
	await review.handler("");

	assert.equal(fake.userMessages.length, 1);
	assert.match(fake.userMessages[0], /^\/skill:laconic-review /);
	assert.match(fake.userMessages[0], /Review current repository changes/);
});

test("/laconic-stats: dispatches /skill:laconic-stats with the given arg", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const stats = fake.commands.get("laconic-stats");
	await stats.handler("last 3 turns");

	assert.equal(fake.userMessages.length, 1);
	assert.match(fake.userMessages[0], /^\/skill:laconic-stats last 3 turns$/);
});

test("/laconic-stats: falls back to the default prompt on an empty arg", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const stats = fake.commands.get("laconic-stats");
	await stats.handler("");

	assert.equal(fake.userMessages.length, 1);
	assert.match(fake.userMessages[0], /^\/skill:laconic-stats /);
	assert.match(fake.userMessages[0], /Show laconic stats if available\./);
});

// --- getArgumentCompletions for /laconic ---

test("getArgumentCompletions: filters mode list by prefix", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const laconic = fake.commands.get("laconic");
	const items = laconic.getArgumentCompletions("h");
	assert.ok(Array.isArray(items));
	assert.deepEqual(
		items.map((i) => i.value),
		["high"],
	);
	// each item carries a matching label
	for (const item of items) assert.equal(item.label, item.value);
});

test("getArgumentCompletions: empty prefix returns the medium list", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const laconic = fake.commands.get("laconic");
	const items = laconic.getArgumentCompletions("");
	assert.equal(items.length, COMPLETION_VALUES.length); // 3 modes + off
	assert.ok(items.some((i) => i.value === "off"));
	assert.ok(items.some((i) => i.value === "high"));
});

test("getArgumentCompletions: no match returns null (not an empty array)", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const laconic = fake.commands.get("laconic");
	assert.equal(laconic.getArgumentCompletions("zzz"), null);
});

// --- statusline clear when switching to off ---

test("statusline: clears (undefined) when /laconic off is issued", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx, statuses } = makeFakeCtx();
	const laconic = fake.commands.get("laconic");
	await laconic.handler("high", ctx);
	assert.deepEqual(statuses.at(-1), { key: "laconic", value: "laconic:high" });

	await laconic.handler("off", ctx);
	assert.deepEqual(statuses.at(-1), { key: "laconic", value: undefined });
});

// --- pi.on("input") activation / deactivation handler ---

test("input handler: activation phrase from a user source persists medium", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx } = makeFakeCtx();
	const input = fake.events.get("input");
	assert.ok(input, "input handler must be registered");

	const result = input(
		{ text: "please use laconic mode", source: "user" },
		ctx,
	);
	assert.deepEqual(result, { action: "continue" });
	assert.equal(fake.appended.length, 1);
	assert.equal(fake.appended[0].data.mode, "medium");
});

test("input handler: deactivation phrase persists off", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx } = makeFakeCtx();
	const input = fake.events.get("input");

	// First activate, then deactivate.
	input({ text: "use laconic", source: "user" }, ctx);
	assert.equal(fake.appended.at(-1).data.mode, "medium");

	input({ text: "switch to normal mode now", source: "user" }, ctx);
	assert.equal(fake.appended.at(-1).data.mode, "off");
});

test("input handler: source 'extension' is ignored (self-echo guard)", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx } = makeFakeCtx();
	const input = fake.events.get("input");

	const result = input(
		{ text: "please use laconic mode", source: "extension" },
		ctx,
	);
	assert.deepEqual(result, { action: "continue" });
	assert.equal(fake.appended.length, 0, "self-echo must not persist a mode");
});

test("input handler: activation while already in a non-off mode does not overwrite", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx } = makeFakeCtx();
	const laconic = fake.commands.get("laconic");
	const input = fake.events.get("input");

	// Already in high via the command.
	await laconic.handler("high", ctx);
	assert.equal(fake.appended.length, 1);
	assert.equal(fake.appended[0].data.mode, "high");

	// An activation phrase must NOT downgrade high to medium.
	input({ text: "use laconic", source: "user" }, ctx);
	assert.equal(fake.appended.length, 1, "must not persist a second entry");

	const beforeStart = fake.events.get("before_agent_start");
	const r = beforeStart({ systemPrompt: "SYS" });
	assert.ok(r.systemPrompt.includes("Intensity: high."), "mode stays high");
});

test("input handler: deactivation while already off does not persist a redundant entry", async () => {
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx } = makeFakeCtx();
	const input = fake.events.get("input");

	// Default mode is off; a deactivation phrase must be a no-op.
	input({ text: "stop laconic", source: "user" }, ctx);
	assert.equal(
		fake.appended.length,
		0,
		"deactivation while off must not persist a redundant entry",
	);
});

// --- type-only SDK import invariant ---

test("session_start: falls back to project state when no laconic-mode entry exists", async () => {
	const tmp = mkdtempSync(join(tmpdir(), "pi-laconic-"));
	saveProjectMode(tmp, "high");
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const { ctx, statuses } = makeFakeCtx([], tmp);
	const handler = fake.events.get("session_start");
	handler({}, ctx);

	const beforeStart = fake.events.get("before_agent_start");
	const result = beforeStart({ systemPrompt: "SYS" });
	assert.ok(
		result.systemPrompt.includes("Intensity: high."),
		"mode should be restored from project state",
	);
	assert.deepEqual(statuses.at(-1), { key: "laconic", value: "laconic:high" });
	rmSync(tmp, { recursive: true, force: true });
});

test("session_start: session entry overrides project state", async () => {
	const tmp = mkdtempSync(join(tmpdir(), "pi-laconic-"));
	saveProjectMode(tmp, "high");
	const fake = makeFakePi();
	laconicExtension(fake.pi);
	const branch = [
		{ type: "custom", customType: "laconic-mode", data: { mode: "low" } },
	];
	const { ctx } = makeFakeCtx(branch, tmp);
	const handler = fake.events.get("session_start");
	handler({}, ctx);

	const beforeStart = fake.events.get("before_agent_start");
	const result = beforeStart({ systemPrompt: "SYS" });
	assert.ok(
		result.systemPrompt.includes("Intensity: low."),
		"session entry must override project state",
	);
	rmSync(tmp, { recursive: true, force: true });
});

test("loadProjectMode: returns undefined for missing or invalid state", () => {
	const tmp = mkdtempSync(join(tmpdir(), "pi-laconic-"));
	assert.equal(
		loadProjectMode(tmp),
		undefined,
		"missing state returns undefined",
	);
	rmSync(tmp, { recursive: true, force: true });
});

// --- type-only SDK import invariant ---

test("SDK import in laconic.ts is type-only (erasable by strip-types)", async () => {
	const src = readFileSync(join(repoRoot, "extensions/laconic.ts"), "utf8");
	assert.match(
		src,
		/import\s+type\s+\{[^}]*\}\s+from\s+["']@earendil-works\/pi-coding-agent["']/,
		"laconic.ts must import the SDK as `import type` only",
	);
	// no value import from the SDK
	assert.doesNotMatch(
		src,
		/import\s+(?!type\b)[^;]*from\s+["']@earendil-works\/pi-coding-agent["']/,
		"laconic.ts must not add a value import from the SDK",
	);
});

test("SDK import in laconic-core.ts (if any) is type-only", async () => {
	const src = readFileSync(
		join(repoRoot, "extensions/laconic-core.ts"),
		"utf8",
	);
	const importsSdk = /@earendil-works\/pi-coding-agent/.test(src);
	if (importsSdk) {
		assert.doesNotMatch(
			src,
			/import\s+(?!type\b)[^;]*from\s+["']@earendil-works\/pi-coding-agent["']/,
			"laconic-core.ts must not add a value import from the SDK",
		);
	} else {
		assert.ok(true, "laconic-core.ts does not import the SDK");
	}
});
