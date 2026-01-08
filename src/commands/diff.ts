import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import type { GitService } from "../gitService";
import type { WorktreeItem } from "../worktreeProvider";

export async function diffWorktree(git: GitService, item: WorktreeItem) {
	if (!item?.worktree) return;

	// Use HEAD...target to see what is on target that is not on HEAD (or divergence)
	// Or use simple diff?
	// The request was "Compare with Current".
	// git diff --stat HEAD...<worktree-path>

	try {
		// We need to resolve the worktree path or branch to something git understands relative to current repo
		// If worktree is a branch, we can use the branch name.
		// If it is detached, we might need a commit hash.

		// Use commit hash to avoid ambiguity with branch names that might not be local refs
		// Fetch fresh commit from worktree path to avoid stale/invalid 0000000 hashes
		let target: string | undefined;
		try {
			target = await git.getHeadCommit(item.worktree.path);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			vscode.window.showErrorMessage(`Diff Error: ${message}`);
			return;
		}

		if (!target) {
			vscode.window.showErrorMessage(
				`Could not resolve commit hash for ${item.worktree.path}`,
			);
			return;
		}

		// Get list of changed files
		let files: string[] = [];
		try {
			files = await git.getChangedFiles(target);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			vscode.window.showErrorMessage(`Diff Failed: ${message}`);
			return;
		}

		if (files.length === 0) {
			vscode.window.showInformationMessage("No differences found.");
			return;
		}

		// Show QuickPick
		const selected = await vscode.window.showQuickPick(files, {
			placeHolder: `Select a file to compare (HEAD ↔ ${item.worktree.branch})`,
		});

		if (selected) {
			// Open Diff Editor
			// Left: Workspace file (HEAD-ish)
			// Right: Worktree file

			// Note: If we really want to compare against HEAD commit, we should use git:/ uri scheme or similar.
			// But usually users want to compare "My Current Workspace" vs "That Worktree".
			// So we use standard file URIs.

			// TODO: Handle deleted/added files gracefully?
			// vscode.diff handles "non-existent" files by showing empty content usually, provided we map them right.

			// 2. Resolve URIs for diff
			// If file doesn't exist on one side, use our empty provider
			const leftPath = path.resolve(git.getRepoRoot(), selected);
			const rightPath = path.resolve(item.worktree.path, selected);

			let leftUri = vscode.Uri.file(leftPath);
			let rightUri = vscode.Uri.file(rightPath);

			try {
				await fs.access(leftPath);
			} catch {
				leftUri = vscode.Uri.parse("worktree-empty:empty");
			}

			try {
				await fs.access(rightPath);
			} catch {
				rightUri = vscode.Uri.parse("worktree-empty:empty");
			}

			await vscode.commands.executeCommand(
				"vscode.diff",
				leftUri,
				rightUri,
				`${path.basename(selected)} (Current ↔ ${item.worktree.branch})`,
			);
		}
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		vscode.window.showErrorMessage(`Failed to diff worktree: ${message}`);
	}
}
