# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Session 17 (2026-03-17)
**Sub-Sprint D — API+Web 테스트 추가 + v0.5.0 버전 범프 + requirements 파서 수정**:
- packages/api 테스트: 6파일 38테스트 (라우트 5 + data-reader 1)
- packages/web 테스트: 2파일 18테스트 (api-client + 컴포넌트 3종)
- app.ts 분리: index.ts에서 Hono app 생성을 분리하여 테스트 가능하게
- CLI 버전 범프: foundry-x@0.4.0 → 0.5.0, index.ts --version 하드코딩 수정
- Web 테스트 인프라: vitest + @testing-library/react + jsdom 설정
- requirements 파서: 5컬럼 SPEC 형식 + 이모지 상태(✅/🔧/📋) 파싱으로 수정
- Workers types 호환: @cloudflare/workers-types의 Response.json() 타입 오버라이드 대응
- 모노리포 전체: 30파일 162테스트 ✅, typecheck ✅, build ✅

### Session 16 (2026-03-17)
**Phase 1 Go 판정 + Phase 2 전환 준비**:
- Phase 1 Go 판정 완료 — 36건 F-item 전부 DONE, Tech Debt 0건, PDCA 93~97%
- SPEC.md v1.4: Go 판정 근거 + v0.5.0 마일스톤 + Phase 2 전환 기록
- CLAUDE.md 현행화: Phase 2 상태 반영, Repository Structure(api/web 추가)
- MEMORY.md 갱신: Phase 2 전환, 다음 작업 업데이트

### Session 15 (2026-03-17)
**Sprint 5 Part A — Frontend Design 웹 대시보드 + API 서버 (F26~F31)**:
- packages/api: Hono API 서버 (8 routes, 15 endpoints, data-reader 서비스)
- packages/web: Next.js 14 대시보드 (6 pages, 7 Feature 컴포넌트)
- packages/shared: web.ts(6) + agent.ts(9) = 15 신규 타입
- F26 대시보드: SDD Triangle + Sprint + Harness Health 위젯
- F27 Wiki: CRUD + D3 소유권 마커 보호 (foundry-x:auto 읽기 전용)
- F28 아키텍처 뷰: ModuleMap + Diagram + Roadmap + Requirements 4탭
- F29 워크스페이스: ToDo + Messages + Settings (localStorage)
- F30 Agent 투명성: AgentCard 3소스 통합 + SSE EventSource
- F31 Token 관리: Summary + 모델/Agent별 비용 테이블
- PDCA: Plan → Design → Do(Agent Teams ×3) → Check(72%) → Iterate ×2(~90%) → Report
- 모노리포 4 패키지: cli + shared + api + web

### Session 14 (2026-03-17)
**Sprint 5 Part B — 하네스 산출물 동적 생성 (F32~F36)**:
- ✅ Builder 패턴 도입: architecture/constitution/claude/agents 4개 builder
- ✅ RepoProfile.scripts 필드 추가 + discover.ts scripts 감지
- ✅ generate.ts builder 통합 (builder 있으면 동적 생성, 없으면 템플릿)
- ✅ verify.ts 강화: 플레이스홀더 잔존 감지 + 모듈 맵 일관성 검증
- ✅ harness-freshness.ts: 하네스 문서 신선도 검사 (status 통합)
- ✅ 22파일 106테스트 (기존 71 + 신규 35), typecheck/lint/build 전부 통과
- PDCA: Plan→Design→Do→Check(93%)→Report 완료

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
