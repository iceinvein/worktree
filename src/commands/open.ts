import * as vscode from "vscode";
import type { WorktreeItem } from "../worktreeProvider";

export type OpenBehavior = "newWindow" | "sameWindow" | "ask";

export async function openWorktree(item: WorktreeItem): Promise<void> {
	const config = vscode.workspace.getConfiguration("worktreeManager");
	const behavior = config.get<OpenBehavior>("openBehavior", "ask");

	let openInNew: boolean;

	if (behavior === "ask") {
		const choice = await vscode.window.showQuickPick(
			[
				{ label: "New Window", value: true },
				{ label: "Same Window", value: false },
			],
			{ placeHolder: "How do you want to open this worktree?" },
		);
		if (!choice) return;
		openInNew = choice.value;
	} else {
		openInNew = behavior === "newWindow";
	}

	const uri = vscode.Uri.file(item.worktree.path);
	await vscode.commands.executeCommand("vscode.openFolder", uri, {
		forceNewWindow: openInNew,
	});
}
