import * as assert from "node:assert";
import * as path from "node:path";
import type { Worktree } from "../../gitService";
import {
	buildWorktreeTooltipMarkdown,
	resolveWorktreeItemState,
	resolveWorktreePath,
} from "../../utils/worktreeHelpers";

/** Helper to build a full Worktree object with defaults */
function makeWorktree(overrides: Partial<Worktree> = {}): Worktree {
	return {
		path: "/mock/worktree",
		branch: "feature-test",
		commit: "abc1234",
		isCurrent: false,
		isDirty: false,
		isLocked: false,
		...overrides,
	};
}

describe("resolveWorktreeItemState", () => {
	it("returns default state for a normal worktree", () => {
		const state = resolveWorktreeItemState({
			isCurrent: false,
			isLocked: false,
			isDirty: false,
		});

		assert.strictEqual(state.contextValue, "worktree");
		assert.strictEqual(state.iconId, "git-branch");
		assert.strictEqual(state.iconColorId, undefined);
		assert.strictEqual(state.descriptionSuffix, "");
	});

	it("marks current worktree with check icon and green color", () => {
		const state = resolveWorktreeItemState({
			isCurrent: true,
			isLocked: false,
			isDirty: false,
		});

		assert.strictEqual(state.contextValue, "worktreeCurrent");
		assert.strictEqual(state.iconId, "check");
		assert.strictEqual(state.iconColorId, "testing.iconPassed");
	});

	it("marks locked worktree with lock icon", () => {
		const state = resolveWorktreeItemState({
			isCurrent: false,
			isLocked: true,
			isDirty: false,
		});

		assert.strictEqual(state.contextValue, "worktreeLocked");
		assert.strictEqual(state.iconId, "lock");
		assert.strictEqual(state.iconColorId, undefined);
		assert.ok(state.descriptionSuffix.includes("🔒"));
	});

	it("uses worktreeCurrentLocked when both current and locked", () => {
		const state = resolveWorktreeItemState({
			isCurrent: true,
			isLocked: true,
			isDirty: false,
		});

		assert.strictEqual(state.contextValue, "worktreeCurrentLocked");
		// Icon stays as "check" (current takes priority)
		assert.strictEqual(state.iconId, "check");
		assert.strictEqual(state.iconColorId, "testing.iconPassed");
		assert.ok(state.descriptionSuffix.includes("🔒"));
	});

	it("shows yellow icon for dirty non-current non-locked worktree", () => {
		const state = resolveWorktreeItemState({
			isCurrent: false,
			isLocked: false,
			isDirty: true,
		});

		assert.strictEqual(state.contextValue, "worktree");
		assert.strictEqual(state.iconId, "git-branch");
		assert.strictEqual(state.iconColorId, "charts.yellow");
		assert.ok(state.descriptionSuffix.includes("Modified"));
	});

	it("does not override icon to yellow when current and dirty", () => {
		const state = resolveWorktreeItemState({
			isCurrent: true,
			isLocked: false,
			isDirty: true,
		});

		assert.strictEqual(state.iconId, "check");
		assert.strictEqual(state.iconColorId, "testing.iconPassed");
		assert.ok(state.descriptionSuffix.includes("Modified"));
	});

	it("does not override icon to yellow when locked and dirty", () => {
		const state = resolveWorktreeItemState({
			isCurrent: false,
			isLocked: true,
			isDirty: true,
		});

		assert.strictEqual(state.iconId, "lock");
		assert.strictEqual(state.iconColorId, undefined);
		assert.ok(state.descriptionSuffix.includes("Modified"));
		assert.ok(state.descriptionSuffix.includes("🔒"));
	});

	it("handles all flags true: current + locked + dirty", () => {
		const state = resolveWorktreeItemState({
			isCurrent: true,
			isLocked: true,
			isDirty: true,
		});

		assert.strictEqual(state.contextValue, "worktreeCurrentLocked");
		assert.strictEqual(state.iconId, "check");
		assert.strictEqual(state.iconColorId, "testing.iconPassed");
		assert.ok(state.descriptionSuffix.includes("🔒"));
		assert.ok(state.descriptionSuffix.includes("Modified"));
	});
});

describe("buildWorktreeTooltipMarkdown", () => {
	it("includes branch, path, and commit", () => {
		const md = buildWorktreeTooltipMarkdown(makeWorktree());

		assert.ok(md.includes("**feature-test**"));
		assert.ok(md.includes("$(folder) /mock/worktree"));
		assert.ok(md.includes("$(git-commit) abc1234"));
	});

	it("includes commit message when present", () => {
		const md = buildWorktreeTooltipMarkdown(
			makeWorktree({ commitMessage: "Fix login bug" }),
		);

		assert.ok(md.includes(": Fix login bug"));
	});

	it("includes author and date when present", () => {
		const md = buildWorktreeTooltipMarkdown(
			makeWorktree({
				commitAuthor: "Alice",
				commitDate: "3 days ago",
			}),
		);

		assert.ok(md.includes("by **Alice**"));
		assert.ok(md.includes("(3 days ago)"));
	});

	it("includes locked section with reason", () => {
		const md = buildWorktreeTooltipMarkdown(
			makeWorktree({
				isLocked: true,
				lockReason: "in progress",
			}),
		);

		assert.ok(md.includes("$(lock) **Locked**"));
		assert.ok(md.includes(": in progress"));
	});

	it("includes locked section without reason", () => {
		const md = buildWorktreeTooltipMarkdown(makeWorktree({ isLocked: true }));

		assert.ok(md.includes("$(lock) **Locked**"));
		assert.ok(!md.includes("$(lock) **Locked**:"));
	});

	it("omits optional sections when not present", () => {
		const md = buildWorktreeTooltipMarkdown(makeWorktree());

		assert.ok(!md.includes("by **"));
		assert.ok(!md.includes("$(lock)"));
	});
});

describe("resolveWorktreePath", () => {
	it("resolves default pattern with simple branch", () => {
		const result = resolveWorktreePath(
			"feature-login",
			"/repo/root",
			"../{branch}",
		);

		assert.strictEqual(result, path.resolve("/repo/root", "../feature-login"));
	});

	it("replaces slashes in branch name with hyphens", () => {
		const result = resolveWorktreePath(
			"feature/login/oauth",
			"/repo/root",
			"../{branch}",
		);

		assert.strictEqual(
			result,
			path.resolve("/repo/root", "../feature-login-oauth"),
		);
	});

	it("strips origin/ prefix from remote branches", () => {
		const result = resolveWorktreePath(
			"origin/feature/login",
			"/repo/root",
			"../{branch}",
		);

		assert.strictEqual(result, path.resolve("/repo/root", "../feature-login"));
	});

	it("interpolates {repo} placeholder", () => {
		const result = resolveWorktreePath(
			"main",
			"/home/user/my-project",
			"../{repo}-{branch}",
		);

		assert.strictEqual(
			result,
			path.resolve("/home/user/my-project", "../my-project-main"),
		);
	});

	it("handles absolute path pattern", () => {
		const result = resolveWorktreePath(
			"develop",
			"/repo/root",
			"/tmp/worktrees/{branch}",
		);

		assert.strictEqual(result, "/tmp/worktrees/develop");
	});
});
