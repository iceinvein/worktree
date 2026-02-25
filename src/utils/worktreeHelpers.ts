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
	ahead?: number;
	behind?: number;
	changedFilesCount?: number;
	lastActivityDate?: Date | null;
	staleDaysThreshold?: number;
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

	// Stale detection (only for non-current, non-locked worktrees)
	const threshold = worktree.staleDaysThreshold ?? 14;
	if (
		!worktree.isCurrent &&
		!worktree.isLocked &&
		isStale(worktree.lastActivityDate, threshold)
	) {
		iconId = "warning";
		iconColorId = "charts.orange";
	}

	// Text indicators
	if (worktree.isLocked) {
		descriptionSuffix += " 🔒";
	}

	// Ahead/behind
	const ab = formatAheadBehind(worktree.ahead ?? 0, worktree.behind ?? 0);
	if (ab) {
		descriptionSuffix += ` ${ab}`;
	}

	if (worktree.isDirty) {
		const count = worktree.changedFilesCount;
		if (count && count > 0) {
			descriptionSuffix += ` • ${count} changes`;
		} else {
			descriptionSuffix += " • Modified";
		}
		// Yellow icon only for non-current, non-locked, non-stale dirty worktrees
		if (!worktree.isCurrent && !worktree.isLocked && iconId === "git-branch") {
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

	// Ahead/behind
	const ab = formatAheadBehind(worktree.ahead ?? 0, worktree.behind ?? 0);
	if (ab) {
		md += `\n\n$(git-compare) ${ab}`;
	}

	// Disk size
	if (worktree.diskSizeBytes && worktree.diskSizeBytes > 0) {
		md += `\n\n$(database) ${formatDiskSize(worktree.diskSizeBytes)}`;
	}

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

/**
 * Formats ahead/behind counts into a compact display string.
 * Returns "" if both are 0.
 */
export function formatAheadBehind(ahead: number, behind: number): string {
	const parts: string[] = [];
	if (ahead > 0) parts.push(`↑${ahead}`);
	if (behind > 0) parts.push(`↓${behind}`);
	return parts.join(" ");
}

/**
 * Returns true if the given date is older than `thresholdDays` days ago.
 */
export function isStale(
	date: Date | null | undefined,
	thresholdDays: number,
): boolean {
	if (!date) return false;
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);
	return diffDays > thresholdDays;
}

/**
 * Formats byte count into human-readable size string.
 */
export function formatDiskSize(bytes: number): string {
	if (bytes === 0) return "0 KB";
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb.toFixed(1)} KB`;
	const mb = kb / 1024;
	if (mb < 1024) return `${mb.toFixed(1)} MB`;
	const gb = mb / 1024;
	return `${gb.toFixed(1)} GB`;
}
