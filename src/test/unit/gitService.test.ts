import * as assert from "assert";
import { GitService } from "../../gitService";

// Mock implementation to intercept git commands
class MockGitService extends GitService {
	public cmdLog: string[] = [];
	public mockOutputs: { [key: string]: string } = {};

	protected async exec(cmd: string): Promise<string> {
		this.cmdLog.push(cmd);
		// Return explicit mock if set, otherwise empty string or simplified default
		for (const key of Object.keys(this.mockOutputs)) {
			if (cmd.includes(key)) {
				return this.mockOutputs[key];
			}
		}
		return "";
	}
}

describe("GitService Unit Tests", () => {
	let git: MockGitService;

	beforeEach(() => {
		git = new MockGitService("/mock/root");
	});

	it("creates worktree", async () => {
		await git.createWorktree("feature/abc", "/path/to/wt");
		assert.ok(
			git.cmdLog.some((cmd) =>
				cmd.includes('git worktree add "/path/to/wt" feature/abc'),
			),
		);
	});

	it("parsers worktree list correctly", async () => {
		const mockPorcelain = `
worktree /mock/root
HEAD 1234567
branch refs/heads/main

worktree /mock/root/../feature-a
HEAD abcdef1
branch refs/heads/feature-a

worktree /mock/root/../feature-b
HEAD 7654321
branch refs/heads/feature-b
locked reason is testing
`;

		git.mockOutputs["worktree list --porcelain"] = mockPorcelain;
		// Mock git show needed for rich details
		git.mockOutputs["git show"] = "Fix bug|Didier|2 hours ago";

		const worktrees = await git.getWorktrees();

		assert.strictEqual(worktrees.length, 3);

		// Main worktree
		assert.strictEqual(worktrees[0].branch, "main");
		assert.strictEqual(worktrees[0].commit, "1234567");
		assert.strictEqual(worktrees[0].isCurrent, true);
		assert.strictEqual(worktrees[0].isLocked, false);

		// Feature A
		assert.strictEqual(worktrees[1].path, "/mock/root/../feature-a");
		assert.strictEqual(worktrees[1].branch, "feature-a");
		assert.strictEqual(worktrees[1].isCurrent, false);

		// Feature B (Locked)
		assert.strictEqual(worktrees[2].branch, "feature-b");
		assert.strictEqual(worktrees[2].isLocked, true);
		assert.strictEqual(worktrees[2].lockReason, "reason is testing");
	});

	it("locks and unlocks worktree", async () => {
		await git.lockWorktree("/path/wt");
		assert.ok(git.cmdLog.some((c) => c === 'git worktree lock "/path/wt"'));

		await git.unlockWorktree("/path/wt");
		assert.ok(git.cmdLog.some((c) => c === 'git worktree unlock "/path/wt"'));
	});
});
