import * as assert from "assert";
import { GitService } from "../../gitService";

// Mock implementation to intercept git commands
class MockGitService extends GitService {
	public cmdLog: string[] = [];
	public mockOutputs: { [key: string]: string } = {};
	public mockErrors: { [key: string]: Error } = {};

	protected async exec(cmd: string): Promise<string> {
		this.cmdLog.push(cmd);
		// Check for error patterns first
		for (const key of Object.keys(this.mockErrors)) {
			if (cmd.includes(key)) {
				throw this.mockErrors[key];
			}
		}
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

	describe("createWorktree", () => {
		it("creates worktree for remote branch with local tracking branch", async () => {
			await git.createWorktree("origin/feature-x", "/path/to/wt");
			assert.ok(
				git.cmdLog.some((cmd) =>
					cmd.includes(
						'git worktree add -b feature-x "/path/to/wt" origin/feature-x',
					),
				),
			);
		});

		it("creates worktree with new branch when branch does not exist", async () => {
			git.mockErrors["rev-parse --verify"] = new Error(
				"fatal: Needed a single revision",
			);
			await git.createWorktree("new-feature", "/path/to/wt");
			assert.ok(
				git.cmdLog.some((cmd) =>
					cmd.includes('git worktree add -b new-feature "/path/to/wt" HEAD'),
				),
			);
		});
	});

	describe("removeWorktree", () => {
		it("removes worktree without force", async () => {
			await git.removeWorktree("/path/to/wt");
			assert.ok(
				git.cmdLog.some((c) =>
					c.includes('git worktree remove  "/path/to/wt"'),
				),
			);
		});

		it("removes worktree with force flag", async () => {
			await git.removeWorktree("/path/to/wt", true);
			assert.ok(
				git.cmdLog.some((c) =>
					c.includes('git worktree remove --force "/path/to/wt"'),
				),
			);
		});
	});

	describe("getWorktrees", () => {
		it("handles detached HEAD worktree", async () => {
			git.mockOutputs["worktree list --porcelain"] = [
				"worktree /mock/root",
				"HEAD 1234567",
				"branch refs/heads/main",
				"",
				"worktree /mock/detached",
				"HEAD abcdef1",
				"detached",
				"",
			].join("\n");
			git.mockOutputs["git show"] = "msg|author|date";

			const worktrees = await git.getWorktrees();

			assert.strictEqual(worktrees.length, 2);
			assert.strictEqual(worktrees[1].branch, "(detached)");
			assert.strictEqual(worktrees[1].commit, "abcdef1");
		});

		it("returns empty array for empty output", async () => {
			git.mockOutputs["worktree list --porcelain"] = "";
			const worktrees = await git.getWorktrees();
			assert.strictEqual(worktrees.length, 0);
		});

		it("handles locked worktree without reason", async () => {
			git.mockOutputs["worktree list --porcelain"] = [
				"worktree /mock/root",
				"HEAD 1234567",
				"branch refs/heads/main",
				"",
				"worktree /mock/locked-wt",
				"HEAD aaa1111",
				"branch refs/heads/locked-branch",
				"locked",
				"",
			].join("\n");
			git.mockOutputs["git show"] = "msg|author|date";

			const worktrees = await git.getWorktrees();

			assert.strictEqual(worktrees[1].isLocked, true);
			assert.strictEqual(worktrees[1].lockReason, undefined);
		});

		it("populates commit details from git show", async () => {
			git.mockOutputs["worktree list --porcelain"] = [
				"worktree /mock/root",
				"HEAD abc1234",
				"branch refs/heads/main",
				"",
			].join("\n");
			git.mockOutputs["git show"] = "Fix login bug|Alice|3 days ago";

			const worktrees = await git.getWorktrees();

			assert.strictEqual(worktrees[0].commitMessage, "Fix login bug");
			assert.strictEqual(worktrees[0].commitAuthor, "Alice");
			assert.strictEqual(worktrees[0].commitDate, "3 days ago");
		});

		it("populates enrichment fields (ahead/behind, changedFilesCount, diskSize, lastActivityDate)", async () => {
			git.mockOutputs["worktree list --porcelain"] = [
				"worktree /mock/root",
				"HEAD abc1234",
				"branch refs/heads/main",
				"",
			].join("\n");
			git.mockOutputs["git show"] = "msg|author|date";
			git.mockOutputs["rev-list --left-right --count"] = "2\t3\n";
			git.mockOutputs["status --porcelain"] = " M a.ts\n M b.ts\n";
			git.mockOutputs["log -1 --format=%cI"] = "2026-02-20T10:00:00+00:00\n";
			git.mockOutputs["du -sk"] = "1024\t/mock/root\n";

			const worktrees = await git.getWorktrees();

			assert.strictEqual(worktrees[0].ahead, 3);
			assert.strictEqual(worktrees[0].behind, 2);
			assert.strictEqual(worktrees[0].changedFilesCount, 2);
			assert.strictEqual(worktrees[0].diskSizeBytes, 1024 * 1024);
			assert.ok(worktrees[0].lastActivityDate instanceof Date);
		});
	});

	describe("getBranches", () => {
		beforeEach(() => {
			// Set up a single worktree on "main" so it gets filtered
			git.mockOutputs["worktree list --porcelain"] = [
				"worktree /mock/root",
				"HEAD 1234567",
				"branch refs/heads/main",
				"",
			].join("\n");
			git.mockOutputs["git show"] = "msg|author|date";
		});

		it("returns local branches without existing worktrees", async () => {
			git.mockOutputs["branch --format"] = "main\nfeature-a\nfeature-b\n";

			const branches = await git.getBranches(false);

			// main filtered out (has worktree)
			assert.strictEqual(branches.length, 2);
			assert.strictEqual(branches[0].name, "feature-a");
			assert.strictEqual(branches[0].isRemote, false);
			assert.strictEqual(branches[1].name, "feature-b");
		});

		it("includes remote branches when requested", async () => {
			// Order matters: "branch -r" must be before "branch --format"
			// so the remote command matches the more specific key first
			git.mockOutputs["branch -r"] = "origin/main\norigin/feature-c\n";
			git.mockOutputs["branch --format"] = "main\nfeature-a\n";

			const branches = await git.getBranches(true);

			const local = branches.filter((b) => !b.isRemote);
			const remote = branches.filter((b) => b.isRemote);

			// main filtered (worktree exists), feature-a kept
			assert.strictEqual(local.length, 1);
			assert.strictEqual(local[0].name, "feature-a");

			// origin/main filtered (main has worktree), origin/feature-c kept
			assert.strictEqual(remote.length, 1);
			assert.strictEqual(remote[0].name, "origin/feature-c");
			assert.strictEqual(remote[0].isRemote, true);
		});

		it("excludes remote branches when not requested", async () => {
			git.mockOutputs["branch --format"] = "main\nfeature-a\n";

			const branches = await git.getBranches(false);

			assert.ok(branches.every((b) => !b.isRemote));
			assert.strictEqual(branches.length, 1);
			assert.strictEqual(branches[0].name, "feature-a");
		});
	});

	describe("getMergedBranches", () => {
		it("returns merged branches excluding starred and target", async () => {
			git.mockOutputs["branch --merged"] =
				"* main\n  feature-done\n  hotfix-old\n";

			const merged = await git.getMergedBranches("main");

			assert.deepStrictEqual(merged, ["feature-done", "hotfix-old"]);
		});

		it("filters out the target branch from results", async () => {
			git.mockOutputs["branch --merged"] = "  main\n  feature-done\n";

			const merged = await git.getMergedBranches("main");

			assert.ok(!merged.includes("main"));
			assert.deepStrictEqual(merged, ["feature-done"]);
		});

		it("returns empty array on error", async () => {
			git.mockErrors["branch --merged"] = new Error("not a git repo");

			const merged = await git.getMergedBranches("main");

			assert.deepStrictEqual(merged, []);
		});
	});

	describe("getChangedFiles", () => {
		it("parses changed file list", async () => {
			git.mockOutputs["diff --name-only"] =
				"src/app.ts\nsrc/utils.ts\nREADME.md\n";

			const files = await git.getChangedFiles("abc1234");

			assert.deepStrictEqual(files, [
				"src/app.ts",
				"src/utils.ts",
				"README.md",
			]);
		});

		it("returns empty array for no changes", async () => {
			git.mockOutputs["diff --name-only"] = "";

			const files = await git.getChangedFiles("abc1234");

			assert.deepStrictEqual(files, []);
		});
	});

	describe("diffStat", () => {
		it("returns diff stat output", async () => {
			const statOutput =
				" src/app.ts | 2 +-\n 1 file changed, 1 insertion(+), 1 deletion(-)";
			git.mockOutputs["diff --stat"] = statOutput;

			const result = await git.diffStat("abc1234");

			assert.strictEqual(result, statOutput);
		});
	});

	describe("hasCommits", () => {
		it("returns true when commits exist", async () => {
			git.mockOutputs["git log"] = "abc1234 Initial commit";

			const result = await git.hasCommits();

			assert.strictEqual(result, true);
		});

		it("returns false when no commits", async () => {
			git.mockErrors["git log"] = new Error(
				"fatal: bad default revision 'HEAD'",
			);

			const result = await git.hasCommits();

			assert.strictEqual(result, false);
		});
	});

	describe("stash", () => {
		it("stashes with correct message", async () => {
			await git.stash("Worktree Move: feature/login");

			assert.ok(
				git.cmdLog.some((c) =>
					c.includes('git stash push -m "Worktree Move: feature/login"'),
				),
			);
		});
	});

	describe("pruneWorktrees", () => {
		it("calls git worktree prune", async () => {
			await git.pruneWorktrees();

			assert.ok(git.cmdLog.some((c) => c === "git worktree prune"));
		});
	});

	describe("getRepoRoot", () => {
		it("returns the repo root path", () => {
			assert.strictEqual(git.getRepoRoot(), "/mock/root");
		});
	});

	describe("getAheadBehind", () => {
		it("parses ahead/behind counts", async () => {
			git.mockOutputs["rev-list --left-right --count"] = "3\t5\n";

			const result = await git.getAheadBehind("/mock/feature", "main");

			assert.strictEqual(result.ahead, 5);
			assert.strictEqual(result.behind, 3);
		});

		it("returns zeros on error", async () => {
			git.mockErrors["rev-list --left-right --count"] = new Error("bad ref");

			const result = await git.getAheadBehind("/mock/feature", "main");

			assert.strictEqual(result.ahead, 0);
			assert.strictEqual(result.behind, 0);
		});
	});

	describe("getChangedFilesCount", () => {
		it("returns count of changed files", async () => {
			git.mockOutputs["status --porcelain"] = " M src/a.ts\n M src/b.ts\n?? new.ts\n";

			const count = await git.getChangedFilesCount("/mock/feature");

			assert.strictEqual(count, 3);
		});

		it("returns 0 for clean worktree", async () => {
			git.mockOutputs["status --porcelain"] = "";

			const count = await git.getChangedFilesCount("/mock/feature");

			assert.strictEqual(count, 0);
		});
	});

	describe("getLastCommitDate", () => {
		it("parses commit date", async () => {
			git.mockOutputs["log -1 --format=%cI"] = "2026-02-20T10:30:00+00:00\n";

			const date = await git.getLastCommitDate("/mock/feature");

			assert.ok(date instanceof Date);
			assert.strictEqual(date.toISOString(), "2026-02-20T10:30:00.000Z");
		});

		it("returns null on error", async () => {
			git.mockErrors["log -1 --format=%cI"] = new Error("no commits");

			const date = await git.getLastCommitDate("/mock/feature");

			assert.strictEqual(date, null);
		});
	});

	describe("getDiskSize", () => {
		it("parses du output in kilobytes", async () => {
			git.mockOutputs["du -sk"] = "51200\t/mock/feature\n";

			const bytes = await git.getDiskSize("/mock/feature");

			assert.strictEqual(bytes, 51200 * 1024);
		});

		it("returns 0 on error", async () => {
			git.mockErrors["du -sk"] = new Error("no such dir");

			const bytes = await git.getDiskSize("/mock/feature");

			assert.strictEqual(bytes, 0);
		});
	});
});
