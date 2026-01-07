# Worktree Manager for VS Code

A visual client for managing Git Worktrees directly within VS Code. Keep your main repository clean and check out branches into separate folders (worktrees) to work on multiple tasks simultaneously.

## Features

- **Dedicated Explorer View**: "Worktrees" view integrated into the Source Control side panel.
- **Visual Status**: 
    - $(check) **Active**: Green checkmark for the current worktree.
    - $(git-branch) **Modified**: Yellow branch icon for worktrees with uncommitted changes.
    - $(lock) **Locked**: Lock icon for worktrees protected from pruning.
- **Rich Details**: Hover over any worktree to see the commit hash, message, author, and relative date.
- **Worktree Locking**: Lock important worktrees to prevent them from being accidentally pruned (`git worktree prune`).
- **One-Click Create**: Create a new worktree from any local or remote branch.
- **Easy Navigation**: Open worktrees in the current window or a new window.
- **Maintenance**: Prune stale worktrees and remove finished ones with a right-click.

## Usage

1. Open a folder that is part of a Git repository.
2. Navigate to the **Source Control** view container (usually the Git icon in the sidebar).
3. You will see two new views:
    - **Worktrees**: Lists all active worktrees.
    - **Available Branches**: Lists branches you can create worktrees from.

### Creating a Worktree
- Hover over a branch in "Available Branches" and click the `+` icon.
- Or use the command `Worktree Manager: Create Worktree`.
- You will be prompted for:
    1. The branch name (if not creating from an existing one).
    2. The target directory path (defaults to `../{branch_name}`).

### Opening a Worktree
- Click on any worktree in the list.
- By default, it asks if you want to open in a "New Window" or "Same Window".
- You can configure this behavior in settings (`worktreeManager.openBehavior`).

### Locking / Unlocking
- Right-click on a worktree in the list.
- Select **Lock Worktree** to protect it. A lock icon will appear.
- Select **Unlock Worktree** to allow it to be pruned or removed.

## Extension Settings

This extension contributes the following settings:

* `worktreeManager.defaultPath`: Pattern for new worktree paths (default: `../{branch}`). Variables: `{branch}`, `{repo}`.
* `worktreeManager.openBehavior`: `ask` (default), `newWindow`, or `sameWindow`.
* `worktreeManager.showRemoteBranches`: Toggle whether to show remote branches in the list.

## KNOWN ISSUES
- None currently.
