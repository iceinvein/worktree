import * as vscode from "vscode";
import type { Branch, GitService } from "./gitService";
import { formatBranchDescription } from "./utils/worktreeHelpers";

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
		const baseBranch = config.get<string>("baseBranch", "main");
		const branches = await this.git.getBranches(showRemote);

		const enriched = await Promise.all(
			branches.map(async (b) => {
				const localName = b.name.replace(/^origin\//, "");
				const [aheadBehind, behindRemote] = await Promise.all([
					this.git.getBranchAheadBehind(
						b.isRemote ? b.name : localName,
						baseBranch,
					),
					b.isRemote
						? Promise.resolve(0)
						: this.git.getBranchBehindRemote(localName),
				]);
				return {
					...b,
					ahead: aheadBehind.ahead,
					behind: aheadBehind.behind,
					behindRemote,
				};
			}),
		);

		return enriched.map((b) => new BranchItem(b, baseBranch));
	}
}

export class BranchItem extends vscode.TreeItem {
	constructor(
		public readonly branch: Branch,
		baseBranch: string,
	) {
		super(branch.name, vscode.TreeItemCollapsibleState.None);

		this.iconPath = new vscode.ThemeIcon(
			branch.isRemote ? "cloud" : "git-branch",
		);
		this.description = formatBranchDescription({
			isRemote: branch.isRemote,
			ahead: branch.ahead ?? 0,
			behind: branch.behind ?? 0,
			behindRemote: branch.behindRemote ?? 0,
			baseBranchName: baseBranch,
		});
		this.contextValue = "branch";

		this.command = {
			command: "worktreeManager.create",
			title: "Create Worktree",
			arguments: [this],
		};
	}
}
