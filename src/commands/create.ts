import * as vscode from "vscode";
import type { BranchItem } from "../branchProvider";
import { cloneEnvironment, loadEnvCloneConfig } from "../envCloner";
import type { GitService } from "../gitService";
import { findScript, runPostCreateScript } from "../postCreateScript";
import { applyThemeColor } from "../utils/theme";
import { isValidBranchName } from "../utils/validation";
import { resolveWorktreePath } from "../utils/worktreeHelpers";

export async function createWorktree(
	git: GitService,
	repoRoot: string,
	branchItem?: BranchItem,
): Promise<string | undefined> {
	// 1. Get branch name
	let branch: string;
	if (branchItem?.branch) {
		branch = branchItem.branch.name;
	} else {
		const input = await vscode.window.showInputBox({
			prompt: "Branch name (existing or new)",
			placeHolder: "feature/my-feature",
		});
		if (!input) return;
		branch = input;
	}

	if (!isValidBranchName(branch)) {
		vscode.window.showErrorMessage(
			`Invalid branch name: "${branch}". Use only letters, numbers, hyphens, underscores, dots, and slashes.`,
		);
		return;
	}

	// 2. Resolve target path
	const config = vscode.workspace.getConfiguration("worktreeManager");
	const pattern = config.get<string>("defaultPath", "../{branch}");

	const resolvedDefault = resolveWorktreePath(branch, repoRoot, pattern);

	// 3. Prompt for path (prefilled with default)
	const targetPath = await vscode.window.showInputBox({
		prompt: "Worktree path",
		value: resolvedDefault,
		valueSelection: [resolvedDefault.length, resolvedDefault.length],
	});
	if (!targetPath) return;

	// Check if current repo is dirty
	const isDirty = await git.isWorktreeDirty(repoRoot);
	const hasCommits = await git.hasCommits();
	let stashAndPop = false;

	if (isDirty && hasCommits) {
		const answer = await vscode.window.showInformationMessage(
			"You have uncommitted changes. Bring them to the new worktree?",
			"Yes",
			"No",
		);
		if (answer === "Yes") {
			try {
				await git.stash(`Worktree Move: ${branch}`);
				stashAndPop = true;
			} catch (_error) {
				vscode.window.showErrorMessage(
					"Failed to stash changes. Proceeding without bringing changes.",
				);
				stashAndPop = false; // logic failsafe
			}
		}
	}

	// 4. Create it
	try {
		const result = await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Creating worktree for ${branch}...`,
				cancellable: false,
			},
			async (progress) => {
				await git.createWorktree(branch, targetPath);
				progress.report({ message: "Applying theme..." });

				await applyThemeColor(targetPath, branch);

				// Clone environment files if configured
				const envConfigName = config.get<string>(
					"envCloneConfig",
					".worktree-env.json",
				);
				const envConfig = await loadEnvCloneConfig(repoRoot, envConfigName);
				if (envConfig) {
					progress.report({ message: "Cloning environment..." });
					await cloneEnvironment(repoRoot, targetPath, envConfig);
				}

				// Run post-create script if configured
				const postCreateSetting = config.get<string>("postCreateScript", "");
				const scriptPath = await findScript(repoRoot, postCreateSetting);
				if (scriptPath) {
					progress.report({ message: "Running setup script..." });
					const scriptResult = await runPostCreateScript(
						scriptPath,
						repoRoot,
						targetPath,
						branch,
					);
					if (!scriptResult.success) {
						vscode.window.showWarningMessage(
							`Post-create script failed: ${scriptResult.error}`,
						);
					}
				}

				if (stashAndPop) {
					progress.report({ message: "Applying stashed changes..." });
					try {
						await git.stashPop(targetPath);
					} catch (_e) {
						vscode.window.showWarningMessage(
							"Created worktree but failed to pop stash (conflict?). Check 'git stash list'.",
						);
					}
				}

				return targetPath;
			},
		);

		vscode.window.showInformationMessage(`Worktree created: ${result}`);
		return result;
	} catch (err) {
		vscode.window.showErrorMessage(
			`Failed to create worktree: ${(err as Error).message}`,
		);
		return;
	}
}
