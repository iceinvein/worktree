import * as vscode from "vscode";
import type { Branch, GitService } from "./gitService";

export class BranchProvider implements vscode.TreeDataProvider<BranchItem> {
	private _onDidChange = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChange.event;

	constructor(private git: GitService) {}

	refresh(): void {
		this._onDidChange.fire();
	}

	getTreeItem(element: BranchItem): vscode.TreeItem {
		return element;
	}

	async getChildren(): Promise<BranchItem[]> {
		const config = vscode.workspace.getConfiguration("worktreeManager");
		const showRemote = config.get<boolean>("showRemoteBranches", true);
		const branches = await this.git.getBranches(showRemote);
		return branches.map((b) => new BranchItem(b));
	}
}

export class BranchItem extends vscode.TreeItem {
	constructor(public readonly branch: Branch) {
		super(branch.name, vscode.TreeItemCollapsibleState.None);

		this.iconPath = new vscode.ThemeIcon(
			branch.isRemote ? "cloud" : "git-branch",
		);
		this.description = branch.isRemote ? "remote" : "";
		this.contextValue = "branch";

		this.command = {
			command: "worktreeManager.create",
			title: "Create Worktree",
			arguments: [this],
		};
	}
}
