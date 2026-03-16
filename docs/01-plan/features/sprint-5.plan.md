---
code: FX-PLAN-005
title: Sprint 5 (v0.5.0) — Frontend Design + 하네스 산출물 확장
version: 0.1
status: Draft
category: PLAN
system-version: 0.5.0
created: 2026-03-17
updated: 2026-03-17
author: Sinclair Seo
---

# Sprint 5 (v0.5.0) Planning Document

> **Summary**: 팀 협업 웹 대시보드(Frontend Design)와 CLI 하네스 산출물의 동적 생성을 병합한 대규모 스프린트. Phase 2 진입 + Phase 1 CLI 완성도 향상을 동시 추진.
>
> **Project**: Foundry-X
> **Version**: 0.5.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-17
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 팀이 공동 목표와 현황을 공유할 수단이 없고, CLI init이 생성하는 하네스 문서가 정적 플레이스홀더여서 실용성이 낮다 |
| **Solution** | Part A: Next.js 기반 웹 대시보드 (팀 현황, Wiki, 아키텍처 뷰, 개인 워크스페이스, Agent 투명성, Token 관리) + Part B: RepoProfile 기반 하네스 산출물 동적 생성 |
| **Function/UX Effect** | 웹에서 팀 목표·Agent 상태·비용을 한눈에 확인하고, CLI init 실행 시 프로젝트에 맞는 정확한 문서가 자동 생성된다 |
| **Core Value** | "Git이 진실, Foundry-X는 렌즈" — 웹 렌즈(Part A)와 문서 렌즈(Part B) 양축 완성 |

---

## 1. Overview

### 1.1 Purpose

Sprint 5는 두 가지 트랙을 병합한 대규모 스프린트예요:

**Part A — Frontend Design (F26~F31)**: Phase 2 웹 대시보드의 첫 번째 스프린트. 팀이 공동 목표를 인지하고 현황을 공유하며, 사람과 Agent가 동등한 동료로 협업하는 화면을 구축해요.

**Part B — 하네스 산출물 확장 (F32~F36)**: Phase 1 CLI의 완성도를 높이는 작업. `foundry-x init`이 생성하는 ARCHITECTURE.md, CONSTITUTION.md 등을 RepoProfile 기반으로 동적 생성하여 실용성을 확보해요.

### 1.2 Background

**Part A 배경:**
- PRD v4 §5: Phase 2 = API Server(Hono) + Web Dashboard(Next.js)
- 팀 요구: 정보 공유화, 개인 업무 공간, Agent 가시성, Token 비용 관리
- dev-transparency-spec.md: GitHub Projects + Wiki + Discussions 스펙 존재

**Part B 배경:**
- PRD v4 §7.2: ARCHITECTURE.md, CONSTITUTION.md, CLAUDE.md 산출물 명세
- Sprint 1-4에서 harness 파이프라인(detect→discover→analyze→generate→verify) 완성
- 남은 과제: generate 단계에서 RepoProfile 데이터를 산출물에 실질적으로 반영

### 1.3 Related Documents

- PRD: [[FX-SPEC-PRD-V4]] (`docs/specs/prd-v4.md`)
- dev-transparency-spec: (`docs/specs/dev-transparency-spec.md`)
- Sprint 4 Plan: [[FX-PLAN-004]] (`docs/01-plan/features/sprint-4.plan.md`)
- SPEC: [[FX-SPEC-001]] (`SPEC.md`)

---

## 2. Scope

### 2.1 Part A — Frontend Design (F26~F31)

| F# | 제목 | 설명 |
|----|------|------|
| F26 | 팀 정보 공유 대시보드 | 공동 목표 인지 + 현재 현황 공유 화면 |
| F27 | Human Readable Document + Wiki | Git 문서 뷰어 + Wiki 시스템 구성 |
| F28 | 아키텍처 뷰 | 아키텍처 도식화, BluePrint, Roadmap, ChangeLog, Version, 요구사항 관리(백로그→협의→계획 전환) |
| F29 | 개인 워크스페이스 | ToDo List, Message box, Setting 등 개인별 업무 공간 |
| F30 | Agent 투명성 뷰 | Agent가 무엇을/어떻게 하고 있는지, 어떻게 요청해야 하는지 시각화 |
| F31 | Token/비용 관리 | API 비용 처리, LLM service Fallback 시스템, AI Gateway 관리 |

### 2.2 Part B — 하네스 산출물 확장 (F32~F36)

| F# | 제목 | 설명 |
|----|------|------|
| F32 | 동적 ARCHITECTURE.md 생성 | RepoProfile 기반 모듈 맵, 레이어 구조, 진입점 |
| F33 | 동적 CONSTITUTION.md 생성 | 스택별 맞춤 Always/Ask/Never 경계 규칙 |
| F34 | 동적 CLAUDE.md + AGENTS.md 생성 | 빌드/테스트/린트 커맨드 자동 감지·기입 |
| F35 | verify.ts 강화 | 플레이스홀더 잔존 감지 + 모듈 맵 일관성 검증 |
| F36 | 하네스 신선도 검사 | status에서 하네스 문서 갱신 시점 vs 코드 변경 시점 비교 |

### 2.3 Out of Scope

- PostgreSQL/Redis 인프라 구축 (Phase 2 후반)
- Greenfield 인터랙티브 질문 UI
- NL→Spec 변환 레이어
- Git hook 자동 설치
- kt-ds-sr 템플릿 동적 생성 (default 우선)

---

## 3. Requirements

### 3.1 Part A — Frontend Design Functional Requirements

| ID | Requirement | Priority | F# |
|----|-------------|:--------:|:--:|
| FR-A01 | 팀 현황 대시보드에서 프로젝트 목표·스프린트 상태·팀원 활동을 한눈에 볼 수 있다 | High | F26 |
| FR-A02 | Git 기반 문서를 Human Readable 형태로 렌더링하는 뷰어가 있다 | High | F27 |
| FR-A03 | Wiki를 CRUD(생성/조회/수정/삭제)할 수 있고 Git에 동기화된다 | High | F27 |
| FR-A04 | 아키텍처 다이어그램을 Mermaid 기반으로 시각화한다 | High | F28 |
| FR-A05 | BluePrint, Roadmap, ChangeLog, Version 정보를 조회할 수 있다 | High | F28 |
| FR-A06 | 요구사항(백로그)을 등록하고 협의→계획으로 상태 전환할 수 있다 | High | F28 |
| FR-A07 | 개인별 ToDo List를 CRUD할 수 있다 | High | F29 |
| FR-A08 | 팀원 간 Message를 주고받을 수 있다 | Medium | F29 |
| FR-A09 | 개인 설정(테마, 알림 등)을 저장·복원할 수 있다 | Medium | F29 |
| FR-A10 | Agent의 현재 작업 상태(실행 중/대기/완료)를 실시간으로 확인할 수 있다 | High | F30 |
| FR-A11 | Agent에게 작업을 요청하는 인터페이스가 있다 | High | F30 |
| FR-A12 | API 호출 비용을 모델/기간별로 조회·집계할 수 있다 | High | F31 |
| FR-A13 | LLM 서비스 장애 시 Fallback 전환이 자동으로 이루어진다 | Medium | F31 |
| FR-A14 | AI Gateway를 통해 API 키/라우팅/rate limit를 관리할 수 있다 | Medium | F31 |

### 3.2 Part B — 하네스 확장 Functional Requirements

| ID | Requirement | Priority | F# |
|----|-------------|:--------:|:--:|
| FR-B01 | ARCHITECTURE.md에 모듈 맵이 RepoProfile.modules 데이터로 채워진다 | High | F32 |
| FR-B02 | ARCHITECTURE.md에 레이어 구조가 architecturePattern에 따라 생성된다 | High | F32 |
| FR-B03 | ARCHITECTURE.md에 진입점 목록이 RepoProfile.entryPoints로 채워진다 | High | F32 |
| FR-B04 | CONSTITUTION.md의 Always/Ask/Never 섹션에 스택별 맞춤 규칙이 추가된다 | High | F33 |
| FR-B05 | CLAUDE.md Commands 섹션에 감지된 빌드/테스트/린트 커맨드가 자동 기입된다 | High | F34 |
| FR-B06 | AGENTS.md에 프로젝트 아키텍처 요약과 워크플로우가 프로필 기반으로 채워진다 | Medium | F34 |
| FR-B07 | verify.ts가 플레이스홀더 잔존을 WARN으로 검출한다 | High | F35 |
| FR-B08 | verify.ts가 ARCHITECTURE.md 모듈 맵과 실제 구조의 일관성을 검증한다 | Medium | F35 |
| FR-B09 | `foundry-x status`가 하네스 파일의 신선도(마지막 수정일 vs 코드 커밋일)를 표시한다 | Medium | F36 |

### 3.3 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Performance | 대시보드 초기 로딩 < 2초 | Lighthouse |
| Performance | CLI init 실행 < 3초 (기존과 동일) | `time foundry-x init` |
| Accessibility | 웹 WCAG 2.1 AA 준수 | axe-core |
| Idempotency | 동적 생성 후 재실행 시 기존 커스터마이징 보존 | 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] F26~F36 모든 기능 구현 완료
- [ ] 기존 71개 + 신규 테스트 전부 통과
- [ ] typecheck ✅ lint ✅ build ✅
- [ ] PDCA Gap Analysis Match Rate ≥ 90%

### 4.2 Quality Criteria

- [ ] 기존 테스트 71개 regression 없음
- [ ] 신규 기능 테스트 커버리지 > 80%
- [ ] lint 0 error
- [ ] 웹 대시보드 Lighthouse Performance > 80

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Phase 2 기술 스택(Next.js + Hono) 초기 설정 복잡도 | High | Medium | 모노리포 내 packages/web, packages/api로 분리 → 점진적 추가 |
| 웹 + CLI 양쪽 동시 개발 시 리소스 분산 | High | High | Part A/B를 sub-sprint로 분리, Part B 우선 완료 후 Part A 착수 |
| Agent 상태 실시간 모니터링의 기술적 난이도 | Medium | Medium | WebSocket 대신 SSE(Server-Sent Events) 우선 적용 |
| Token 비용 관리 API 통합 복잡도 | Medium | Medium | 단일 LLM 프로바이더(Anthropic) 우선, multi-provider는 후속 |
| 동적 생성이 기존 사용자 커스터마이징을 덮어쓸 수 있음 | High | Medium | mergeMarkdown() 기존 로직 활용 — 사용자 섹션 보존 |
| 복잡한 모노리포에서 의존성 추론 부정확 | Medium | Medium | 기본 추론만 제공 + 폴백, 오탐보다 미탐 |

---

## 6. Architecture Considerations

### 6.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | **✅** |

### 6.2 Tech Stack Addition (Phase 2)

| 영역 | 기술 | 비고 |
|------|------|------|
| Web Dashboard | Next.js 14, shadcn/ui, Zustand | PRD v4 확정 |
| API Server | Hono, Drizzle ORM | Phase 2 |
| DB | PostgreSQL | Phase 2 |
| 실시간 통신 | SSE (Server-Sent Events) | WebSocket은 후순위 |
| AI Gateway | Cloudflare AI Gateway 또는 자체 프록시 | Token 관리용 |

### 6.3 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Web 프레임워크 | Next.js / Remix / SPA | Next.js 14 App Router | PRD v4 확정, shadcn/ui 생태계 |
| 상태 관리 | Zustand / Redux / Jotai | Zustand | 경량, PRD 확정 |
| API 서버 | Hono / Express / Fastify | Hono | Edge 지원, TS-first, PRD 확정 |
| Agent 상태 전달 | WebSocket / SSE / Polling | SSE | 단방향 충분, 구현 단순 |
| 하네스 Builder 방식 | 템플릿 변수 확장 / 전용 builder 함수 | 전용 builder | 복잡한 조건 분기 처리 |
| Builder 위치 | generate.ts 내부 / 별도 builders/ | builders/ 분리 | 테스트 용이성, 단일 책임 |

### 6.4 Part A — 모노리포 확장 구조

```
foundry-x/
├── packages/
│   ├── cli/                # (기존) CLI
│   ├── shared/             # (기존) 공유 타입
│   ├── web/                # (신규) Next.js 14 대시보드
│   │   ├── src/
│   │   │   ├── app/        # App Router
│   │   │   ├── components/ # shadcn/ui 기반
│   │   │   └── lib/        # API client, stores
│   │   └── package.json
│   └── api/                # (신규) Hono API 서버
│       ├── src/
│       │   ├── routes/     # REST endpoints
│       │   ├── services/   # business logic
│       │   └── db/         # Drizzle schema
│       └── package.json
```

### 6.5 Part B — CLI 하네스 확장 구조

```
packages/cli/src/harness/
├── detect.ts               # (기존) Brownfield/Greenfield
├── discover.ts             # (기존 + 확장) scripts 감지 추가
├── analyze.ts              # (기존) 아키텍처 분석
├── generate.ts             # (기존 + 확장) builder 호출 추가
├── verify.ts               # (기존 + 확장) 플레이스홀더/일관성 검증
├── builders/               # (신규) 동적 산출물 builder
│   ├── architecture-builder.ts
│   ├── constitution-builder.ts
│   ├── claude-builder.ts
│   └── agents-builder.ts
└── merge-utils.ts          # (기존) Markdown/JSON merge
```

---

## 7. Convention Prerequisites

### 7.1 Existing Conventions

- [x] TSX 컴포넌트: PascalCase 파일명
- [x] 테스트: co-located `*.test.ts(x)`
- [x] eslint flat config
- [x] 로직/렌더링 분리 패턴

### 7.2 New Conventions

| Category | Convention | Priority |
|----------|-----------|:--------:|
| Web 컴포넌트 | shadcn/ui 기반, `components/ui/` + `components/feature/` 분리 | High |
| API 라우트 | `routes/{resource}.ts` — RESTful naming | High |
| Builder 패턴 | `(profile: RepoProfile) => string` 시그니처 통일 | High |
| 상태 관리 | Zustand store는 `lib/stores/{name}.ts` | Medium |

---

## 8. Implementation Plan

### Phase A: 모노리포 확장 + 하네스 기반 (Week 1)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 1 | packages/web scaffolding (Next.js 14 + shadcn/ui) | F26 |
| 2 | packages/api scaffolding (Hono + Drizzle) | F26 |
| 3 | Turbo 파이프라인 확장 (web, api 빌드/테스트) | — |
| 4 | discover.ts scripts 감지 + RepoProfile 타입 확장 | F32 |
| 5 | architecture-builder.ts — 모듈 맵 동적 생성 | F32 |
| 6 | claude-builder.ts — 커맨드 자동 기입 | F34 |

### Phase B: 핵심 뷰 구현 + 하네스 스택 인식 (Week 2)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 7 | 팀 대시보드 페이지 (프로젝트 목표 + 스프린트 현황) | F26 |
| 8 | 문서 뷰어 (Markdown 렌더링) + Wiki CRUD | F27 |
| 9 | constitution-builder.ts — 스택별 경계 규칙 | F33 |
| 10 | agents-builder.ts — 프로필 기반 워크플로우 | F34 |
| 11 | generate.ts builder 호출 통합 | F32~F34 |

### Phase C: 고급 뷰 + 검증 강화 (Week 3)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 12 | 아키텍처 뷰 (Mermaid 다이어그램 + BluePrint) | F28 |
| 13 | Roadmap + ChangeLog + Version 뷰 | F28 |
| 14 | 요구사항 관리 (백로그→협의→계획 전환 UI) | F28 |
| 15 | 개인 워크스페이스 (ToDo + Message + Setting) | F29 |
| 16 | verify.ts 플레이스홀더 감지 + 일관성 검증 | F35 |

### Phase D: Agent + Token + 신선도 (Week 4)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 17 | Agent 투명성 뷰 (작업 상태 SSE + 요청 인터페이스) | F30 |
| 18 | Token/비용 관리 (API 비용 집계 + Fallback) | F31 |
| 19 | AI Gateway 관리 UI | F31 |
| 20 | 하네스 신선도 검사 (status 표시) | F36 |

### Phase E: 테스트 + 안정화 (Week 4-5)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 21 | Part A 웹 컴포넌트 테스트 | — |
| 22 | Part A API 엔드포인트 테스트 | — |
| 23 | Part B Builder 단위 테스트 + verify 테스트 | — |
| 24 | 기존 71개 테스트 regression 확인 | — |
| 25 | 전체 통합 검증 + v0.5.0 버전 범프 | — |

---

## 9. F-items Summary

### Part A — Frontend Design

| F# | 제목 | REQ | Priority | Phase |
|----|------|-----|:--------:|:-----:|
| F26 | 팀 정보 공유 대시보드 | FX-REQ-026 | P1 | A, B |
| F27 | Human Readable Document + Wiki | FX-REQ-027 | P1 | B |
| F28 | 아키텍처 뷰 | FX-REQ-028 | P1 | C |
| F29 | 개인 워크스페이스 | FX-REQ-029 | P1 | C |
| F30 | Agent 투명성 뷰 | FX-REQ-030 | P1 | D |
| F31 | Token/비용 관리 | FX-REQ-031 | P1 | D |

### Part B — 하네스 산출물 확장

| F# | 제목 | REQ | Priority | Phase |
|----|------|-----|:--------:|:-----:|
| F32 | 동적 ARCHITECTURE.md 생성 | FX-REQ-032 | P1 | A |
| F33 | 동적 CONSTITUTION.md 생성 | FX-REQ-033 | P1 | B |
| F34 | 동적 CLAUDE.md + AGENTS.md 생성 | FX-REQ-034 | P1 | A, B |
| F35 | verify.ts 강화 | FX-REQ-035 | P1 | C |
| F36 | 하네스 신선도 검사 | FX-REQ-036 | P2 | D |

**예상 총 변경**: Part A ~3,000+ LOC (신규 패키지), Part B ~500 LOC (기존 패키지 확장)

---

## 10. Next Steps

1. [ ] Design 문서 작성 (`sprint-5.design.md`) — Part A/B 상세 설계
2. [ ] 구현 착수
3. [ ] Gap Analysis

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-17 | Initial draft — Frontend Design(F26~F31) + 하네스 확장(F32~F36) 병합 | Sinclair Seo |
