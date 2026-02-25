import * as vscode from "vscode";
import type { GitService } from "../gitService";

export async function checkMergedWorktrees(git: GitService) {
	const branches = ["main", "master"];
	let mergedBranches: string[] = [];

	for (const target of branches) {
		const merged = await git.getMergedBranches(target);
		mergedBranches.push(...merged);
	}

	mergedBranches = [...new Set(mergedBranches)]; // Deduplicate

	if (mergedBranches.length === 0) {
		vscode.window.showInformationMessage("No merged worktrees found.");
		return;
	}

	const worktrees = await git.getWorktrees();
	const candidates = worktrees.filter((wt) =>
		mergedBranches.includes(wt.branch),
	);

	if (candidates.length === 0) {
		vscode.window.showInformationMessage("No merged worktrees found.");
		return;
	}

	const items = candidates.map((wt) => ({
		label: `$(trash) ${wt.branch}`,
		description: `Merged. Path: ${wt.path}`,
		worktree: wt,
		picked: true,
	}));

	const selected = await vscode.window.showQuickPick(items, {
		canPickMany: true,
		placeHolder: "Select merged worktrees to delete",
	});

	if (selected && selected.length > 0) {
		const confirm = await vscode.window.showWarningMessage(
			`Delete ${selected.length} worktrees? This cannot be undone.`,
			{ modal: true },
			"Delete",
		);

		if (confirm === "Delete") {
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: "Deleting worktrees...",
					cancellable: false,
				},
				async (progress) => {
					for (const item of selected) {
						progress.report({ message: item.worktree.branch });
						await git.removeWorktree(item.worktree.path, true);
					}
					// Also prune to clean up metadata
					await git.pruneWorktrees();
				},
			);
			vscode.commands.executeCommand("worktreeManager.refresh");
			vscode.window.showInformationMessage(
				`Deleted ${selected.length} worktrees.`,
			);
		}
	}
}
