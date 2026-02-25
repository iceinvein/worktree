import * as vscode from "vscode";
import type { GitService } from "../gitService";
import type { WorktreeItem } from "../worktreeProvider";

export async function updateFromMain(git: GitService, item: WorktreeItem) {
	if (!item?.worktree) return;

	const config = vscode.workspace.getConfiguration("worktreeManager");
	const baseBranch = config.get<string>("baseBranch", "main");

	if (item.worktree.isDirty) {
		const proceed = await vscode.window.showWarningMessage(
			`"${item.worktree.branch}" has uncommitted changes. Updating may cause conflicts.`,
			"Continue Anyway",
			"Cancel",
		);
		if (proceed !== "Continue Anyway") return;
	}

	const strategy = await vscode.window.showQuickPick(
		[
			{
				label: "Rebase",
				description: `Rebase onto ${baseBranch}`,
				value: "rebase" as const,
			},
			{
				label: "Merge",
				description: `Merge ${baseBranch} into branch`,
				value: "merge" as const,
			},
		],
		{
			placeHolder: `How should "${item.worktree.branch}" be updated from ${baseBranch}?`,
		},
	);

	if (!strategy) return;

	try {
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Updating ${item.worktree.branch}...`,
				cancellable: false,
			},
			async () => {
				if (strategy.value === "rebase") {
					await git.rebaseWorktree(item.worktree.path, baseBranch);
				} else {
					await git.mergeIntoWorktree(item.worktree.path, baseBranch);
				}
			},
		);

		vscode.window.showInformationMessage(
			`Updated "${item.worktree.branch}" via ${strategy.value}.`,
		);
	} catch (err) {
		const message = (err as Error).message;
		const action = await vscode.window.showErrorMessage(
			`Update failed (conflict?): ${message}`,
			"Open Worktree to Resolve",
		);
		if (action === "Open Worktree to Resolve") {
			const uri = vscode.Uri.file(item.worktree.path);
			await vscode.commands.executeCommand("vscode.openFolder", uri, {
				forceNewWindow: true,
			});
		}
	}
}
