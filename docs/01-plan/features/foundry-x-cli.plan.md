---
code: FX-PLAN-001
title: Foundry-X CLI MVP Plan
version: 1.0
status: Draft
category: PLAN
created: 2026-03-16
updated: 2026-03-16
author: Sinclair Seo
---

# foundry-x-cli Planning Document

> **Summary**: Foundry-X CLI MVP — init/sync/status 3개 커맨드 + Plumb subprocess 래퍼를 4주 내 npm publish
>
> **Project**: Foundry-X
> **Version**: 0.1.0
> **Author**: AX BD팀
> **Date**: 2026-03-16
> **Status**: Draft
> **PRD Reference**: `prd-v3.md` (Round 2 착수 점수 84/100, Critical 0건)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | AI 에이전트가 만든 코드의 결정사항이 명세에 반영되지 않고, 명세↔코드↔테스트가 시간이 지나면서 동기화를 잃는다 |
| **Solution** | Git 리포에서 동작하는 CLI 도구로, Plumb 엔진을 래핑하여 SDD Triangle 동기화를 자동화한다 |
| **Function/UX Effect** | `foundry-x init`으로 하네스 즉시 구축, `foundry-x sync`로 동기화 검사, `foundry-x status`로 건강도 확인 — 개발 흐름을 끊지 않는 30초 이내 피드백 |
| **Core Value** | "명세가 항상 코드와 일치하고, '왜 이 코드가 존재하는가?'에 대한 답이 리포에 있는 상태"를 만든다 |

---

## 1. Overview

### 1.1 Purpose

개발자가 Git 리포에서 `foundry-x` CLI를 실행하면, Plumb SDD 엔진을 통해 명세↔코드↔테스트 동기화 상태를 확인하고, 하네스(에이전트 작업 환경)를 구축할 수 있도록 한다. Phase 1의 유일한 산출물이자, Month 3 Go/Kill 판정의 근거가 되는 핵심 제품이다.

### 1.2 Background

- PRD v3에서 MVP 범위 70% 축소 확정 (4개 AI 합의)
- Phase 1은 CLI 3개 커맨드만. 웹/API/오케스트레이션은 Phase 2로 이관
- Plumb 2트랙 전략: Track A(subprocess 래퍼) 즉시 실행, Track B(TS 재구현) 대기
- 첫 4주가 생명줄 — 5명 강제 온보딩 후 실사용 데이터 수집

### 1.3 Related Documents

- PRD: `prd-v3.md` §7 (Solution), §8 (Release)
- 기술 스택: `tech-stack-review.md` §3.3 CLI
- 착수 체크리스트: `review/round-2/review-synthesis.md` §4
- Round 1 검토: `review/round-1/review-synthesis.md`

---

## 2. Scope

### 2.1 In Scope (Phase 1 Only)

- [ ] `foundry-x init` — 하네스 스캐폴딩 (CLAUDE.md, AGENTS.md, specs/, .plumb/)
- [ ] `foundry-x sync` — Plumb subprocess 호출, 명세↔코드↔테스트 동기화 검사
- [ ] `foundry-x status` — SDD Triangle 상태 + Triangle Health Score 표시
- [ ] Plumb Bridge — Python subprocess 래퍼 (Track A)
- [ ] 하네스 템플릿 — default + kt-ds-sr (KT DS SR 처리 특화)
- [ ] `.foundry-x/` 로컬 메타데이터 저장 (JSON)
- [ ] npm publish 가능한 패키지
- [ ] 내부 개발자 5명 온보딩 가이드

### 2.2 Out of Scope (Phase 2 명시적 이관)

- API Server (Hono)
- Web Dashboard (Next.js)
- 에이전트 오케스트레이션 / 병렬 작업
- NL→Spec 자연어 변환
- PostgreSQL / Redis
- 멀티 에이전트 충돌 해결 (브랜치 기반 격리)
- `foundry-x review`, `foundry-x coverage`, `foundry-x agent`, `foundry-x dashboard`

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `foundry-x init`: 현재 디렉토리에 하네스 구조 생성 (templates/default 기반) | High | Pending |
| FR-02 | `foundry-x init --template kt-ds-sr`: KT DS SR 특화 템플릿 선택 | High | Pending |
| FR-03 | `foundry-x sync`: Plumb subprocess 호출 → 동기화 결과 출력 | High | Pending |
| FR-04 | `foundry-x status`: SDD Triangle 동기화 상태 + Triangle Health Score | High | Pending |
| FR-05 | Plumb Bridge: subprocess 실행, timeout/exit code/stderr 처리 | High | Pending |
| FR-06 | `.foundry-x/` 디렉토리에 프로젝트 메타데이터 JSON 저장 | Medium | Pending |
| FR-07 | `--no-verify` 사용 시 경고 메시지 + 로그 기록 (KPI K2 측정용) | Medium | Pending |
| FR-08 | CLI 실행 로그 기록 (KPI K1 측정용) | Medium | Pending |
| FR-09 | `npx foundry-x init`으로 설치 없이 즉시 실행 가능 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | `sync` 실행 시간 < 30초 (일반 리포 기준) | 5개 온보딩 리포에서 측정 |
| Performance | `status` 실행 시간 < 5초 | CLI 실행 로그 |
| Reliability | Plumb subprocess 실패 시 graceful fallback (에러 메시지 + exit code) | 수동 테스트 |
| Compatibility | Node.js 20 LTS, Python 3.10+ (Plumb 요구) | CI 매트릭스 |
| Usability | 설치부터 첫 `init` 실행까지 5분 이내 | 온보딩 타이머 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 3개 커맨드 (init, sync, status) 모두 동작
- [ ] Plumb Bridge subprocess 래퍼 안정 동작
- [ ] 하네스 템플릿 2종 (default, kt-ds-sr) 포함
- [ ] npm publish 완료 (`npm install -g foundry-x` or `npx foundry-x`)
- [ ] 내부 개발자 5명 온보딩 완료
- [ ] 사용자 가이드 작성 완료

### 4.2 Quality Criteria

- [ ] Unit test coverage ≥ 80%
- [ ] Zero lint errors (ESLint)
- [ ] TypeScript strict mode
- [ ] CI (GitHub Actions) green

### 4.3 KPI Targets (Month 2~3 측정)

| KPI | Target | Kill Line |
|-----|--------|-----------|
| CLI 주간 호출/사용자 | 10회+ | 사용률 30% 미만 |
| `--no-verify` 우회 비율 | < 20% | — |
| sync 후 수동 수정 파일 | 감소 추세 | — |
| 결정 승인율 | > 70% | — |

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Plumb 미성숙 — 실제 리포 규모에서 동작 불가 | Critical | Medium | Track B(TS 재구현) 대기. 전환 기준: Plumb 버그 장애 주 2회+ |
| 사용자 채택 실패 — 개발자가 pre-commit 훅 거부 | Critical | Medium | 5명 강제 온보딩, 주간 피드백, `--no-verify` 비율 모니터링 |
| TS+Python 빌드 파이프라인 복잡도 | High | Medium | Turborepo TS 빌드 + Python 독립 빌드. Sprint 1 Week 1에 검증 |
| subprocess 오류 처리 미비 — Plumb 크래시 시 CLI 행 | High | Medium | timeout(30s), exit code 처리, stderr 캡처. 내부 계약 문서화 |
| Phase 1→2 아키텍처 단절 | High | Low | packages/cli 핵심 모듈을 독립 패키지로 분리 설계 (Sprint 1) |
| SDD 동기화가 개발 속도 저해 | Medium | Medium | sync 소요 시간 측정, 30초 초과 시 최적화 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend | ☒ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | ☐ |

> Dynamic 선택 근거: 모노리포(pnpm workspace) + CLI + Python subprocess 통합. 백엔드 서비스는 아니지만, 멀티 패키지 + 외부 프로세스 연동이 있으므로 Starter는 부적합.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 런타임 | Node.js 20 / Bun | Node.js 20 LTS | npm 배포 안정성. Bun은 npm publish 생태계 미성숙 |
| CLI 프레임워크 | Commander+Ink / oclif / yargs | Commander + Ink | Commander 경량, Ink React TUI로 status 대시보드 구현 |
| Git 연동 | simple-git+octokit / nodegit | simple-git + octokit | 경량 + GitHub/GitLab API 추상화 |
| SDD 엔진 | Plumb subprocess / TS 자체 구현 | Plumb subprocess (Track A) | 즉시 실행. Track B는 대기 |
| 모노리포 도구 | pnpm+Turborepo / npm workspaces / nx | pnpm + Turborepo | TS+Python 혼합 빌드에 적합, 기존 팀 경험 |
| 테스트 | Vitest / Jest | Vitest | ESM 네이티브, 빠른 실행, TS 지원 |
| 배포 | npm publish / brew / curl | npm publish | `npx foundry-x init`으로 즉시 시작 |

### 6.3 모노리포 구조 (PRD v3 §7.9)

```
foundry-x/
├── packages/
│   ├── cli/                    # foundry-x CLI (TypeScript)
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.ts     # 하네스 스캐폴딩
│   │   │   │   ├── sync.ts     # SDD 동기화 검사
│   │   │   │   └── status.ts   # 동기화 상태 표시
│   │   │   ├── plumb/
│   │   │   │   └── bridge.ts   # Plumb subprocess 래퍼
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/                 # 공유 타입, 설정
│       └── package.json
├── templates/                  # 하네스 스타터 킷
│   ├── default/
│   │   ├── CLAUDE.md
│   │   ├── AGENTS.md
│   │   ├── CONSTITUTION.md
│   │   ├── specs/
│   │   └── .plumb/config.json
│   └── kt-ds-sr/              # KT DS SR 처리 특화
├── examples/
├── docs/adr/
├── package.json               # 루트 (pnpm workspace)
├── pnpm-workspace.yaml
└── turbo.json
```

### 6.4 Plumb Bridge 아키텍처

```
CLI Command (TS)
    │
    ▼
PlumbBridge.execute(command, args)
    │
    ├── spawn('python', ['-m', 'plumb', ...args])
    ├── timeout: 30s (configurable)
    ├── stdout → parse JSON/text
    ├── stderr → error capture
    └── exit code → 0:success, 1:error, 2:partial
         │
         ▼
    Result { success, data, errors, duration }
```

**subprocess 오류 처리 계약 (Sprint 1 문서화 대상):**
- timeout: 30초 (`.foundry-x/config.json`에서 설정 가능)
- exit code 0: 성공, exit code 1: 에러, exit code 2: 부분 성공
- stderr: 에러 메시지 캡처 → CLI 에러 출력
- Plumb 미설치: 설치 안내 메시지 출력 + exit code 127 핸들링

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section (방금 생성)
- [ ] ESLint configuration (`.eslintrc.*`) — 생성 필요
- [ ] Prettier configuration (`.prettierrc`) — 생성 필요
- [ ] TypeScript configuration (`tsconfig.json`) — 생성 필요

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | Missing | camelCase(변수/함수), PascalCase(타입/클래스), kebab-case(파일) | High |
| **Folder structure** | PRD v3 §7.9 확정 | packages/cli/src/commands/ 구조 | High |
| **Import order** | Missing | node builtins → external → internal → relative | Medium |
| **Error handling** | Missing | PlumbBridge 에러 클래스 계층, graceful fallback | High |
| **Logging** | Missing | CLI 실행 로그 포맷 (KPI 측정용) | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `FOUNDRY_X_PLUMB_TIMEOUT` | Plumb subprocess timeout (ms) | CLI | ☐ |
| `FOUNDRY_X_LOG_DIR` | CLI 실행 로그 디렉토리 | CLI | ☐ |
| `FOUNDRY_X_TEMPLATE_DIR` | 커스텀 템플릿 경로 (optional) | CLI | ☐ |

---

## 8. Implementation Plan

### Sprint 1 (Week 1~2): 기반 + Plumb Bridge

| # | Task | Priority | Dependency |
|---|------|----------|------------|
| 1 | ADR-000: v3가 기존 문서를 대체한다는 선언 | High | Day 1 전 |
| 2 | Phase 1 Git provider 확정 (GitHub) | High | Day 1 전 |
| 3 | 모노리포 scaffolding (pnpm workspace + Turborepo) | High | — |
| 4 | packages/cli 기본 구조 (Commander + TypeScript) | High | #3 |
| 5 | PlumbBridge subprocess 래퍼 구현 | High | #4 |
| 6 | `.plumb` 출력 형식 + `decisions.jsonl` 내부 계약 문서화 | High | #5 |
| 7 | subprocess 오류 처리 계약 (timeout, exit code, stderr) | High | #5 |
| 8 | TS+Python 빌드 파이프라인 검증 | Medium | #3 |

### Sprint 2 (Week 3~4): 커맨드 구현 + 배포

| # | Task | Priority | Dependency |
|---|------|----------|------------|
| 9 | `foundry-x init` 커맨드 구현 | High | #4 |
| 10 | 하네스 템플릿 2종 (default, kt-ds-sr) | High | #9 |
| 11 | `foundry-x sync` 커맨드 구현 (PlumbBridge 연동) | High | #5, #6 |
| 12 | `foundry-x status` 커맨드 + Triangle Health Score | High | #5 |
| 13 | `.foundry-x/` 메타데이터 저장 | Medium | #9 |
| 14 | CLI 실행 로그 + KPI 측정 기반 | Medium | #9, #11, #12 |
| 15 | npm publish + npx 즉시 실행 검증 | High | #9, #11, #12 |
| 16 | 사용자 가이드 작성 | Medium | #15 |
| 17 | 내부 5명 온보딩 시작 | High | #15, #16 |

---

## 9. Next Steps

1. [ ] 이 Plan 문서 리뷰 및 승인
2. [ ] Design 문서 작성 (`/pdca design foundry-x-cli`)
3. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-16 | Initial draft (PRD v3 + Round 2 synthesis 기반) | AX BD팀 |
