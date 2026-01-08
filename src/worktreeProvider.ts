import * as vscode from "vscode";
import type { GitService, Worktree } from "./gitService";

export class WorktreeProvider implements vscode.TreeDataProvider<WorktreeItem> {
	private _onDidChange = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChange.event;

	constructor(private git: GitService) {}

	refresh(): void {
		this._onDidChange.fire();
	}

	getTreeItem(element: WorktreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(): Promise<WorktreeItem[]> {
		const worktrees = await this.git.getWorktrees();
		return worktrees.map((wt) => new WorktreeItem(wt));
	}
}

export class WorktreeItem extends vscode.TreeItem {
	constructor(public readonly worktree: Worktree) {
		super(worktree.branch, vscode.TreeItemCollapsibleState.None);

		this.description = worktree.path;

		const tooltip = new vscode.MarkdownString(`**${worktree.branch}**\n\n`);
		tooltip.appendMarkdown(`$(folder) ${worktree.path}\n\n`);
		tooltip.appendMarkdown(`$(git-commit) ${worktree.commit}`);
		if (worktree.commitMessage)
			tooltip.appendMarkdown(`: ${worktree.commitMessage}`);
		if (worktree.commitAuthor)
			tooltip.appendMarkdown(`\n\nby **${worktree.commitAuthor}**`);
		if (worktree.commitDate)
			tooltip.appendMarkdown(` (${worktree.commitDate})`);

		if (worktree.isLocked) {
			tooltip.appendMarkdown(`\n\n$(lock) **Locked**`);
			if (worktree.lockReason)
				tooltip.appendMarkdown(`: ${worktree.lockReason}`);
		}

		this.tooltip = tooltip;

		// Icon logic: Current > Locked > Default
		if (worktree.isCurrent) {
			this.iconPath = new vscode.ThemeIcon(
				"check",
				new vscode.ThemeColor("testing.iconPassed"),
			);
			this.contextValue = "worktreeCurrent";
		} else if (worktree.isLocked) {
			this.iconPath = new vscode.ThemeIcon("lock");
			this.contextValue = "worktreeLocked";
		} else {
			this.iconPath = new vscode.ThemeIcon("git-branch");
			this.contextValue = "worktree";
		}

		// Update context value for combinations
		if (worktree.isCurrent && worktree.isLocked) {
			this.contextValue = "worktreeCurrentLocked";
		}

		// Text indicators
		if (worktree.isLocked) {
			this.description += " 🔒";
		}

		if (worktree.isDirty) {
			this.description += " • Modified";
			// If not current/locked, show yellow branch?
			// Prioritize Locked icon over Dirty color if not current.
			// Ideally we want both. But TreeItem only has one icon.
			// Let's stick to the color if it's just a normal branch.
			if (!worktree.isCurrent && !worktree.isLocked) {
				this.iconPath = new vscode.ThemeIcon(
					"git-branch",
					new vscode.ThemeColor("charts.yellow"),
				);
			}
		}

		this.command = {
			command: "worktreeManager.open",
			title: "Open",
			arguments: [this],
		};
	}
}
