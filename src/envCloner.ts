import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface EnvCloneConfig {
	copy: string[];
	symlink: string[];
}

export async function loadEnvCloneConfig(
	repoRoot: string,
	configFileName: string,
): Promise<EnvCloneConfig | null> {
	try {
		const configPath = path.join(repoRoot, configFileName);
		const content = await fs.readFile(configPath, "utf8");
		return JSON.parse(content) as EnvCloneConfig;
	} catch {
		return null;
	}
}

export async function cloneEnvironment(
	sourceDir: string,
	targetDir: string,
	config: EnvCloneConfig,
): Promise<void> {
	for (const file of config.copy) {
		const src = path.join(sourceDir, file);
		const dest = path.join(targetDir, file);
		try {
			await fs.access(src);
			await fs.mkdir(path.dirname(dest), { recursive: true });
			await fs.copyFile(src, dest);
		} catch {
			// Source doesn't exist, skip silently
		}
	}

	for (const dir of config.symlink) {
		const src = path.join(sourceDir, dir);
		const dest = path.join(targetDir, dir);
		try {
			await fs.access(src);
			await fs.symlink(src, dest);
		} catch {
			// Source doesn't exist, skip silently
		}
	}
}
