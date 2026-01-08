import * as vscode from "vscode";
import { type GitService } from "./gitService";

export class StatusManager {
	private statusBarItem: vscode.StatusBarItem;

	constructor(private git: GitService) {
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			100,
		);
		this.statusBarItem.command = "worktreeManager.switch";
		this.update();

		// Subscribe to active editor changes as a proxy for window focus/workspace changes
		vscode.window.onDidChangeActiveTextEditor(() => this.update());
	}

	async update() {
		const worktrees = await this.git.getWorktrees();
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

		if (!workspaceRoot) {
			this.statusBarItem.hide();
			return;
		}

		const current = worktrees.find((wt) => wt.path === workspaceRoot);

		if (current) {
			this.statusBarItem.text = `$(git-branch) ${current.branch}`;
			this.statusBarItem.tooltip = `Worktree: ${current.path}\nClick to switch`;
			this.statusBarItem.show();
		} else {
			// Not in a worktree managed by us (or main repo)
			this.statusBarItem.hide();
		}
	}

	dispose() {
		this.statusBarItem.dispose();
	}
}
