# Worktree Manager for VS Code

Visual Git worktree management for VS Code. Check out branches into separate folders, work on multiple features at the same time, and keep your main repository clean.

## Why Use Worktrees?

Stop stashing and popping just to review a PR or fix a bug. Git worktrees let you check out multiple branches at once in separate directories.

- Zero context switching overhead
- Clean main environment
- Parallel builds and tests

## Features

### Quick Switcher

Jump between active worktrees instantly.

- Click the status bar item to see a list of open worktrees.
- Run `Worktree Manager: Switch Worktree` from the command palette.

### Bring Changes With Me

Started working on `main` but realized the change needs its own branch? Create a new worktree and automatically move your uncommitted changes to the new isolated environment. The extension handles the `stash` and `pop` for you.

### Visual Theme Integration

- **Color-coded windows** -- New worktrees get a unique, auto-generated title bar color so you can tell your windows apart at a glance.
- **Rich status** -- See which worktrees are dirty, locked, or active.

### Smart Cleanup

The extension detects worktrees whose branches have been merged into `main`/`master` and offers to bulk-delete them. You can also prune stale worktree entries that point to directories that no longer exist.

### Diff View

Right-click any worktree to see a file-level diff between it and your current workspace. Added and deleted files are handled with an empty-document placeholder so the diff is always readable.

### Lock and Unlock

Protect critical worktrees from accidental removal. Locked worktrees show a distinct icon and are excluded from bulk cleanup.

### Post-Create Scripts

Run a setup script automatically after creating a worktree. The extension looks for the path configured in `worktreeManager.postCreateScript`, falling back to `.worktree-setup.sh` at the repository root. Useful for installing dependencies or copying environment files into new worktrees.

### Auto-Refresh

Worktree and branch views stay up to date automatically via a filesystem watcher, a window-focus listener, and a configurable polling interval.

## Usage

1. Open a folder that is part of a Git repository.
2. Open the **Source Control** side panel.
3. Use the **Worktrees** and **Available Branches** views to manage your environments.

### Commands

| Command | Description |
| :--- | :--- |
| `Worktree Manager: Create Worktree` | Create a new worktree from a local or remote branch. |
| `Worktree Manager: Switch Worktree` | Pick a worktree from a quick-pick list and open it. |
| `Worktree Manager: Open Worktree` | Open a worktree in the current or a new window. |
| `Worktree Manager: Open in New Window` | Open a worktree in a new VS Code window. |
| `Worktree Manager: Diff with HEAD` | File-level diff between the current workspace and a target worktree. |
| `Worktree Manager: Remove Worktree` | Delete a worktree and its directory. |
| `Worktree Manager: Prune Stale Worktrees` | Remove worktree entries whose directories no longer exist. |
| `Worktree Manager: Clean Merged Worktrees` | Bulk-delete worktrees whose branches are merged into main/master. |
| `Worktree Manager: Lock Worktree` | Lock a worktree to prevent accidental removal. |
| `Worktree Manager: Unlock Worktree` | Unlock a previously locked worktree. |
| `Worktree Manager: Refresh` | Manually refresh both tree views. |

## Configuration

| Setting | Default | Description |
| :--- | :--- | :--- |
| `worktreeManager.defaultPath` | `../{branch}` | Path pattern for new worktrees relative to the repo. Supports `{branch}` and `{repo}` variables. |
| `worktreeManager.openBehavior` | `ask` | `newWindow`, `sameWindow`, or `ask` when opening a worktree. |
| `worktreeManager.showRemoteBranches` | `true` | Show remote branches in the available branches list. |
| `worktreeManager.postCreateScript` | `""` | Path to a script (relative to repo root) to run after creating a worktree. Falls back to `.worktree-setup.sh` if not set. |
| `worktreeManager.autoRefreshInterval` | `30` | Polling interval in seconds for auto-refreshing views. Set to `0` to disable polling (filesystem watcher and focus listener remain active). |

## License

MIT
