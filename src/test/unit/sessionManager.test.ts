import * as assert from "node:assert";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	loadSession,
	type SessionData,
	saveSessionToFile,
} from "../../sessionManager";

describe("sessionManager", () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "session-"));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	describe("saveSessionToFile", () => {
		it("writes session data to .vscode/worktree-session.json", async () => {
			const session: SessionData = {
				timestamp: "2026-02-25T10:30:00.000Z",
				editors: [
					{
						relativePath: "src/app.ts",
						viewColumn: 1,
						cursorLine: 10,
						cursorColumn: 5,
						isActive: true,
					},
				],
			};

			await saveSessionToFile(tmpDir, session);

			const filePath = path.join(tmpDir, ".vscode", "worktree-session.json");
			const content = JSON.parse(await fs.readFile(filePath, "utf8"));
			assert.strictEqual(content.editors.length, 1);
			assert.strictEqual(content.editors[0].relativePath, "src/app.ts");
		});
	});

	describe("loadSession", () => {
		it("returns session data when file exists", async () => {
			const session: SessionData = {
				timestamp: "2026-02-25T10:30:00.000Z",
				editors: [
					{
						relativePath: "src/app.ts",
						viewColumn: 1,
						cursorLine: 10,
						cursorColumn: 5,
						isActive: true,
					},
				],
			};

			const vscodeDir = path.join(tmpDir, ".vscode");
			await fs.mkdir(vscodeDir, { recursive: true });
			await fs.writeFile(
				path.join(vscodeDir, "worktree-session.json"),
				JSON.stringify(session),
			);

			const loaded = await loadSession(tmpDir);

			assert.ok(loaded !== null);
			assert.strictEqual(loaded?.editors.length, 1);
			assert.strictEqual(loaded?.editors[0].cursorLine, 10);
		});

		it("returns null when file does not exist", async () => {
			const loaded = await loadSession(tmpDir);

			assert.strictEqual(loaded, null);
		});

		it("returns null for invalid JSON", async () => {
			const vscodeDir = path.join(tmpDir, ".vscode");
			await fs.mkdir(vscodeDir, { recursive: true });
			await fs.writeFile(
				path.join(vscodeDir, "worktree-session.json"),
				"not json",
			);

			const loaded = await loadSession(tmpDir);

			assert.strictEqual(loaded, null);
		});
	});
});
