import * as vscode from "vscode";
import type { GitService } from "../gitService";
import type { WorktreeItem } from "../worktreeProvider";

export async function removeWorktree(
	git: GitService,
	item: WorktreeItem,
): Promise<boolean> {
	const confirm = await vscode.window.showWarningMessage(
		`Remove worktree "${item.worktree.branch}" at ${item.worktree.path}?`,
		{ modal: true },
		"Remove",
		"Force Remove",
	);

	if (!confirm) return false;

	try {
		await git.removeWorktree(item.worktree.path, confirm === "Force Remove");
		vscode.window.showInformationMessage(
			`Removed worktree: ${item.worktree.branch}`,
		);
		return true;
	} catch (err) {
		vscode.window.showErrorMessage(
			`Failed to remove: ${(err as Error).message}`,
		);
		return false;
	}
}
