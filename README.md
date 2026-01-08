# Worktree Manager for VS Code

**Master your Git Worktree workflow without leaving VS Code.**

Worktree Manager gives you a first-class visual interface for Git Worktrees. Check out branches into separate folders, work on multiple features simultaneously, and keep your main repository clean—all with a unified, intuitive UI.

## Why Use Worktrees?
Stop stashing and popping just to review a PR or fix a bug. Git Worktrees allow you to check out multiple branches at once in separate directories. 
- 🚀 **Zero context switching overhead**
- 🛡️ **Clean main environment**
- ⚡ **Parallel builds and tests**

## Features

### ⚡ Quick Switcher
Jump between your active worktrees instantly.
- Click the **Status Bar** item to see a list of open worktrees.
- Use `Cmd/Ctrl+P` behavior with `Worktree Manager: Switch Worktree`.

### 📦 "Bring Changes With Me"
Started working on `main` but realized update needs a new branch? 
- Create a new worktree and **automatically move your uncommitted changes** to the new isolated environment.
- We handle the `stash` and `pop` for you.

### 🎨 Visual & Theme Integration
- **Color-Coded Windows**: New worktrees get a unique, auto-generated title bar color so you never mix up your "Production Hotfix" window with your "Experimental Feature" window.
- **Rich Status**: See at a glance which worktrees are dirty, locked, or active.

### 🧹 Smart Cleanup
Keep your disk usage low. The extension detects worktrees whose branches have been merged into `main` and offers to bulk delete them.

### Other Powerful Tools
- **Diff View**: Right-click any worktree to see a diff between it and your current reference.
- **One-Click Create**: Create worktrees from local or remote branches effortlessly.
- **Lock/Unlock**: Protect critical worktrees from accidental pruning.

## Usage

1. Open a folder that is part of a Git repository.
2. Open the **Source Control** side panel.
3. Use the **Worktrees** view to manage your environments.

### Commands
- `Worktree Manager: Create Worktree` - Start a new isolated workspace.
- `Worktree Manager: Switch Worktree` - Jump to another worktree.
- `Worktree Manager: Clean Merged Worktrees` - Find and delete finished worktrees.

## Configuration

| Setting | Default | Description |
| :--- | :--- | :--- |
| `worktreeManager.defaultPath` | `../{branch}` | Where to create new worktrees relative to the repo. |
| `worktreeManager.openBehavior` | `ask` | `newWindow`, `sameWindow`, or `ask` when opening a worktree. |
| `worktreeManager.showRemoteBranches` | `true` | Show/hide remote branches in the creation list. |

---

**Enjoying Worktree Manager?** leave a rating! ⭐️
