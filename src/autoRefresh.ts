import * as vscode from "vscode";

export class AutoRefreshManager implements vscode.Disposable {
	private readonly disposables: vscode.Disposable[] = [];
	private debounceTimer: ReturnType<typeof setTimeout> | undefined;
	private pollingTimer: ReturnType<typeof setInterval> | undefined;

	constructor(private readonly onRefresh: () => void) {
		this.setupFileSystemWatchers();
		this.setupFocusListener();
		this.setupPolling();

		// Reconfigure polling when settings change
		this.disposables.push(
			vscode.workspace.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration("worktreeManager.autoRefreshInterval")) {
					this.clearPolling();
					this.setupPolling();
				}
			}),
		);
	}

	private setupFileSystemWatchers(): void {
		// Watch worktree metadata changes (add/remove worktrees)
		const worktreeWatcher = vscode.workspace.createFileSystemWatcher(
			"**/.git/worktrees/**",
		);
		worktreeWatcher.onDidCreate(() => this.debouncedRefresh());
		worktreeWatcher.onDidChange(() => this.debouncedRefresh());
		worktreeWatcher.onDidDelete(() => this.debouncedRefresh());
		this.disposables.push(worktreeWatcher);

		// Watch ref changes (branch create/delete/rename)
		const refsWatcher =
			vscode.workspace.createFileSystemWatcher("**/.git/refs/**");
		refsWatcher.onDidCreate(() => this.debouncedRefresh());
		refsWatcher.onDidChange(() => this.debouncedRefresh());
		refsWatcher.onDidDelete(() => this.debouncedRefresh());
		this.disposables.push(refsWatcher);

		// Watch HEAD changes (branch checkout)
		const headWatcher =
			vscode.workspace.createFileSystemWatcher("**/.git/HEAD");
		headWatcher.onDidChange(() => this.debouncedRefresh());
		this.disposables.push(headWatcher);
	}

	private setupFocusListener(): void {
		this.disposables.push(
			vscode.window.onDidChangeWindowState((state) => {
				if (state.focused) {
					this.debouncedRefresh();
				}
			}),
		);
	}

	private setupPolling(): void {
		const config = vscode.workspace.getConfiguration("worktreeManager");
		const intervalSeconds = config.get<number>("autoRefreshInterval", 30);

		if (intervalSeconds > 0) {
			this.pollingTimer = setInterval(
				() => this.onRefresh(),
				intervalSeconds * 1000,
			);
		}
	}

	private clearPolling(): void {
		if (this.pollingTimer !== undefined) {
			clearInterval(this.pollingTimer);
			this.pollingTimer = undefined;
		}
	}

	private debouncedRefresh(): void {
		if (this.debounceTimer !== undefined) {
			clearTimeout(this.debounceTimer);
		}
		this.debounceTimer = setTimeout(() => {
			this.debounceTimer = undefined;
			this.onRefresh();
		}, 300);
	}

	dispose(): void {
		if (this.debounceTimer !== undefined) {
			clearTimeout(this.debounceTimer);
		}
		this.clearPolling();
		for (const d of this.disposables) {
			d.dispose();
		}
	}
}
