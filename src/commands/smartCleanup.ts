import * as vscode from "vscode";
import type { GitService, Worktree } from "../gitService";
import { isStale } from "../utils/worktreeHelpers";

export type WorktreeCategory = "merged" | "stale" | "clean-behind" | "active";

export function categorizeWorktree(
	wt: Worktree,
	mergedBranches: string[],
	staleDaysThreshold: number,
): WorktreeCategory {
	if (mergedBranches.includes(wt.branch)) return "merged";
	if (isStale(wt.lastActivityDate, staleDaysThreshold)) return "stale";
	if (!wt.isDirty && (wt.behind ?? 0) > 0 && (wt.ahead ?? 0) === 0)
		return "clean-behind";
	return "active";
}

const categoryLabels: Record<
	WorktreeCategory,
	{ icon: string; label: string }
> = {
	merged: { icon: "$(check)", label: "Merged" },
	stale: { icon: "$(warning)", label: "Stale" },
	"clean-behind": { icon: "$(arrow-down)", label: "Behind" },
	active: { icon: "$(pulse)", label: "Active" },
};

export async function smartCleanup(git: GitService) {
	const config = vscode.workspace.getConfiguration("worktreeManager");
	const baseBranch = config.get<string>("baseBranch", "main");
	const staleDays = config.get<number>("staleDaysThreshold", 14);

	const worktrees = await git.getWorktrees();
	const mergedBranches = await git.getMergedBranches(baseBranch);

	const candidates = worktrees.filter((wt) => !wt.isCurrent);

	if (candidates.length === 0) {
		vscode.window.showInformationMessage("No other worktrees found.");
		return;
	}

	const categorized = candidates.map((wt) => ({
		worktree: wt,
		category: categorizeWorktree(wt, mergedBranches, staleDays),
	}));

	const actionable = categorized.filter((c) => c.category !== "active");

	if (actionable.length === 0) {
		vscode.window.showInformationMessage(
			"All worktrees are active. Nothing to clean up.",
		);
		return;
	}

	const items = actionable.map((c) => {
		const cat = categoryLabels[c.category];
		const daysAgo = c.worktree.lastActivityDate
			? `${Math.floor((Date.now() - c.worktree.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))}d ago`
			: "";
		return {
			label: `${cat.icon} ${c.worktree.branch}`,
			description: `${cat.label}${daysAgo ? ` (${daysAgo})` : ""} — ${c.worktree.path}`,
			picked: c.category === "merged" || c.category === "stale",
			worktree: c.worktree,
			category: c.category,
		};
	});

	const selected = await vscode.window.showQuickPick(items, {
		canPickMany: true,
		placeHolder: "Select worktrees to remove (merged + stale pre-selected)",
	});

	if (!selected || selected.length === 0) return;

	const dirtyOnes = selected.filter((s) => s.worktree.isDirty);
	if (dirtyOnes.length > 0) {
		const dirtyNames = dirtyOnes.map((d) => d.worktree.branch).join(", ");
		const proceed = await vscode.window.showWarningMessage(
			`${dirtyOnes.length} worktree(s) have uncommitted changes: ${dirtyNames}. Continue?`,
			{ modal: true },
			"Continue",
		);
		if (proceed !== "Continue") return;
	}

	const lockedOnes = selected.filter((s) => s.worktree.isLocked);
	const removable = selected.filter((s) => !s.worktree.isLocked);

	if (lockedOnes.length > 0) {
		vscode.window.showWarningMessage(
			`Skipping ${lockedOnes.length} locked worktree(s): ${lockedOnes.map((l) => l.worktree.branch).join(", ")}`,
		);
	}

	if (removable.length === 0) return;

	const confirm = await vscode.window.showWarningMessage(
		`Remove ${removable.length} worktree(s)? This cannot be undone.`,
		{ modal: true },
		"Remove",
	);

	if (confirm !== "Remove") return;

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: "Smart Cleanup...",
			cancellable: false,
		},
		async (progress) => {
			for (const item of removable) {
				progress.report({ message: item.worktree.branch });
				try {
					await git.removeWorktree(item.worktree.path, item.worktree.isDirty);
				} catch (err) {
					vscode.window.showErrorMessage(
						`Failed to remove ${item.worktree.branch}: ${(err as Error).message}`,
					);
				}
			}
			await git.pruneWorktrees();
		},
	);

	vscode.window.showInformationMessage(
		`Removed ${removable.length} worktree(s).`,
	);
	vscode.commands.executeCommand("worktreeManager.refresh");
}
