import * as assert from "node:assert";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { cloneEnvironment, loadEnvCloneConfig } from "../../envCloner";

describe("envCloner", () => {
	let tmpDir: string;
	let sourceDir: string;
	let targetDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "envcloner-"));
		sourceDir = path.join(tmpDir, "source");
		targetDir = path.join(tmpDir, "target");
		await fs.mkdir(sourceDir, { recursive: true });
		await fs.mkdir(targetDir, { recursive: true });
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	describe("loadEnvCloneConfig", () => {
		it("loads config from file", async () => {
			const configPath = path.join(sourceDir, ".worktree-env.json");
			await fs.writeFile(
				configPath,
				JSON.stringify({ copy: [".env"], symlink: ["node_modules"] }),
			);

			const config = await loadEnvCloneConfig(sourceDir, ".worktree-env.json");

			assert.deepStrictEqual(config, {
				copy: [".env"],
				symlink: ["node_modules"],
			});
		});

		it("returns null when config file does not exist", async () => {
			const config = await loadEnvCloneConfig(sourceDir, ".worktree-env.json");

			assert.strictEqual(config, null);
		});
	});

	describe("cloneEnvironment", () => {
		it("copies files listed in copy array", async () => {
			await fs.writeFile(path.join(sourceDir, ".env"), "SECRET=abc");
			const config = { copy: [".env"], symlink: [] };

			await cloneEnvironment(sourceDir, targetDir, config);

			const content = await fs.readFile(path.join(targetDir, ".env"), "utf8");
			assert.strictEqual(content, "SECRET=abc");
		});

		it("creates symlinks for symlink array", async () => {
			await fs.mkdir(path.join(sourceDir, "node_modules"), {
				recursive: true,
			});
			const config = { copy: [], symlink: ["node_modules"] };

			await cloneEnvironment(sourceDir, targetDir, config);

			const stat = await fs.lstat(path.join(targetDir, "node_modules"));
			assert.ok(stat.isSymbolicLink());
		});

		it("silently skips missing source files", async () => {
			const config = { copy: [".env.local"], symlink: [] };

			await cloneEnvironment(sourceDir, targetDir, config);
		});

		it("silently skips missing symlink targets", async () => {
			const config = { copy: [], symlink: ["nonexistent"] };

			await cloneEnvironment(sourceDir, targetDir, config);
		});
	});
});
