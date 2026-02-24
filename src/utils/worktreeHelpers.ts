import * as path from "node:path";
import type { Worktree } from "../gitService";

export interface WorktreeItemState {
	contextValue:
		| "worktree"
		| "worktreeCurrent"
		| "worktreeLocked"
		| "worktreeCurrentLocked";
	iconId: string;
	iconColorId?: string;
	descriptionSuffix: string;
}

/**
 * Determines contextValue, icon, and description suffixes for a worktree tree item.
 * Pure function extracted from WorktreeItem constructor for testability.
 */
export function resolveWorktreeItemState(worktree: {
	isCurrent: boolean;
	isLocked: boolean;
	isDirty: boolean;
}): WorktreeItemState {
	let contextValue: WorktreeItemState["contextValue"];
	let iconId: string;
	let iconColorId: string | undefined;
	let descriptionSuffix = "";

	// Icon/context priority: Current > Locked > Default
	if (worktree.isCurrent) {
		iconId = "check";
		iconColorId = "testing.iconPassed";
		contextValue = "worktreeCurrent";
	} else if (worktree.isLocked) {
		iconId = "lock";
		contextValue = "worktreeLocked";
	} else {
		iconId = "git-branch";
		contextValue = "worktree";
	}

	// Combination override
	if (worktree.isCurrent && worktree.isLocked) {
		contextValue = "worktreeCurrentLocked";
	}

	// Text indicators
	if (worktree.isLocked) {
		descriptionSuffix += " 🔒";
	}

	if (worktree.isDirty) {
		descriptionSuffix += " • Modified";
		// Yellow icon only for non-current, non-locked dirty worktrees
		if (!worktree.isCurrent && !worktree.isLocked) {
			iconId = "git-branch";
			iconColorId = "charts.yellow";
		}
	}

	return { contextValue, iconId, iconColorId, descriptionSuffix };
}

/**
 * Builds the markdown string content for a worktree tooltip.
 * Pure function extracted from WorktreeItem constructor for testability.
 */
export function buildWorktreeTooltipMarkdown(worktree: Worktree): string {
	let md = `**${worktree.branch}**\n\n`;
	md += `$(folder) ${worktree.path}\n\n`;
	md += `$(git-commit) ${worktree.commit}`;
	if (worktree.commitMessage) md += `: ${worktree.commitMessage}`;
	if (worktree.commitAuthor) md += `\n\nby **${worktree.commitAuthor}**`;
	if (worktree.commitDate) md += ` (${worktree.commitDate})`;
	if (worktree.isLocked) {
		md += `\n\n$(lock) **Locked**`;
		if (worktree.lockReason) md += `: ${worktree.lockReason}`;
	}
	return md;
}

/**
 * Resolves a worktree target path from branch name, repo root, and pattern.
 * Sanitizes branch name (strips origin/ prefix, replaces / with -) and
 * interpolates {branch} and {repo} placeholders.
 */
export function resolveWorktreePath(
	branch: string,
	repoRoot: string,
	pattern: string,
): string {
	const repoName = path.basename(repoRoot);
	const safeBranch = branch.replace(/^origin\//, "").replace(/\//g, "-");
	const expanded = pattern
		.replace("{branch}", safeBranch)
		.replace("{repo}", repoName);
	return path.resolve(repoRoot, expanded);
}
