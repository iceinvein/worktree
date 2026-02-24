import * as fs from "node:fs/promises";
import * as path from "node:path";

const DEFAULT_SCRIPT_NAME = ".worktree-setup.sh";

export async function findScript(
	repoRoot: string,
	configuredPath: string,
): Promise<string | undefined> {
	// 1. Check configured path first
	if (configuredPath) {
		const resolved = path.resolve(repoRoot, configuredPath);
		try {
			await fs.access(resolved, fs.constants.X_OK);
			return resolved;
		} catch {
			return undefined;
		}
	}

	// 2. Fall back to convention
	const defaultPath = path.join(repoRoot, DEFAULT_SCRIPT_NAME);
	try {
		await fs.access(defaultPath, fs.constants.X_OK);
		return defaultPath;
	} catch {
		return undefined;
	}
}
