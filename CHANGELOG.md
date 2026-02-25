# Changelog

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
