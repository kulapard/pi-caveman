// Project-scoped persistence for laconic mode.
// This is a workaround until Pi exposes SettingsManager to extensions
// (tracked upstream as pi-coding-agent issue #4981).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeMode, type StoredMode } from "./laconic-core.ts";

const STATE_DIR = ".pi";
const STATE_FILE = "laconic-mode.json";

function statePath(cwd: string): string {
	return join(cwd, STATE_DIR, STATE_FILE);
}

/**
 * Load the project-scoped laconic mode default. Returns `undefined` when no
 * state file exists or it cannot be read, so the caller can fall back to the
 * session-scoped default (`off`).
 */
export function loadProjectMode(cwd: string): StoredMode | undefined {
	const path = statePath(cwd);
	if (!existsSync(path)) return undefined;
	try {
		const raw = JSON.parse(readFileSync(path, "utf8"));
		return normalizeMode(raw.mode);
	} catch {
		return undefined;
	}
}

/**
 * Persist the laconic mode for this project directory. Returns `true` on
 * success; failures are silent so that session operation is never blocked by
 * disk issues.
 */
export function saveProjectMode(cwd: string, mode: StoredMode): boolean {
	try {
		const dir = join(cwd, STATE_DIR);
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		writeFileSync(
			statePath(cwd),
			JSON.stringify({ mode, updatedAt: Date.now() }, null, 2),
		);
		return true;
	} catch {
		return false;
	}
}
