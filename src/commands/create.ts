import * as path from "node:path";
import * as vscode from "vscode";
import type { BranchItem } from "../branchProvider";
import type { GitService } from "../gitService";
import { applyThemeColor } from "../utils/theme";

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

	// 2. Resolve target path
	const config = vscode.workspace.getConfiguration("worktreeManager");
	const pattern = config.get<string>("defaultPath", "../{branch}");

	const repoName = path.basename(repoRoot);
	const safeBranch = branch.replace(/^origin\//, "").replace(/\//g, "-");
	const defaultPath = pattern
		.replace("{branch}", safeBranch)
		.replace("{repo}", repoName);

	const resolvedDefault = path.resolve(repoRoot, defaultPath);

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
			} catch (error) {
				vscode.window.showErrorMessage(
					"Failed to stash changes. Proceeding without bringing changes.",
				);
				stashAndPop = false; // logic failsafe
			}
		}
	}

	// 4. Create it
	try {
		await git.createWorktree(branch, targetPath);

		// NEW: Apply theme
		await applyThemeColor(targetPath, branch);

		if (stashAndPop) {
			try {
				await git.stashPop(targetPath);
			} catch (e) {
				vscode.window.showWarningMessage(
					"Created worktree but failed to pop stash (conflict?). Check 'git stash list'.",
				);
			}
		}

		vscode.window.showInformationMessage(`Worktree created: ${targetPath}`);
		return targetPath;
	} catch (err) {
		vscode.window.showErrorMessage(
			`Failed to create worktree: ${(err as Error).message}`,
		);
		return;
	}
}
