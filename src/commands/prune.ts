import * as vscode from "vscode";
import type { GitService } from "../gitService";

export async function pruneWorktrees(git: GitService): Promise<void> {
	const confirm = await vscode.window.showWarningMessage(
		"Prune all stale worktree references?",
		{ modal: true },
		"Prune",
	);

	if (confirm !== "Prune") return;

	try {
		await git.pruneWorktrees();
		vscode.window.showInformationMessage("Stale worktrees pruned");
	} catch (err) {
		vscode.window.showErrorMessage(`Prune failed: ${(err as Error).message}`);
	}
}
