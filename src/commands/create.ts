import * as path from "node:path";
import * as vscode from "vscode";
import type { BranchItem } from "../branchProvider";
import type { GitService } from "../gitService";

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

	// 4. Create it
	try {
		await git.createWorktree(branch, targetPath);
		vscode.window.showInformationMessage(`Worktree created: ${targetPath}`);
		return targetPath;
	} catch (err) {
		vscode.window.showErrorMessage(
			`Failed to create worktree: ${(err as Error).message}`,
		);
		return;
	}
}
