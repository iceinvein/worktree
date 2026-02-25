import * as vscode from "vscode";
import type { GitService } from "../gitService";
import type { WorktreeItem } from "../worktreeProvider";

export async function bulkRemove(git: GitService, items: WorktreeItem[]) {
	const removable = items.filter(
		(i) => !i.worktree.isCurrent && !i.worktree.isLocked,
	);

	if (removable.length === 0) {
		vscode.window.showInformationMessage(
			"No removable worktrees selected (current and locked are excluded).",
		);
		return;
	}

	const names = removable.map((i) => i.worktree.branch).join(", ");
	const confirm = await vscode.window.showWarningMessage(
		`Remove ${removable.length} worktree(s): ${names}?`,
		{ modal: true },
		"Remove",
	);

	if (confirm !== "Remove") return;

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: "Removing worktrees...",
			cancellable: false,
		},
		async (progress) => {
			for (const item of removable) {
				progress.report({ message: item.worktree.branch });
				try {
					await git.removeWorktree(item.worktree.path, item.worktree.isDirty);
				} catch (err) {
					vscode.window.showErrorMessage(
						`Failed to remove ${item.worktree.branch}: ${(err as Error).message}`,
					);
				}
			}
			await git.pruneWorktrees();
		},
	);

	vscode.window.showInformationMessage(
		`Removed ${removable.length} worktree(s).`,
	);
}

export async function bulkLock(git: GitService, items: WorktreeItem[]) {
	const lockable = items.filter((i) => !i.worktree.isLocked);

	for (const item of lockable) {
		try {
			await git.lockWorktree(item.worktree.path);
		} catch (err) {
			vscode.window.showErrorMessage(
				`Failed to lock ${item.worktree.branch}: ${(err as Error).message}`,
			);
		}
	}

	vscode.window.showInformationMessage(
		`Locked ${lockable.length} worktree(s).`,
	);
}

export async function bulkUpdate(git: GitService, items: WorktreeItem[]) {
	const config = vscode.workspace.getConfiguration("worktreeManager");
	const baseBranch = config.get<string>("baseBranch", "main");

	const strategy = await vscode.window.showQuickPick(
		[
			{ label: "Rebase", value: "rebase" as const },
			{ label: "Merge", value: "merge" as const },
		],
		{
			placeHolder: `Update ${items.length} worktree(s) from ${baseBranch}`,
		},
	);

	if (!strategy) return;

	const updatable = items.filter((i) => !i.worktree.isCurrent);
	let successCount = 0;

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: `Updating worktrees (${strategy.value})...`,
			cancellable: false,
		},
		async (progress) => {
			for (const item of updatable) {
				progress.report({ message: item.worktree.branch });
				try {
					if (strategy.value === "rebase") {
						await git.rebaseWorktree(item.worktree.path, baseBranch);
					} else {
						await git.mergeIntoWorktree(item.worktree.path, baseBranch);
					}
					successCount++;
				} catch (err) {
					vscode.window.showErrorMessage(
						`Failed to update ${item.worktree.branch}: ${(err as Error).message}`,
					);
				}
			}
		},
	);

	vscode.window.showInformationMessage(
		`Updated ${successCount}/${updatable.length} worktree(s).`,
	);
}
