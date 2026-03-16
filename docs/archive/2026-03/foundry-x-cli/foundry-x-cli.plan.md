---
code: FX-PLAN-001
title: Foundry-X CLI MVP Plan
version: 2.0
status: Draft
category: PLAN
created: 2026-03-16
updated: 2026-03-16
author: Sinclair Seo
---

# foundry-x-cli Planning Document

> **Summary**: Foundry-X CLI MVP — init(Brownfield/Greenfield 4단계 파이프라인)/sync/status + PlumbBridge + 하네스 무결성 검증을 4주 내 npm publish
>
> **Project**: Foundry-X
> **Version**: 0.1.0
> **Author**: AX BD팀
> **Date**: 2026-03-16
> **Status**: Draft
> **PRD Reference**: `prd-v4.md` (synthnoosh/agentic-harness-bootstrap 분석 반영)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | AI 에이전트가 만든 코드의 결정사항이 명세에 반영되지 않고, 하네스(에이전트 작업 환경)가 프로젝트와 함께 진화하지 못하며, 명세↔코드↔테스트가 시간이 지나면서 동기화를 잃는다 |
| **Solution** | Git 리포에서 동작하는 CLI 도구로, Brownfield/Greenfield를 자동 감지하여 4단계(Discover→Analyze→Generate→Verify) 하네스를 구축하고, Plumb 엔진으로 SDD Triangle 동기화를 자동화한다 |
| **Function/UX Effect** | `foundry-x init`으로 기존/신규 리포 맞춤 하네스 구축(CLAUDE.md+ARCHITECTURE.md+CONSTITUTION.md+progress.md), `foundry-x sync`로 동기화 검사, `foundry-x status`로 건강도+하네스 무결성 확인 |
| **Core Value** | "하네스가 프로젝트와 함께 살아있고, 명세가 항상 코드와 일치하며, 에이전트는 Always/Ask/Never 경계 안에서 안전하게 작업하는 상태"를 만든다 |

---

## 1. Overview

### 1.1 Purpose

개발자가 Git 리포에서 `foundry-x` CLI를 실행하면, 리포 유형(Brownfield/Greenfield)을 자동 감지하여 맞춤형 하네스를 구축하고, Plumb SDD 엔진을 통해 명세↔코드↔테스트 동기화 상태를 확인할 수 있도록 한다. Phase 1의 유일한 산출물이자, Month 3 Go/Kill 판정의 근거가 되는 핵심 제품이다.

### 1.2 Background

- PRD v3에서 MVP 범위 70% 축소 확정 (4개 AI 합의)
- **PRD v4에서 synthnoosh/agentic-harness-bootstrap 분석 반영** — init 4단계 파이프라인, ARCHITECTURE.md, CONSTITUTION.md 3계층, Semantic Linting, verify-harness.sh, progress.md 추가
- Phase 1은 CLI 3개 커맨드만. 웹/API/오케스트레이션은 Phase 2로 이관
- Plumb 2트랙 전략: Track A(subprocess 래퍼) 즉시 실행, Track B(TS 재구현) 대기
- 첫 4주가 생명줄 — 5명 강제 온보딩 후 실사용 데이터 수집

### 1.3 Related Documents

- PRD: `prd-v4.md` §7.2(축 1 하네스 강화), §7.9(리포 구조), §7.11(progress.md)
- 기술 스택: `tech-stack-review.md` §3.3 CLI
- 착수 체크리스트: `review/round-2/review-synthesis.md` §4
- 외부 레퍼런스: [synthnoosh/agentic-harness-bootstrap](https://github.com/synthnoosh/agentic-harness-bootstrap)

---

## 2. Scope

### 2.1 In Scope (Phase 1 Only)

**커맨드:**
- [ ] `foundry-x init` — Brownfield/Greenfield 자동 감지 + 4단계 파이프라인 (Discover→Analyze→Generate→Verify)
- [ ] `foundry-x init --mode [brownfield|greenfield]` — 수동 모드 지정
- [ ] `foundry-x init --template kt-ds-sr` — KT DS SR 특화 템플릿 선택
- [ ] `foundry-x sync` — Plumb subprocess 호출 + 동기화 결과 출력 + progress.md 업데이트
- [ ] `foundry-x status` — SDD Triangle 상태 + Triangle Health Score + 하네스 무결성 표시

**하네스 시스템 (v4 신규):**
- [ ] `harness/detect.ts` — Brownfield/Greenfield 감지 로직
- [ ] `harness/discover.ts` — Phase 0: 스택 스캔 (언어/프레임워크/빌드/CI/테스트 인프라)
- [ ] `harness/analyze.ts` — Phase 1: 아키텍처 패턴 심층 분석
- [ ] `harness/generate.ts` — Phase 2: 산출물 생성 (merge, 덮어쓰기 금지, 멱등성)
- [ ] `harness/verify.ts` — Phase 3: 무결성 검증

**산출물 (v4 확장):**
- [ ] `ARCHITECTURE.md` 템플릿 — 에이전트용 레이어 맵 (v4 신규)
- [ ] `CONSTITUTION.md` 3계층 — Always/Ask/Never 경계 (v4 강화)
- [ ] `progress.md` 템플릿 — 에이전트 세션 지속성 (v4 신규)
- [ ] Harness Evolution Rules — 모든 하네스 파일에 자기 갱신 규칙 내장
- [ ] `scripts/verify-harness.sh` — 하네스 무결성 지속 검증 (v4 신규)
- [ ] `scripts/check-sync.sh` — CLAUDE.md ↔ AGENTS.md 섹션 구조 검사 (v4 신규)

**기반:**
- [ ] Plumb Bridge — Python subprocess 래퍼 (Track A)
- [ ] 하네스 템플릿 — default + kt-ds-sr + lint 스택별 템플릿
- [ ] `.foundry-x/` 로컬 메타데이터 저장 (JSON)
- [ ] `.github/workflows/harness-sync-check.yml` — CI 자동 검증 (v4 신규)
- [ ] npm publish 가능한 패키지
- [ ] 내부 개발자 5명 온보딩 가이드

### 2.2 Out of Scope (Phase 2 명시적 이관)

- API Server (Hono) / Web Dashboard (Next.js)
- 에이전트 오케스트레이션 / 병렬 작업
- NL→Spec 자연어 변환
- PostgreSQL / Redis
- 멀티 에이전트 충돌 해결 (브랜치 기반 격리)
- `foundry-x review`, `foundry-x coverage`, `foundry-x agent`, `foundry-x dashboard`

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status | v4 |
|----|-------------|----------|--------|:---:|
| FR-01 | `init`: Brownfield/Greenfield 자동 감지 (프로젝트 마커 파일 기반) | High | Pending | 신규 |
| FR-02 | `init` Brownfield: 4단계 파이프라인 (discover→analyze→generate→verify) | High | Pending | 신규 |
| FR-03 | `init` Greenfield: 인터랙티브 스택 선택 → scaffolding → Phase 1~3 | High | Pending | 신규 |
| FR-04 | `init` 멱등성: 기존 파일 보존, 신규 섹션만 merge | High | Pending | 신규 |
| FR-05 | `init --template kt-ds-sr`: KT DS SR 특화 템플릿 | High | Pending | |
| FR-06 | `init` 산출물: CLAUDE.md, AGENTS.md, ARCHITECTURE.md, CONSTITUTION.md, specs/, .plumb/, progress.md | High | Pending | 확장 |
| FR-07 | CONSTITUTION.md 3계층 (Always/Ask/Never) 구조 생성 | High | Pending | 신규 |
| FR-08 | ARCHITECTURE.md 에이전트용 레이어 맵 생성 | High | Pending | 신규 |
| FR-09 | Harness Evolution Rules: 모든 하네스 파일에 자기 갱신 규칙 섹션 내장 | Medium | Pending | 신규 |
| FR-10 | `sync`: Plumb subprocess 호출 → 동기화 결과 출력 | High | Pending | |
| FR-11 | `sync`: progress.md 자동 업데이트 | Medium | Pending | 신규 |
| FR-12 | `status`: SDD Triangle 상태 + Triangle Health Score | High | Pending | |
| FR-13 | `status`: 하네스 무결성 표시 (verify-harness 결과) | High | Pending | 신규 |
| FR-14 | Plumb Bridge: subprocess 실행, timeout/exit code/stderr 처리 | High | Pending | |
| FR-15 | `verify-harness.sh`: 하네스 파일 존재/구조/참조 무결성 검증 | High | Pending | 신규 |
| FR-16 | `check-sync.sh`: CLAUDE.md ↔ AGENTS.md 섹션 구조 일치 검증 | Medium | Pending | 신규 |
| FR-17 | Semantic Linting: 스택 감지 기반 lint 설정 자동 생성 | Medium | Pending | 신규 |
| FR-18 | `.foundry-x/` 메타데이터 JSON 저장 | Medium | Pending | |
| FR-19 | CLI 실행 로그 기록 (KPI K1 측정용) | Medium | Pending | |
| FR-20 | `--no-verify` 경고 + 로그 (KPI K2 측정용) | Medium | Pending | |
| FR-21 | `npx foundry-x init`으로 설치 없이 즉시 실행 | Medium | Pending | |
| FR-22 | CI workflow: `harness-sync-check.yml` 템플릿 | Low | Pending | 신규 |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | `init` Brownfield 실행 < 60초 (일반 리포 기준) | 5개 온보딩 리포에서 측정 |
| Performance | `sync` 실행 시간 < 30초 | CLI 실행 로그 |
| Performance | `status` 실행 시간 < 5초 | CLI 실행 로그 |
| Reliability | Plumb subprocess 실패 시 graceful fallback | 수동 테스트 |
| Reliability | `init` 멱등성 — 2회 실행 시 기존 커스터마이징 보존 | 자동 테스트 |
| Compatibility | Node.js 20 LTS, Python 3.10+ | CI 매트릭스 |
| Usability | 설치부터 첫 `init` 실행까지 5분 이내 | 온보딩 타이머 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 3개 커맨드 (init, sync, status) 모두 동작
- [ ] `init` Brownfield/Greenfield 분기 + 4단계 파이프라인 동작
- [ ] `init` 멱등성 검증 (2회 실행 시 기존 파일 보존)
- [ ] 하네스 산출물 6종 생성 확인 (CLAUDE.md, AGENTS.md, ARCHITECTURE.md, CONSTITUTION.md, progress.md, .plumb/)
- [ ] Plumb Bridge subprocess 래퍼 안정 동작
- [ ] `verify-harness.sh` + `check-sync.sh` 스크립트 동작
- [ ] 하네스 템플릿 2종 (default, kt-ds-sr) + lint 스택별 템플릿
- [ ] npm publish 완료
- [ ] CI harness-sync-check workflow 동작
- [ ] 내부 개발자 5명 온보딩 완료

### 4.2 Quality Criteria

- [ ] Unit test coverage ≥ 80%
- [ ] Zero lint errors (ESLint + Semantic Linting 원칙 적용)
- [ ] TypeScript strict mode + noUncheckedIndexedAccess
- [ ] CI (GitHub Actions) green

### 4.3 KPI Targets (Month 2~3 측정)

| KPI | Target | Kill Line |
|-----|--------|-----------|
| K1: CLI 주간 호출/사용자 | 10회+ | 사용률 30% 미만 |
| K2: `--no-verify` 우회 비율 | < 20% | — |
| K3: sync 후 수동 수정 파일 | 감소 추세 | — |
| K4: 결정 승인율 | > 70% | — |
| **K6: 하네스 무결성 통과율** | **> 95%** | — | **v4 신규** |

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Plumb 미성숙 — 실제 리포 규모에서 동작 불가 | Critical | Medium | Track B(TS 재구현) 대기. 전환 기준: Plumb 버그 장애 주 2회+ |
| 사용자 채택 실패 — 개발자가 pre-commit 훅 거부 | Critical | Medium | 5명 강제 온보딩, 주간 피드백, `--no-verify` 비율 모니터링 |
| **`init` 복잡도 증가 — 4단계 파이프라인이 4주 내 완성 불가** | **High** | **Medium** | **Sprint 1에 harness/ 모듈 집중 배치. Brownfield discover/analyze는 MVP 수준(주요 마커만 스캔)으로 축소** |
| **Brownfield merge 로직 — 기존 파일 손상 위험** | **High** | **Medium** | **멱등성 테스트 필수. merge 실패 시 skip+경고 (safe default)** |
| TS+Python 빌드 파이프라인 복잡도 | High | Medium | Turborepo TS 빌드 + Python 독립 빌드. Sprint 1 Week 1에 검증 |
| subprocess 오류 처리 미비 | High | Medium | timeout(30s), exit code 처리, stderr 캡처 |
| Phase 1→2 아키텍처 단절 | High | Low | packages/cli 핵심 모듈을 독립 패키지로 분리 설계 |
| Semantic Linting 메시지가 에이전트 자동 수정률을 높이지 못함 (A6) | Medium | Medium | Month 1~2에 자동 수정 성공률 측정 |
| progress.md 패턴이 컨텍스트 손실을 방지하지 못함 (A7) | Medium | Medium | Month 2에 세션 연속성 관찰 |

---

## 6. Architecture Considerations

### 6.1 Project Level: Dynamic

모노리포(pnpm workspace) + CLI + Python subprocess + harness 모듈 파이프라인.

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 런타임 | Node.js 20 LTS | npm 배포 안정성 |
| CLI 프레임워크 | Commander + Ink | 경량 + React TUI |
| Git 연동 | simple-git + octokit | 경량 + GitHub/GitLab API |
| SDD 엔진 | Plumb subprocess (Track A) | 즉시 실행, Track B 대기 |
| 모노리포 | pnpm + Turborepo | TS+Python 혼합 빌드 |
| 테스트 | Vitest | ESM 네이티브, 빠른 실행 |
| 배포 | npm publish | `npx foundry-x init` 즉시 시작 |
| Linter | ESLint + Prettier + TS strict | Semantic Linting 원칙 (v4) |

### 6.3 모노리포 구조 (PRD v4 §7.9)

```
foundry-x/
├── packages/
│   ├── cli/
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.ts          # Brownfield/Greenfield 분기
│   │   │   │   ├── sync.ts          # SDD 동기화 + progress.md
│   │   │   │   └── status.ts        # 상태 + 하네스 무결성
│   │   │   ├── harness/             # ★ v4 신규 모듈
│   │   │   │   ├── detect.ts        # Brownfield/Greenfield 감지
│   │   │   │   ├── discover.ts      # Phase 0: 스택 스캔
│   │   │   │   ├── analyze.ts       # Phase 1: 아키텍처 분석
│   │   │   │   ├── generate.ts      # Phase 2: 산출물 생성 (merge)
│   │   │   │   └── verify.ts        # Phase 3: 무결성 검증
│   │   │   ├── plumb/
│   │   │   │   └── bridge.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── shared/
│       └── package.json
├── templates/
│   ├── default/
│   │   ├── CLAUDE.md               # Harness Evolution Rules 포함
│   │   ├── AGENTS.md               # CLAUDE.md와 섹션 구조 동기화
│   │   ├── ARCHITECTURE.md         # ★ v4 신규
│   │   ├── CONSTITUTION.md         # ★ Always/Ask/Never 3계층
│   │   ├── progress.md             # ★ v4 신규
│   │   ├── specs/
│   │   └── .plumb/config.json
│   ├── lint/                       # ★ v4 신규
│   │   ├── eslint.config.ts.tmpl
│   │   ├── .ruff.toml.tmpl
│   │   └── golangci-lint.yml.tmpl
│   └── kt-ds-sr/
│       ├── CLAUDE.md
│       ├── CONSTITUTION.md         # SR 특화 Always/Ask/Never
│       └── specs/sr-template.md
├── scripts/                        # ★ v4 신규
│   ├── verify-harness.sh
│   └── check-sync.sh
├── .github/workflows/
│   ├── ci.yml
│   └── harness-sync-check.yml     # ★ v4 신규
├── docs/adr/
│   └── ADR-000-harness-bootstrap.md
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

### 6.4 `init` 4단계 파이프라인 (v4 핵심)

```
foundry-x init
    │
    ├── detect.ts: Brownfield or Greenfield?
    │   (package.json, go.mod, pom.xml 등 마커 파일 스캔)
    │   (--mode flag로 수동 지정 가능)
    │
    ├── [Brownfield]
    │   ├── Phase 0 (discover): 스택 스캔 → repo profile
    │   ├── Phase 1 (analyze):  아키텍처 패턴 심층 분석
    │   ├── Phase 2 (generate): 맞춤형 산출물 생성 (기존 파일 merge, 덮어쓰기 금지)
    │   └── Phase 3 (verify):   생성 파일 파싱·참조 커맨드 동작·내부 일관성 검증
    │
    └── [Greenfield]
        ├── 인터랙티브 질문 → 스택 선택
        ├── 디렉토리 구조 scaffolding
        └── Phase 1~3 실행 (동일)
```

---

## 7. Convention Prerequisites

### 7.1 Conventions to Define

| Category | To Define | Priority |
|----------|-----------|:--------:|
| Naming | camelCase(변수), PascalCase(타입), kebab-case(파일) | High |
| Folder structure | PRD v4 §7.9 확정 (harness/ 모듈 추가) | High |
| Error handling | PlumbBridge 에러 클래스 계층, graceful fallback | High |
| Linting | Semantic Linting 원칙: --fix 우선, 에러 메시지에 코드 예시 포함 | High |
| Import order | node builtins → external → internal → relative | Medium |

### 7.2 Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `FOUNDRY_X_PLUMB_TIMEOUT` | Plumb subprocess timeout (ms) | CLI |
| `FOUNDRY_X_LOG_DIR` | CLI 실행 로그 디렉토리 | CLI |
| `FOUNDRY_X_TEMPLATE_DIR` | 커스텀 템플릿 경로 | CLI |

---

## 8. Implementation Plan

### Sprint 1 (Week 1~2): 기반 + Harness 모듈 + PlumbBridge

| # | Task | Priority | Dependency | v4 |
|---|------|----------|------------|:---:|
| 1 | ADR-000: harness-bootstrap 선언 | High | Day 1 | 갱신 |
| 2 | 모노리포 scaffolding (pnpm + Turborepo) | High | — | |
| 3 | packages/shared: 공유 타입 정의 | High | #2 | |
| 4 | packages/cli: Commander + TS 뼈대 | High | #2 | |
| 5 | `harness/detect.ts` — Brownfield/Greenfield 감지 | High | #4 | 신규 |
| 6 | `harness/discover.ts` — 스택 스캔 (MVP: 주요 마커만) | High | #5 | 신규 |
| 7 | `harness/analyze.ts` — 아키텍처 분석 (MVP: 모듈/진입점 감지) | High | #6 | 신규 |
| 8 | `harness/generate.ts` — 산출물 생성 (merge 로직 + 멱등성) | High | #7 | 신규 |
| 9 | `harness/verify.ts` — 무결성 검증 | High | #8 | 신규 |
| 10 | PlumbBridge subprocess 래퍼 구현 | High | #4 | |
| 11 | subprocess 오류 처리 계약 문서화 | High | #10 | |
| 12 | TS+Python 빌드 파이프라인 검증 | Medium | #2 | |

### Sprint 2 (Week 3~4): 커맨드 + 템플릿 + 배포

| # | Task | Priority | Dependency | v4 |
|---|------|----------|------------|:---:|
| 13 | `commands/init.ts` — harness 파이프라인 통합 | High | #5~#9 | 갱신 |
| 14 | 템플릿 default: CLAUDE.md, AGENTS.md, ARCHITECTURE.md, CONSTITUTION.md, progress.md, .plumb/ | High | #13 | 확장 |
| 15 | 템플릿 kt-ds-sr: SR 특화 CONSTITUTION.md + specs/sr-template.md | High | #14 | 갱신 |
| 16 | 템플릿 lint/: eslint.config.ts.tmpl + .ruff.toml.tmpl | Medium | #14 | 신규 |
| 17 | `scripts/verify-harness.sh` + `scripts/check-sync.sh` | High | #14 | 신규 |
| 18 | `commands/sync.ts` + progress.md 업데이트 로직 | High | #10 | 갱신 |
| 19 | `commands/status.ts` + 하네스 무결성 표시 | High | #10, #17 | 갱신 |
| 20 | `.github/workflows/harness-sync-check.yml` 템플릿 | Medium | #17 | 신규 |
| 21 | `.foundry-x/` 메타데이터 + CLI 실행 로그 | Medium | #13, #18, #19 | |
| 22 | npm publish + npx 검증 | High | #13, #18, #19 | |
| 23 | 사용자 가이드 + 5명 온보딩 | High | #22 | |

### 리스크 대응: `init` 복잡도

v4에서 `init`의 복잡도가 크게 증가했어요. 4주 타임라인을 지키기 위한 MVP 전략:

| 모듈 | MVP 수준 | 풀 구현 (Month 2~3 피드백 기반) |
|------|---------|------------------------------|
| `detect.ts` | 프로젝트 마커 파일 5종만 검사 | 언어별 세분화 |
| `discover.ts` | package.json/go.mod/Pipfile 파싱 | CI/테스트 인프라까지 스캔 |
| `analyze.ts` | 디렉토리 구조 + 진입점만 감지 | 아키텍처 패턴 심층 분석 |
| `generate.ts` | 템플릿 복사 + 기본 merge (섹션 단위) | 필드 단위 merge + 커스터마이징 보존 |
| `verify.ts` | 파일 존재 여부 + JSON 파싱 검증 | 참조 커맨드 동작 검증 |

---

## 9. Next Steps

1. [ ] 이 Plan 문서 리뷰 및 승인
2. [ ] Design 문서 갱신 (`/pdca design foundry-x-cli` — v4 반영)
3. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-16 | Initial draft (PRD v3 기반) | AX BD팀 |
| **2.0** | **2026-03-16** | **PRD v4 반영: init 4단계 파이프라인, harness/ 모듈, ARCHITECTURE.md, CONSTITUTION.md 3계층, progress.md, verify-harness.sh, Semantic Linting, CI harness-sync-check. FR 9→22개, Sprint 재편** | **AX BD팀** |
