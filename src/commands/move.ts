import * as vscode from "vscode";
import type { GitService } from "../gitService";
import type { WorktreeItem } from "../worktreeProvider";

export async function moveWorktree(
	git: GitService,
	item: WorktreeItem,
): Promise<boolean> {
	if (!item?.worktree) return false;

	const newPath = await vscode.window.showInputBox({
		prompt: `Move worktree "${item.worktree.branch}" to new path`,
		value: item.worktree.path,
		valueSelection: [item.worktree.path.length, item.worktree.path.length],
	});

	if (!newPath || newPath === item.worktree.path) return false;

	try {
		await git.moveWorktree(item.worktree.path, newPath);
		vscode.window.showInformationMessage(`Moved worktree to: ${newPath}`);
		return true;
	} catch (err) {
		vscode.window.showErrorMessage(
			`Failed to move worktree: ${(err as Error).message}`,
		);
		return false;
	}
}
