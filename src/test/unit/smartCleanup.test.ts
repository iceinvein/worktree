import * as assert from "node:assert";
import { categorizeWorktree } from "../../commands/smartCleanup";
import type { Worktree } from "../../gitService";

function makeWorktree(overrides: Partial<Worktree> = {}): Worktree {
	return {
		path: "/mock/worktree",
		branch: "feature-test",
		commit: "abc1234",
		isCurrent: false,
		isDirty: false,
		isLocked: false,
		ahead: 0,
		behind: 0,
		changedFilesCount: 0,
		diskSizeBytes: 0,
		lastActivityDate: new Date(),
		...overrides,
	};
}

describe("categorizeWorktree", () => {
	const mergedBranches = ["feature-done", "hotfix-old"];

	it("categorizes merged branch as 'merged'", () => {
		const wt = makeWorktree({ branch: "feature-done" });
		assert.strictEqual(categorizeWorktree(wt, mergedBranches, 14), "merged");
	});

	it("categorizes stale worktree", () => {
		const old = new Date();
		old.setDate(old.getDate() - 20);
		const wt = makeWorktree({ branch: "feature-old", lastActivityDate: old });
		assert.strictEqual(categorizeWorktree(wt, mergedBranches, 14), "stale");
	});

	it("categorizes clean-behind worktree", () => {
		const wt = makeWorktree({
			branch: "feature-behind",
			behind: 5,
			ahead: 0,
			isDirty: false,
		});
		assert.strictEqual(
			categorizeWorktree(wt, mergedBranches, 14),
			"clean-behind",
		);
	});

	it("categorizes active worktree", () => {
		const wt = makeWorktree({ branch: "feature-active", ahead: 2 });
		assert.strictEqual(categorizeWorktree(wt, mergedBranches, 14), "active");
	});

	it("prefers merged over stale", () => {
		const old = new Date();
		old.setDate(old.getDate() - 20);
		const wt = makeWorktree({
			branch: "feature-done",
			lastActivityDate: old,
		});
		assert.strictEqual(categorizeWorktree(wt, mergedBranches, 14), "merged");
	});
});
