# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension ("Worktree Manager") that provides a visual interface for Git worktree management. Published to both VS Code Marketplace and Open VSX Registry under publisher `iceinveins`.

## Build & Development Commands

```bash
npm run compile        # TypeScript -> out/ (must run before testing in Extension Dev Host)
npm run watch          # Compile with watch mode
npm run lint           # Biome check with auto-fix (biome check src --write)
npm test               # Mocha unit tests (mocha -r ts-node/register src/test/unit/**/*.test.ts)
```

**Run the extension:** Press F5 in VS Code to launch Extension Development Host (uses `.vscode/launch.json`). The extension activates in any workspace containing a `.git` directory.

**Package for manual install:** `npx @vscode/vsce package` creates a `.vsix` file.

## Architecture

The extension follows a service + provider + command pattern:

**Core service:** `src/gitService.ts` — All git operations go through `GitService`, which wraps `child_process.exec` (async only, never `execSync`). It parses `git worktree list --porcelain` output and provides methods for CRUD operations on worktrees. The `Worktree` and `Branch` interfaces are defined here.

**Tree data providers** (populate the SCM sidebar views):
- `src/worktreeProvider.ts` — `WorktreeProvider` + `WorktreeItem` for the "Worktrees" view. Uses `contextValue` (`worktree`, `worktreeCurrent`, `worktreeLocked`, `worktreeCurrentLocked`) to control which context menu actions appear.
- `src/branchProvider.ts` — `BranchProvider` + `BranchItem` for the "Available Branches" view. Only shows branches without an existing worktree.

**Commands** (`src/commands/`): Each command is a standalone async function that takes `GitService` (and sometimes a tree item). Registered in `extension.ts`. Key behaviors:
- `create.ts` — Stash/pop flow for "bring changes with me"; applies color theme via `utils/theme.ts`
- `diff.ts` — File-level diff between current workspace and target worktree using `vscode.diff`; uses `EmptyDocumentProvider` for added/deleted files
- `cleanup.ts` — Bulk-deletes worktrees whose branches are merged into main/master
- `switch.ts` delegates to `open.ts` after QuickPick selection

**Status bar:** `src/statusBar.ts` — Shows current worktree branch; clicking triggers the switch command.

**Utilities:**
- `src/utils/theme.ts` — Deterministic color generation from branch name; writes `.vscode/settings.json` in the worktree directory
- `src/utils/emptyProvider.ts` — `TextDocumentContentProvider` returning empty string (used as diff placeholder)

**Entry point:** `src/extension.ts` — `activate()` instantiates `GitService`, providers, and `StatusManager`; registers all commands. `refreshAll()` triggers both tree providers.

## Testing

Tests use Mocha + assert (not Jest/Vitest). The test in `src/test/unit/gitService.test.ts` subclasses `GitService` as `MockGitService` to intercept the `exec()` method — this is the established mocking pattern for testing git operations without actual repos.

## Code Style

- **Formatter:** Biome with tabs, double quotes
- **All git operations must be async** — never use `execSync` (prevents UI freezing)
- **Configuration namespace:** `worktreeManager.*` — three settings: `defaultPath`, `openBehavior`, `showRemoteBranches`
- **Command namespace:** `worktreeManager.*` — all commands prefixed consistently

## CI/CD

GitHub Actions workflow (`.github/workflows/publish.yml`) runs on release: lint → test → compile → publish to both VS Code Marketplace and Open VSX (using `VSCE_PAT` and `OVSX_PAT` secrets).
