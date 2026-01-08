import * as vscode from "vscode";
import { type GitService } from "../gitService";
import { openWorktree } from "./open";

export async function switchWorktree(git: GitService) {
	const worktrees = await git.getWorktrees();

	const items = worktrees.map((wt) => ({
		label: `$(git-branch) ${wt.branch}`,
		description: wt.path,
		detail: wt.isCurrent ? "Current Window" : undefined,
		worktree: wt,
	}));

	const selected = await vscode.window.showQuickPick(items, {
		placeHolder: "Select worktree to switch to",
		matchOnDescription: true,
	});

	if (selected) {
		await openWorktree({ worktree: selected.worktree });
	}
}
