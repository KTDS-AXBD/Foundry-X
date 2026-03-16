# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [0.2.0] - 2026-03-16

### Added
- `foundry-x init` — harness detect → generate pipeline (F6)
- `foundry-x sync` — PlumbBridge review integration (F7)
- `foundry-x status` — Triangle Health Score display (F8)
- Harness templates: default (8), kt-ds-sr (4), lint (3) (F9)
- Verification scripts: verify-harness.sh, check-sync.sh (F10)
- npm publish: foundry-x@0.1.1, `npx foundry-x init` support (F11)
- ADR-000: v3 monorepo supersedes legacy multi-repo (F12)
- Internal contracts: Plumb output format (FX-SPEC-002), error handling (FX-SPEC-003) (F13, F14)

## [0.1.0] - 2026-03-16

### Added
- Monorepo scaffolding: pnpm workspace + Turborepo (F1)
- Shared types module: packages/shared (F2)
- Harness modules: detect, discover, analyze, generate, verify, merge-utils (F3)
- PlumbBridge subprocess wrapper: bridge, errors, types (F4)
- Services: config-manager, health-score, logger (F5)
- Test suite: 8 files, 35 tests (vitest)
