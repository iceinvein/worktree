import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";

export interface EditorState {
	relativePath: string;
	viewColumn: number;
	cursorLine: number;
	cursorColumn: number;
	isActive: boolean;
}

export interface SessionData {
	timestamp: string;
	editors: EditorState[];
}

const SESSION_FILE = "worktree-session.json";

export async function saveSessionToFile(
	worktreePath: string,
	session: SessionData,
): Promise<void> {
	const vscodeDir = path.join(worktreePath, ".vscode");
	await fs.mkdir(vscodeDir, { recursive: true });
	const filePath = path.join(vscodeDir, SESSION_FILE);
	await fs.writeFile(filePath, JSON.stringify(session, null, "\t"));
}

export async function loadSession(
	worktreePath: string,
): Promise<SessionData | null> {
	try {
		const filePath = path.join(worktreePath, ".vscode", SESSION_FILE);
		const content = await fs.readFile(filePath, "utf8");
		return JSON.parse(content) as SessionData;
	} catch {
		return null;
	}
}

export function captureCurrentSession(
	workspaceRoot: string,
): SessionData | null {
	const editors = vscode.window.visibleTextEditors;
	if (editors.length === 0) return null;

	const activeEditor = vscode.window.activeTextEditor;

	const editorStates: EditorState[] = editors
		.filter((e) => e.document.uri.scheme === "file")
		.map((e) => {
			const relativePath = path.relative(workspaceRoot, e.document.uri.fsPath);
			return {
				relativePath,
				viewColumn: e.viewColumn ?? 1,
				cursorLine: e.selection.active.line,
				cursorColumn: e.selection.active.character,
				isActive: e === activeEditor,
			};
		});

	if (editorStates.length === 0) return null;

	return {
		timestamp: new Date().toISOString(),
		editors: editorStates,
	};
}

export async function restoreSession(
	worktreePath: string,
	session: SessionData,
): Promise<void> {
	let activeEditorState: EditorState | undefined;

	for (const editor of session.editors) {
		const filePath = path.join(worktreePath, editor.relativePath);
		try {
			const uri = vscode.Uri.file(filePath);
			const doc = await vscode.workspace.openTextDocument(uri);
			const shown = await vscode.window.showTextDocument(doc, {
				viewColumn: editor.viewColumn as vscode.ViewColumn,
				preview: false,
				preserveFocus: true,
			});

			const position = new vscode.Position(
				editor.cursorLine,
				editor.cursorColumn,
			);
			shown.selection = new vscode.Selection(position, position);
			shown.revealRange(new vscode.Range(position, position));

			if (editor.isActive) {
				activeEditorState = editor;
			}
		} catch {
			// File may have been deleted — skip
		}
	}

	if (activeEditorState) {
		const activePath = path.join(worktreePath, activeEditorState.relativePath);
		try {
			const uri = vscode.Uri.file(activePath);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc, {
				viewColumn: activeEditorState.viewColumn as vscode.ViewColumn,
				preview: false,
				preserveFocus: false,
			});
		} catch {
			// Ignore
		}
	}
}
