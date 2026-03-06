# Changelog

## [0.3.3] - 2026-03-06

### Features

- show ahead/behind badges on branch items (42f251c)
- add Branch enrichment fields and formatBranchDescription helper (e98f61e)
- add getBranchBehindRemote method to GitService (a8a7ff6)
- add getBranchAheadBehind method to GitService (d7ea103)
- add move worktree command (409dbb9)
- show progress notification during worktree creation (761f243)
### Fixes

- validate branch names to prevent shell injection (c7abc60)
- use baseBranch setting for ahead/behind counts in worktree list (f0ecb7c)
- throttle focus-triggered refresh to once per 60 seconds (cee7255)

## [0.3.1] - 2026-03-04

### Fixes

- increase polling interval to 2min and delete session file after restore prompt (6d3e080)

## [0.3.0] - 2026-02-25

### Features

- add bulk remove, lock, and update operations (b60802f)
- add session snapshot/restore for worktree switching (ff9be88)
- add environment cloning via .worktree-env.json on worktree create (587adcd)
- add update-from-main command with rebase/merge strategy (1c1e2eb)
- add smart cleanup wizard with merged/stale/behind categorization (b1c5785)
- display ahead/behind, staleness, change count, disk size in worktree views (802e5bc)
- add formatAheadBehind, isStale, formatDiskSize helpers (ac1f599)
- enrich getWorktrees with ahead/behind, changedFilesCount, diskSize, lastActivityDate (5adc93e)
- add getAheadBehind, getChangedFilesCount, getLastCommitDate, getDiskSize to GitService (799847a)
- add baseBranch, staleDaysThreshold, envCloneConfig settings (fe5ac5c)
### Other

- docs: update README with smart worktree lifecycle features (a6a9cd3)
- chore: fix lint warnings in new and existing files (63bb69b)

## [0.2.0] - 2026-02-25

### Features

- auto-refresh worktree and branch views (a99138b)
### Other

- docs: rewrite README with complete feature and config coverage (aa3cdd4)

## [0.1.0] - 2026-02-24

### Features

- add release automation script (bf17f77)
- run post-create script after worktree creation (1b1f9b2)
- add runPostCreateScript execution with timeout (beff37f)
- add findScript for post-create script discovery (90f381c)
- add worktreeManager.postCreateScript setting (18daa97)
### Fixes

- remove extra blank lines in changelog section entries (333fe93)
- harden release script (injection, pipefail, scoped commits, gh check) (dcb0fe5)
- add path traversal guard and Windows X_OK compatibility (66405b7)
### Other

- test: expand unit test coverage from 11 to 58 tests (cc45822)
- docs: init CLAUDE (157952b)
