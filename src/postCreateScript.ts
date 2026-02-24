import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as util from "node:util";

const execFilePromise = util.promisify(execFile);

const TIMEOUT_MS = 30_000;

export interface ScriptResult {
	success: boolean;
	error?: string;
}

const DEFAULT_SCRIPT_NAME = ".worktree-setup.sh";

const accessMode =
	process.platform === "win32" ? fs.constants.R_OK : fs.constants.X_OK;

export async function findScript(
	repoRoot: string,
	configuredPath: string,
): Promise<string | undefined> {
	// 1. Check configured path first
	if (configuredPath) {
		const resolved = path.resolve(repoRoot, configuredPath);
		// Prevent path traversal outside repo root
		if (!resolved.startsWith(repoRoot + path.sep) && resolved !== repoRoot) {
			return undefined;
		}
		try {
			await fs.access(resolved, accessMode);
			return resolved;
		} catch {
			return undefined;
		}
	}

	// 2. Fall back to convention
	const defaultPath = path.join(repoRoot, DEFAULT_SCRIPT_NAME);
	try {
		await fs.access(defaultPath, accessMode);
		return defaultPath;
	} catch {
		return undefined;
	}
}

export async function runPostCreateScript(
	scriptPath: string,
	repoRoot: string,
	worktreePath: string,
	branch: string,
	timeout: number = TIMEOUT_MS,
): Promise<ScriptResult> {
	try {
		await execFilePromise(scriptPath, [worktreePath, branch], {
			cwd: repoRoot,
			timeout,
			env: {
				...process.env,
				WORKTREE_PATH: worktreePath,
				WORKTREE_BRANCH: branch,
				REPO_ROOT: repoRoot,
			},
		});
		return { success: true };
	} catch (err: unknown) {
		const error = err as Error & { killed?: boolean; code?: number | string };
		if (error.killed) {
			return {
				success: false,
				error: `Script timed out after ${timeout / 1000}s`,
			};
		}
		return {
			success: false,
			error: error.message || "Unknown error",
		};
	}
}
