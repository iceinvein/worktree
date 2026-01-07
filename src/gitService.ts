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

		// Parallelize verify status and dirty check
		const results = await Promise.all(
			worktrees.map(async (wt) => {
				if (!wt.path) return null;

				const isCurrent = wt.path === this.repoRoot;
				const isDirty = await this.isWorktreeDirty(wt.path);

				// Fetch rich details
				let commitMessage: string | undefined;
				let commitAuthor: string | undefined;
				let commitDate: string | undefined;
				if (wt.commit) {
					try {
						const details = await this.exec(
							`git show --no-patch --format="%s|%an|%cr" ${wt.commit}`,
						);
						const [msg, author, date] = details.trim().split("|");
						commitMessage = msg;
						commitAuthor = author;
						commitDate = date;
					} catch {
						// Ignore errors fetching details
					}
				}

				return {
					path: wt.path,
					branch: wt.branch ?? "(detached)",
					commit: wt.commit ?? "",
					isCurrent,
					isDirty,
					isLocked: !!wt.isLocked,
					lockReason: wt.lockReason,
					commitMessage,
					commitAuthor,
					commitDate,
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

		if (isRemote) {
			await this.exec(
				`git worktree add -b ${localBranch} "${targetPath}" ${branch}`,
			);
		} else {
			await this.exec(`git worktree add "${targetPath}" ${branch}`);
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

	private async isWorktreeDirty(worktreePath: string): Promise<boolean> {
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

	protected async exec(cmd: string): Promise<string> {
		const { stdout } = await execAsync(cmd, {
			cwd: this.repoRoot,
			encoding: "utf8",
		});
		return stdout;
	}
}
