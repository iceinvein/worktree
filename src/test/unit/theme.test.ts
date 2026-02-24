import * as assert from "node:assert";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { applyThemeColor } from "../../utils/theme";

describe("theme", () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wt-theme-"));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	describe("applyThemeColor", () => {
		it("creates .vscode/settings.json with color customizations", async () => {
			await applyThemeColor(tmpDir, "feature-login");

			const settingsPath = path.join(tmpDir, ".vscode", "settings.json");
			const content = JSON.parse(await fs.readFile(settingsPath, "utf8"));

			const colors = content["workbench.colorCustomizations"];
			assert.ok(colors, "should have colorCustomizations");
			assert.ok(colors["titleBar.activeBackground"]);
			assert.strictEqual(colors["titleBar.activeForeground"], "#ffffff");
			assert.ok(colors["activityBar.background"]);
			assert.strictEqual(colors["activityBar.foreground"], "#ffffff");
		});

		it("generates valid hex colors", async () => {
			await applyThemeColor(tmpDir, "main");

			const settingsPath = path.join(tmpDir, ".vscode", "settings.json");
			const content = JSON.parse(await fs.readFile(settingsPath, "utf8"));
			const color =
				content["workbench.colorCustomizations"]["titleBar.activeBackground"];

			assert.match(color, /^#[0-9a-f]{6}$/i);
		});

		it("produces deterministic colors for same branch name", async () => {
			await applyThemeColor(tmpDir, "feature-auth");
			const settings1 = JSON.parse(
				await fs.readFile(
					path.join(tmpDir, ".vscode", "settings.json"),
					"utf8",
				),
			);

			// Apply again — same branch, same directory
			await applyThemeColor(tmpDir, "feature-auth");
			const settings2 = JSON.parse(
				await fs.readFile(
					path.join(tmpDir, ".vscode", "settings.json"),
					"utf8",
				),
			);

			assert.strictEqual(
				settings1["workbench.colorCustomizations"]["titleBar.activeBackground"],
				settings2["workbench.colorCustomizations"]["titleBar.activeBackground"],
			);
		});

		it("produces different colors for different branch names", async () => {
			const dir1 = path.join(tmpDir, "wt1");
			const dir2 = path.join(tmpDir, "wt2");

			await applyThemeColor(dir1, "feature-auth");
			await applyThemeColor(dir2, "feature-payments");

			const s1 = JSON.parse(
				await fs.readFile(path.join(dir1, ".vscode", "settings.json"), "utf8"),
			);
			const s2 = JSON.parse(
				await fs.readFile(path.join(dir2, ".vscode", "settings.json"), "utf8"),
			);

			assert.notStrictEqual(
				s1["workbench.colorCustomizations"]["titleBar.activeBackground"],
				s2["workbench.colorCustomizations"]["titleBar.activeBackground"],
			);
		});

		it("merges with existing settings without overwriting", async () => {
			const vscodeDir = path.join(tmpDir, ".vscode");
			await fs.mkdir(vscodeDir, { recursive: true });
			await fs.writeFile(
				path.join(vscodeDir, "settings.json"),
				JSON.stringify({ "editor.fontSize": 14 }),
			);

			await applyThemeColor(tmpDir, "develop");

			const content = JSON.parse(
				await fs.readFile(path.join(vscodeDir, "settings.json"), "utf8"),
			);
			assert.strictEqual(content["editor.fontSize"], 14);
			assert.ok(
				content["workbench.colorCustomizations"]["titleBar.activeBackground"],
			);
		});

		it("preserves existing color customizations", async () => {
			const vscodeDir = path.join(tmpDir, ".vscode");
			await fs.mkdir(vscodeDir, { recursive: true });
			await fs.writeFile(
				path.join(vscodeDir, "settings.json"),
				JSON.stringify({
					"workbench.colorCustomizations": {
						"statusBar.background": "#ff0000",
					},
				}),
			);

			await applyThemeColor(tmpDir, "develop");

			const content = JSON.parse(
				await fs.readFile(path.join(vscodeDir, "settings.json"), "utf8"),
			);
			const colors = content["workbench.colorCustomizations"];
			assert.strictEqual(colors["statusBar.background"], "#ff0000");
			assert.ok(colors["titleBar.activeBackground"]);
		});
	});
});
