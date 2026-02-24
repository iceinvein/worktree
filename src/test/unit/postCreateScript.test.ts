import * as assert from "node:assert";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { findScript, runPostCreateScript } from "../../postCreateScript";

describe("postCreateScript", () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wt-test-"));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	describe("findScript", () => {
		it("returns undefined when no script exists", async () => {
			const result = await findScript(tmpDir, "");
			assert.strictEqual(result, undefined);
		});

		it("finds .worktree-setup.sh in repo root", async () => {
			const scriptPath = path.join(tmpDir, ".worktree-setup.sh");
			await fs.writeFile(scriptPath, "#!/bin/bash\necho hello");
			await fs.chmod(scriptPath, 0o755);

			const result = await findScript(tmpDir, "");
			assert.strictEqual(result, scriptPath);
		});

		it("prefers configured script over default", async () => {
			// Create both files
			const defaultScript = path.join(tmpDir, ".worktree-setup.sh");
			await fs.writeFile(defaultScript, "#!/bin/bash\necho default");
			await fs.chmod(defaultScript, 0o755);

			const customScript = path.join(tmpDir, "scripts", "setup.sh");
			await fs.mkdir(path.join(tmpDir, "scripts"));
			await fs.writeFile(customScript, "#!/bin/bash\necho custom");
			await fs.chmod(customScript, 0o755);

			const result = await findScript(tmpDir, "scripts/setup.sh");
			assert.strictEqual(result, customScript);
		});

		it("returns undefined when configured script does not exist", async () => {
			const result = await findScript(tmpDir, "nonexistent.sh");
			assert.strictEqual(result, undefined);
		});
	});

	describe("runPostCreateScript", () => {
		it("runs script with correct args and env", async () => {
			// Script that writes its args and env to a file for verification
			const scriptPath = path.join(tmpDir, "setup.sh");
			const outputPath = path.join(tmpDir, "output.txt");
			await fs.writeFile(
				scriptPath,
				`#!/bin/bash\necho "$1|$2|$WORKTREE_PATH|$WORKTREE_BRANCH|$REPO_ROOT" > "${outputPath}"`,
			);
			await fs.chmod(scriptPath, 0o755);

			const result = await runPostCreateScript(
				scriptPath,
				tmpDir,
				"/new/worktree",
				"feature/cool",
			);

			assert.strictEqual(result.success, true);

			const output = await fs.readFile(outputPath, "utf8");
			const parts = output.trim().split("|");
			assert.strictEqual(parts[0], "/new/worktree");
			assert.strictEqual(parts[1], "feature/cool");
			assert.strictEqual(parts[2], "/new/worktree");
			assert.strictEqual(parts[3], "feature/cool");
			assert.strictEqual(parts[4], tmpDir);
		});

		it("returns failure on non-zero exit", async () => {
			const scriptPath = path.join(tmpDir, "fail.sh");
			await fs.writeFile(scriptPath, "#!/bin/bash\nexit 1");
			await fs.chmod(scriptPath, 0o755);

			const result = await runPostCreateScript(
				scriptPath,
				tmpDir,
				"/new/worktree",
				"main",
			);

			assert.strictEqual(result.success, false);
		});

		it("returns failure on timeout", async () => {
			const scriptPath = path.join(tmpDir, "slow.sh");
			await fs.writeFile(scriptPath, "#!/bin/bash\nsleep 60");
			await fs.chmod(scriptPath, 0o755);

			const result = await runPostCreateScript(
				scriptPath,
				tmpDir,
				"/new/worktree",
				"main",
				500, // 500ms timeout for test speed
			);

			assert.strictEqual(result.success, false);
			assert.ok(
				result.error?.includes("timed out") ||
					result.error?.includes("SIGTERM"),
			);
		});
	});
});
