import type * as vscode from "vscode";

export class EmptyDocumentProvider
	implements vscode.TextDocumentContentProvider
{
	provideTextDocumentContent(_uri: vscode.Uri): string {
		return "";
	}
}
