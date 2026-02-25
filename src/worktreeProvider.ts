import * as vscode from "vscode";
import type { GitService, Worktree } from "./gitService";
import {
	buildWorktreeTooltipMarkdown,
	resolveWorktreeItemState,
} from "./utils/worktreeHelpers";

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
		const config = vscode.workspace.getConfiguration("worktreeManager");
		const staleDaysThreshold = config.get<number>("staleDaysThreshold", 14);
		return worktrees.map((wt) => new WorktreeItem(wt, staleDaysThreshold));
	}
}

export class WorktreeItem extends vscode.TreeItem {
	constructor(
		public readonly worktree: Worktree,
		staleDaysThreshold = 14,
	) {
		super(worktree.branch, vscode.TreeItemCollapsibleState.None);

		const state = resolveWorktreeItemState({
			...worktree,
			staleDaysThreshold,
		});

		this.contextValue = state.contextValue;
		this.iconPath = state.iconColorId
			? new vscode.ThemeIcon(
					state.iconId,
					new vscode.ThemeColor(state.iconColorId),
				)
			: new vscode.ThemeIcon(state.iconId);
		this.description = worktree.path + state.descriptionSuffix;
		this.tooltip = new vscode.MarkdownString(
			buildWorktreeTooltipMarkdown(worktree),
		);

		this.command = {
			command: "worktreeManager.open",
			title: "Open",
			arguments: [this],
		};
	}
}
