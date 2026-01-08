import * as fs from "node:fs/promises";
import * as path from "node:path";

export async function applyThemeColor(
	worktreePath: string,
	branchName: string,
) {
	try {
		const vscodeDir = path.join(worktreePath, ".vscode");
		const settingsPath = path.join(vscodeDir, "settings.json");

		// Ensure .vscode exists
		await fs.mkdir(vscodeDir, { recursive: true });

		// Generate color
		const color = stringToColor(branchName);

		// Read existing settings or defaults
		let settings: any = {};
		try {
			const content = await fs.readFile(settingsPath, "utf8");
			settings = JSON.parse(content);
		} catch {
			// New file
		}

		// Apply color customizations
		settings["workbench.colorCustomizations"] = {
			...settings["workbench.colorCustomizations"],
			"titleBar.activeBackground": color,
			"titleBar.activeForeground": "#ffffff",
			"titleBar.inactiveBackground": color,
			"titleBar.inactiveForeground": "#eeeeeecc",
			// Also color the activity bar for visibility
			"activityBar.background": color,
			"activityBar.foreground": "#ffffff",
		};

		await fs.writeFile(settingsPath, JSON.stringify(settings, null, 4));
	} catch (e) {
		console.error("Failed to apply theme color", e);
	}
}

function stringToColor(str: string) {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	let color = "#";
	for (let i = 0; i < 3; i++) {
		const value = (hash >> (i * 8)) & 0xff;
		// Make sure it is dark enough for white text? Or just random.
		// Let's try to keep it somewhat readable.
		color += `00${value.toString(16)}`.substr(-2);
	}
	return color;
}
