import * as vscode from "vscode";
import { AutoRefreshManager } from "./autoRefresh";
import { BranchProvider } from "./branchProvider";
import { checkMergedWorktrees } from "./commands/cleanup";
import { createWorktree } from "./commands/create";
import { diffWorktree } from "./commands/diff";
import { lockWorktree, unlockWorktree } from "./commands/lock";
import { openWorktree } from "./commands/open";
import { pruneWorktrees } from "./commands/prune";
import { removeWorktree } from "./commands/remove";
import { smartCleanup } from "./commands/smartCleanup";
import { switchWorktree } from "./commands/switch";
import { GitService } from "./gitService";
import { StatusManager } from "./statusBar";
import { EmptyDocumentProvider } from "./utils/emptyProvider";
import { type WorktreeItem, WorktreeProvider } from "./worktreeProvider";

export function activate(context: vscode.ExtensionContext) {
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workspaceRoot) {
		vscode.window.showErrorMessage("No workspace open");
		return;
	}

	const git = new GitService(workspaceRoot);
	const worktreeProvider = new WorktreeProvider(git);
	const branchProvider = new BranchProvider(git);
	const statusManager = new StatusManager(git);

	context.subscriptions.push(statusManager);

	// Register tree views
	vscode.window.registerTreeDataProvider(
		"worktreeManager.worktrees",
		worktreeProvider,
	);
	vscode.window.registerTreeDataProvider(
		"worktreeManager.branches",
		branchProvider,
	);

	// Helper to refresh both views
	const refreshAll = () => {
		worktreeProvider.refresh();
		branchProvider.refresh();
	};

	// Auto-refresh on filesystem changes, window focus, and polling
	const autoRefresh = new AutoRefreshManager(refreshAll);
	context.subscriptions.push(autoRefresh);

	// Register commands
	context.subscriptions.push(
		vscode.workspace.registerTextDocumentContentProvider(
			"worktree-empty",
			new EmptyDocumentProvider(),
		),

		vscode.commands.registerCommand("worktreeManager.refresh", refreshAll),

		vscode.commands.registerCommand("worktreeManager.switch", () =>
			switchWorktree(git),
		),

		vscode.commands.registerCommand(
			"worktreeManager.create",
			async (branchItem?) => {
				const created = await createWorktree(git, workspaceRoot, branchItem);
				if (created) {
					refreshAll();
					// Optionally auto-open
					const open = await vscode.window.showInformationMessage(
						"Worktree created. Open it?",
						"Yes",
						"No",
					);
					if (open === "Yes") {
						const mockItem = {
							worktree: { path: created },
						} as unknown as WorktreeItem;
						await openWorktree(mockItem);
					}
				}
			},
		),

		vscode.commands.registerCommand("worktreeManager.open", openWorktree),

		vscode.commands.registerCommand("worktreeManager.diff", async (item) => {
			await diffWorktree(git, item);
		}),

		vscode.commands.registerCommand(
			"worktreeManager.openNewWindow",
			async (item) => {
				const uri = vscode.Uri.file(item.worktree.path);
				await vscode.commands.executeCommand("vscode.openFolder", uri, {
					forceNewWindow: true,
				});
			},
		),

		vscode.commands.registerCommand("worktreeManager.remove", async (item) => {
			const removed = await removeWorktree(git, item);
			if (removed) refreshAll();
		}),

		vscode.commands.registerCommand("worktreeManager.lock", async (item) => {
			await lockWorktree(git, item);
			refreshAll();
		}),

		vscode.commands.registerCommand("worktreeManager.unlock", async (item) => {
			await unlockWorktree(git, item);
			refreshAll();
		}),

		vscode.commands.registerCommand("worktreeManager.prune", async () => {
			await pruneWorktrees(git);
			refreshAll();
		}),

		vscode.commands.registerCommand("worktreeManager.checkMerged", async () => {
			await checkMergedWorktrees(git);
			refreshAll();
		}),

		vscode.commands.registerCommand(
			"worktreeManager.smartCleanup",
			async () => {
				await smartCleanup(git);
				refreshAll();
			},
		),
	);
}

export function deactivate() {}
