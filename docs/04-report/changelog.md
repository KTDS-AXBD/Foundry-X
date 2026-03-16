# Foundry-X Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Sprint 3 (v0.3.0) completion report: Ink TUI + eslint
- 12 new files: UI components, views, render utility, types, eslint config
- 5 Ink TUI components: Header, StatusBadge, HealthBar, ProgressStep, ErrorBox
- 3 TUI views for each command: StatusView, InitView, SyncView
- eslint flat config with TypeScript rules (0 error)
- Non-TTY fallback for CI/pipe environments

### Changed
- **commands/status.ts**: Refactored to separate business logic (`runStatus()`) from rendering
- **commands/init.ts**: Refactored to extract `runInit()` logic, improved error handling
- **commands/sync.ts**: Refactored to return structured data via `renderOutput()`
- CLI output now uses Ink TUI with colors, layouts, and progress indicators (when TTY available)

### Fixed
- **TD-02**: eslint configuration now complete with flat config format
- Component pattern improvements: ViewDataMap type safety, HealthBar score clamping
- Non-TTY handling: Automatic fallback to plain text in CI/pipe environments
- All 35 existing tests pass without modification

### Deprecated
- Legacy console.log only output (now has structured Ink alternative)

### Removed
- None

### Security
- No security-related changes

---

## [0.2.0] - 2026-03-16 (Sprint 2 completion)

### Added
- CLI commands: `foundry-x init`, `foundry-x status`, `foundry-x sync`
- Harness template system (8 + 4 + 3 templates = 15 total)
- Triangle Health Score computation
- npm publish: foundry-x@0.1.1
- Verification scripts: verify-harness.sh, check-sync.sh
- Internal API contracts: .plumb format spec (FX-SPEC-002), subprocess error handling (FX-SPEC-003)
- ADR-000: Architecture Decision Record for v3 baseline

### Changed
- PlumbBridge integration with subprocess wrapper
- Health Score service with configurable thresholds
- ConfigManager with multi-template support

### Fixed
- Sprint 2 PDCA analysis: 93% design match rate

---

## [0.1.0] - 2026-03-16 (Sprint 1 completion)

### Added
- Monorepo structure: pnpm workspace + Turborepo
- packages/shared: Core types (FoundryXConfig, HealthScore, HarnessIntegrity, etc.)
- packages/cli: CLI application with modular structure
- Harness modules: detect, discover, analyze, generate, verify, merge-utils
- PlumbBridge subprocess wrapper: bridge, errors, types
- Services: ConfigManager, HealthScore, Logger
- TypeScript configuration with JSX support (Ink/React ready)
- Test suite: 8 files, 35 tests, 100% pass rate

### Changed
- None (initial release)

### Fixed
- None

---

## Notes

### PDCA Metrics
- **Sprint 1**: ✅ Complete (v0.1.0)
- **Sprint 2**: ✅ Complete (v0.2.0, Match Rate 93%)
- **Sprint 3**: ✅ Complete (v0.3.0, Match Rate 94%)

### Tech Debt Status
- **TD-01**: ✅ Resolved (2026-03-16) — Commander setup implemented in F6/F7/F8
- **TD-02**: ✅ Resolved (2026-03-16) — eslint configuration completed

### Next Releases
- **v0.3.0**: Pending npm publish (Ink TUI + eslint + 7 improvements)
- **v0.4.0**: Sprint 4 planning (UI test framework, Ink real-time updates)
- **v1.0.0**: Phase 1 completion (tentative, Month 3)
