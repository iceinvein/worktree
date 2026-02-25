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

### Dashboard Enrichment

Each worktree in the sidebar shows at-a-glance status:

- **Ahead/behind counts** -- How many commits ahead or behind the base branch (configurable via `worktreeManager.baseBranch`).
- **Changed files count** -- Number of uncommitted changes shown inline.
- **Staleness detection** -- Worktrees with no commits in the last N days (default 14) show a warning icon.
- **Disk size** -- Hover over any worktree to see its disk footprint in the tooltip.
- **Rich tooltips** -- Markdown tooltips with commit info, ahead/behind, and disk usage.

### Smart Cleanup

The extension categorizes your worktrees and helps you clean up intelligently:

- **Merged** -- Branches already merged into your base branch (pre-selected for removal).
- **Stale** -- Worktrees with no recent activity (pre-selected for removal).
- **Behind** -- Clean worktrees that are only behind the base branch.
- **Active** -- Worktrees with uncommitted work or unpushed commits (excluded from cleanup).

Safety guards prevent removing locked worktrees and warn about dirty ones. You can also prune stale worktree entries that point to directories that no longer exist.

### Update from Main

Right-click any worktree and choose **Update from Main** to bring it up to date. Pick between rebase or merge strategy. If conflicts arise, the extension offers to open the worktree so you can resolve them.

### Environment Cloning

Automatically copy or symlink environment files into new worktrees. Create a `.worktree-env.json` at your repo root:

```json
{
  "copy": [".env", ".env.local"],
  "symlink": ["node_modules"]
}
```

Files listed in `copy` are duplicated; paths in `symlink` get symlinked to the originals. This runs automatically when creating a worktree.

### Session Snapshot & Restore

When you switch worktrees in the same window, the extension saves your open editors, cursor positions, and view columns. When you return, it offers to restore your previous session so you pick up right where you left off.

### Diff View

Right-click any worktree to see a file-level diff between it and your current workspace. Added and deleted files are handled with an empty-document placeholder so the diff is always readable.

### Lock and Unlock

Protect critical worktrees from accidental removal. Locked worktrees show a distinct icon and are excluded from bulk cleanup.

### Bulk Operations

Select multiple worktrees to perform batch actions:

- **Bulk Remove** -- Delete multiple worktrees at once (skips locked and current).
- **Bulk Lock** -- Lock several worktrees in one action.
- **Bulk Update** -- Rebase or merge the base branch into multiple worktrees.

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
| `Worktree Manager: Smart Cleanup` | Categorize worktrees (merged/stale/behind/active) and bulk-remove. |
| `Worktree Manager: Update from Main` | Rebase or merge the base branch into a worktree. |
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
| `worktreeManager.baseBranch` | `main` | Base branch used for ahead/behind counts, smart cleanup, and update operations. |
| `worktreeManager.staleDaysThreshold` | `14` | Number of days with no commits before a worktree is considered stale. |
| `worktreeManager.envCloneConfig` | `.worktree-env.json` | Path to environment cloning config file (relative to repo root). |

## License

MIT
