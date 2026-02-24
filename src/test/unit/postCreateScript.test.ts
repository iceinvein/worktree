import * as assert from "node:assert";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { findScript } from "../../postCreateScript";

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
});
