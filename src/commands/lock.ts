import * as vscode from "vscode";
import type { GitService } from "../gitService";
import type { WorktreeItem } from "../worktreeProvider";

export async function lockWorktree(
	git: GitService,
	item: WorktreeItem,
): Promise<void> {
	try {
		await git.lockWorktree(item.worktree.path);
		vscode.window.showInformationMessage(
			`Locked worktree: ${item.worktree.branch}`,
		);
	} catch (err) {
		vscode.window.showErrorMessage(`Failed to lock: ${(err as Error).message}`);
	}
}

export async function unlockWorktree(
	git: GitService,
	item: WorktreeItem,
): Promise<void> {
	try {
		await git.unlockWorktree(item.worktree.path);
		vscode.window.showInformationMessage(
			`Unlocked worktree: ${item.worktree.branch}`,
		);
	} catch (err) {
		vscode.window.showErrorMessage(
			`Failed to unlock: ${(err as Error).message}`,
		);
	}
}
