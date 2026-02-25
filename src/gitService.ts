import { exec } from "node:child_process";
import * as util from "node:util";

const execAsync = util.promisify(exec);

export interface Worktree {
	path: string;
	branch: string;
	commit: string;
	isCurrent: boolean;
	isDirty: boolean;
	isLocked: boolean;
	lockReason?: string;
	commitMessage?: string;
	commitAuthor?: string;
	commitDate?: string;
	// Dashboard enrichment fields
	ahead?: number;
	behind?: number;
	changedFilesCount?: number;
	diskSizeBytes?: number;
	lastActivityDate?: Date | null;
}

export interface Branch {
	name: string;
	isRemote: boolean;
	hasWorktree: boolean;
}

export class GitService {
	constructor(private repoRoot: string) {}

	async getWorktrees(): Promise<Worktree[]> {
		const output = await this.exec("git worktree list --porcelain");
		const worktrees: Partial<Worktree>[] = [];
		let current: Partial<Worktree> = {};

		const lines = output.split("\n");
		for (const line of lines) {
			if (line.startsWith("worktree ")) {
				current.path = line.slice(9);
			} else if (line.startsWith("HEAD ")) {
				current.commit = line.slice(5, 12);
			} else if (line.startsWith("branch ")) {
				current.branch = line.slice(7).replace("refs/heads/", "");
			} else if (line.startsWith("locked")) {
				current.isLocked = true;
				const reason = line.slice(7).trim();
				if (reason) current.lockReason = reason;
			} else if (line === "") {
				if (current.path) {
					// Initialize with defaults before pushing
					worktrees.push(current);
				}
				current = {};
			}
		}

		// Parallelize all enrichment data fetches
		const results = await Promise.all(
			worktrees.map(async (wt) => {
				if (!wt.path) return null;

				const isCurrent = wt.path === this.repoRoot;

				const [
					isDirty,
					commitDetails,
					aheadBehind,
					changedFilesCount,
					lastActivityDate,
					diskSizeBytes,
				] = await Promise.all([
					this.isWorktreeDirty(wt.path),
					wt.commit
						? this.exec(
								`git show --no-patch --format="%s|%an|%cr" ${wt.commit}`,
							)
								.then((details) => {
									const [msg, author, date] = details.trim().split("|");
									return {
										commitMessage: msg,
										commitAuthor: author,
										commitDate: date,
									};
								})
								.catch(() => ({
									commitMessage: undefined,
									commitAuthor: undefined,
									commitDate: undefined,
								}))
						: Promise.resolve({
								commitMessage: undefined,
								commitAuthor: undefined,
								commitDate: undefined,
							}),
					this.getAheadBehind(wt.path, "main"),
					this.getChangedFilesCount(wt.path),
					this.getLastCommitDate(wt.path),
					this.getDiskSize(wt.path),
				]);

				return {
					path: wt.path,
					branch: wt.branch ?? "(detached)",
					commit: wt.commit ?? "",
					isCurrent,
					isDirty,
					isLocked: !!wt.isLocked,
					lockReason: wt.lockReason,
					...commitDetails,
					ahead: aheadBehind.ahead,
					behind: aheadBehind.behind,
					changedFilesCount,
					diskSizeBytes,
					lastActivityDate,
				} as Worktree;
			}),
		);

		return results.filter((w): w is Worktree => w !== null);
	}

	async getBranches(includeRemote: boolean): Promise<Branch[]> {
		const worktrees = await this.getWorktrees();
		const usedBranches = new Set(worktrees.map((w) => w.branch));

		const localOutput = await this.exec(
			"git branch --format='%(refname:short)'",
		);
		const branches: Branch[] = localOutput
			.split("\n")
			.filter(Boolean)
			.map((name) => ({
				name: name.replace(/'/g, ""),
				isRemote: false,
				hasWorktree: usedBranches.has(name.replace(/'/g, "")),
			}));

		if (includeRemote) {
			try {
				const remoteOutput = await this.exec(
					"git branch -r --format='%(refname:short)'",
				);
				remoteOutput
					.split("\n")
					.filter((b) => b && !b.includes("HEAD"))
					.forEach((name) => {
						const clean = name.replace(/'/g, "");
						branches.push({
							name: clean,
							isRemote: true,
							hasWorktree: usedBranches.has(clean.replace(/^origin\//, "")),
						});
					});
			} catch (e) {
				// Ignore if no remotes or failure
				console.warn("Failed to fetch remote branches", e);
			}
		}
		return branches.filter((b) => !b.hasWorktree);
	}

	async createWorktree(branch: string, targetPath: string): Promise<void> {
		const isRemote = branch.startsWith("origin/");
		const localBranch = branch.replace(/^origin\//, "");

		// Check if branch exists
		let branchExists = false;
		try {
			await this.exec(`git rev-parse --verify ${branch}`);
			branchExists = true;
		} catch {
			// branch does not exist
		}

		if (isRemote) {
			// Existing remote branch -> local branch
			await this.exec(
				`git worktree add -b ${localBranch} "${targetPath}" ${branch}`,
			);
		} else if (branchExists) {
			// Existing local branch
			await this.exec(`git worktree add "${targetPath}" ${branch}`);
		} else {
			// New local branch
			// "git worktree add -b <new-branch> <path> <base>"
			// Explicitly base on HEAD to ensure shared history
			await this.exec(`git worktree add -b ${branch} "${targetPath}" HEAD`);
		}
	}

	async removeWorktree(worktreePath: string, force = false): Promise<void> {
		const flag = force ? "--force" : "";
		await this.exec(`git worktree remove ${flag} "${worktreePath}"`);
	}

	async lockWorktree(worktreePath: string): Promise<void> {
		await this.exec(`git worktree lock "${worktreePath}"`);
	}

	async unlockWorktree(worktreePath: string): Promise<void> {
		await this.exec(`git worktree unlock "${worktreePath}"`);
	}

	async pruneWorktrees(): Promise<void> {
		await this.exec("git worktree prune");
	}

	async stash(message: string): Promise<void> {
		await this.exec(`git stash push -m "${message}"`);
	}

	async stashPop(cwd: string): Promise<void> {
		await execAsync("git stash pop", {
			cwd,
			encoding: "utf8",
		});
	}

	async getMergedBranches(targetBranch: string): Promise<string[]> {
		try {
			// Get branches merged into targetBranch
			const output = await this.exec(`git branch --merged ${targetBranch}`);
			return output
				.split("\n")
				.map((b) => b.trim())
				.filter((b) => b && !b.startsWith("*") && b !== targetBranch);
		} catch (e) {
			console.warn("Failed to get merged branches", e);
			return [];
		}
	}

	public async isWorktreeDirty(worktreePath: string): Promise<boolean> {
		try {
			const status = await execAsync("git status --porcelain", {
				cwd: worktreePath,
				encoding: "utf8",
			});
			return status.stdout.trim().length > 0;
		} catch {
			return false;
		}
	}

	async diffStat(target: string): Promise<string> {
		return this.exec(`git diff --stat HEAD..${target}`);
	}

	async hasCommits(): Promise<boolean> {
		try {
			await this.exec("git log -n 1 --oneline");
			return true;
		} catch {
			return false;
		}
	}

	async getHeadCommit(cwd: string): Promise<string> {
		try {
			const output = await execAsync("git rev-parse --short HEAD", {
				cwd,
				encoding: "utf8",
			});
			return output.stdout.trim();
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			throw new Error(`git rev-parse failed in ${cwd}: ${message}`);
		}
	}

	async getChangedFiles(target: string): Promise<string[]> {
		// diff --name-only HEAD..target
		const output = await this.exec(`git diff --name-only HEAD..${target}`);
		return output
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean);
	}

	async getAheadBehind(
		worktreePath: string,
		baseBranch: string,
	): Promise<{ ahead: number; behind: number }> {
		try {
			const output = await this.exec(
				`git -C "${worktreePath}" rev-list --left-right --count ${baseBranch}...HEAD`,
			);
			const [behind, ahead] = output.trim().split("\t").map(Number);
			return { ahead: ahead || 0, behind: behind || 0 };
		} catch {
			return { ahead: 0, behind: 0 };
		}
	}

	async getChangedFilesCount(worktreePath: string): Promise<number> {
		try {
			const output = await this.exec(
				`git -C "${worktreePath}" status --porcelain`,
			);
			const lines = output.trim().split("\n").filter(Boolean);
			return lines.length;
		} catch {
			return 0;
		}
	}

	async getLastCommitDate(worktreePath: string): Promise<Date | null> {
		try {
			const output = await this.exec(
				`git -C "${worktreePath}" log -1 --format=%cI`,
			);
			return new Date(output.trim());
		} catch {
			return null;
		}
	}

	async getDiskSize(worktreePath: string): Promise<number> {
		try {
			const output = await this.exec(`du -sk "${worktreePath}"`);
			const kb = Number.parseInt(output.trim().split("\t")[0], 10);
			return kb * 1024;
		} catch {
			return 0;
		}
	}

	async rebaseWorktree(
		worktreePath: string,
		baseBranch: string,
	): Promise<void> {
		await this.exec(`git -C "${worktreePath}" rebase ${baseBranch}`);
	}

	async mergeIntoWorktree(
		worktreePath: string,
		baseBranch: string,
	): Promise<void> {
		await this.exec(`git -C "${worktreePath}" merge ${baseBranch}`);
	}

	getRepoRoot(): string {
		return this.repoRoot;
	}

	protected async exec(cmd: string): Promise<string> {
		const { stdout } = await execAsync(cmd, {
			cwd: this.repoRoot,
			encoding: "utf8",
		});
		return stdout;
	}
}
