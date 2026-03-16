# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Session 13 (2026-03-17)
**CLAUDE.md 현행화 + Claude Code 자동화 설정**:
- CLAUDE.md 품질 감사 (78→91점, Grade B→A): stale 참조 수정, 섹션 추가/현행화
- Claude Code settings.json: permissions 17 allow + 4 deny
- PostToolUse hook: .ts/.tsx 편집 시 auto-typecheck (60s timeout)
- PreToolUse hook: .env/credentials/lock 파일 보호 (exit 2 차단)
- npm-release 스킬: version bump → 검증 → build → publish 자동화

## [0.3.1] - 2026-03-16

### Added
- Ink TUI components: Header, StatusBadge, HealthBar, ProgressStep, ErrorBox (F15)
- View components: StatusView, InitView, SyncView (F16-F18)
- render.tsx — TTY/non-TTY 4-branch dispatcher (F20)
- eslint flat config + typescript-eslint (F19, TD-02 resolved)
- GitHub templates: issue + PR templates (F21)
- Sprint 3 PDCA documents (plan, design, analysis, report)

### Changed
- Commands refactored: runStatus/runInit/runSync logic extraction
- npm published: foundry-x@0.3.1
- Branch protection relaxed (1인 개발 효율화, approval 0명)

### Fixed
- CLI --version 하드코딩 → 0.3.1 반영

## [0.2.0+unreleased] - 2026-03-16

### Added
- Governance standards compliance (GOV-004/005/007/010): .gitignore secrets, .env.example, CHANGELOG.md, MEMORY.md active risks
- ADR-000 PDCA documents (plan, design, analysis, report)
- Project hygiene: archive stale .docx from 01-plan

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
