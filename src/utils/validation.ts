export function isValidBranchName(name: string): boolean {
	if (!name || !name.trim()) return false;

	// Allowlist: only alphanumeric, hyphens, underscores, dots, and forward slashes
	if (!/^[a-zA-Z0-9._\/-]+$/.test(name)) return false;

	// Git-specific invalid patterns
	if (name.startsWith(".")) return false;
	if (name.endsWith(".lock")) return false;
	if (name.includes("..")) return false;
	if (name.includes("~")) return false;
	if (name.includes("^")) return false;
	if (name.includes(":")) return false;

	return true;
}
