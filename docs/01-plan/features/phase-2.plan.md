---
code: FX-PLAN-006
title: Phase 2 — API Server + Web Dashboard + 인프라
version: 0.1
status: Draft
category: PLAN
system-version: 0.6.0
created: 2026-03-17
updated: 2026-03-17
author: Sinclair Seo
---

# Phase 2 Planning Document

> **Summary**: Phase 1 Go 판정 이후, API Server(Hono on Workers) + Web Dashboard(Next.js on Pages) + D1 데이터베이스 + JWT 인증을 구축하여 "Git이 진실, Foundry-X는 렌즈"의 웹 레이어를 완성한다.
>
> **Project**: Foundry-X
> **Version**: 0.6.0 ~ 0.9.0 (Sprint 6~9)
> **Author**: Sinclair Seo
> **Date**: 2026-03-17
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Phase 1 CLI는 개발자 전용이고, 팀 협업·에이전트 모니터링·비용 추적을 웹에서 할 수 없다. API는 프로토타입(mock 데이터)이고 DB·인증이 없어 실서비스 불가 |
| **Solution** | Cloudflare 인프라(D1+Workers+Pages) 위에 OpenAPI 계약 기반 API + shadcn/ui 웹 대시보드 + JWT 인증을 구축. Sprint 6(인프라)→7(실데이터)→8(고급기능)→9(오케스트레이션) 4단계 진행 |
| **Function/UX Effect** | 팀원이 웹에서 SDD Triangle 건강도, Agent 작업 현황, Token 비용을 실시간 확인하고, 비기술자도 Wiki를 통해 명세에 참여할 수 있다 |
| **Core Value** | "Git이 진실, Foundry-X는 렌즈" — CLI 렌즈(Phase 1) 위에 웹 렌즈(Phase 2)를 추가하여 조직 전체가 동일한 진실을 본다 |

---

## 1. Overview

### 1.1 Purpose

Phase 2는 Phase 1에서 완성한 CLI 도구(3개 커맨드 + 하네스 빌더)를 기반으로, **웹 기반 협업 레이어**를 추가하는 단계예요:

- **API Server**: Hono on Cloudflare Workers — Git 리포 데이터를 읽어 REST API로 제공
- **Web Dashboard**: Next.js 14 on Cloudflare Pages — 팀 대시보드, Wiki, 아키텍처 뷰, Agent 투명성
- **Database**: Cloudflare D1 (SQLite) — 메타데이터, 사용자, 세션, 토큰 사용량
- **Authentication**: JWT + RBAC (admin/member/viewer)

### 1.2 Background

- **Phase 1 성과**: CLI v0.5.0, F-item 36/36 DONE, PDCA 93~97%, Go 판정 (2026-03-17)
- **Phase 2 프로토타입**: Sprint 5A에서 API(15 endpoints) + Web(6 pages) 프레임워크 구축 완료
- **PRD 명세**: prd-v4.md §7.3~§8에 Phase 2 아키텍처/기술 스택/릴리스 정의

### 1.3 Phase 1 → Phase 2 기술 스택 변경

| 영역 | PRD 원안 | Phase 2 확정 | 변경 사유 |
|------|---------|-------------|-----------|
| DB | PostgreSQL 16 | **Cloudflare D1** (SQLite) | 서버리스, 운영 비용 0, 기존 D1 경험 활용 |
| Cache/Queue | Redis 7 + BullMQ | **Cloudflare KV + Queues** | Workers 생태계 통합, 별도 인프라 불필요 |
| API 런타임 | Node.js (Hono) | **Cloudflare Workers** (Hono) | Hono Workers 네이티브 지원, 글로벌 엣지 |
| Web 호스팅 | 미정 | **Cloudflare Pages** | SSR/SSG 지원, Workers 통합 |
| 인증 | JWT + RBAC | JWT + RBAC (변경 없음) | — |

> **ADR 후보**: D1(SQLite) 채택 → PostgreSQL 대비 JOIN 제한, max row 제한 존재. Phase 3에서 대규모 트래픽 시 Hyperdrive + 외부 PostgreSQL 전환 가능.

### 1.4 Related Documents

- PRD: [[FX-SPEC-PRD-V4]] (`docs/specs/prd-v4.md`)
- SPEC: [[FX-SPEC-001]] (`SPEC.md`)
- Sprint 5 Plan: [[FX-PLAN-005]] (`docs/01-plan/features/sprint-5.plan.md`)
- Sprint 5 Design: (`docs/02-design/features/sprint-5.design.md`)
- dev-transparency-spec: (`docs/specs/dev-transparency-spec.md`)

---

## 2. Scope

### 2.1 Phase 2 전체 범위

| Sprint | 테마 | F-items | 목표 버전 |
|:------:|------|---------|:---------:|
| Sprint 6 | 인프라 + 배포 기반 | F37~F40 | v0.6.0 |
| Sprint 7 | API 실데이터 + Web 고도화 | F41~F43 | v0.7.0 |
| Sprint 8 | 고급 기능 (NL→Spec, 실시간) | F44~F46 | v0.8.0 |
| Sprint 9 | 에이전트 오케스트레이션 | F47~F49 | v0.9.0 |

### 2.2 Sprint 6 — 인프라 + 배포 기반 (v0.6.0)

| F# | 제목 | REQ | Priority | 설명 |
|----|------|-----|:--------:|------|
| F37 | Cloudflare 배포 파이프라인 | FX-REQ-037 | P0 | Workers(API) + Pages(Web) + D1 프로비저닝, wrangler 설정, GitHub Actions CI/CD |
| F38 | OpenAPI 3.1 계약서 + API 리팩토링 | FX-REQ-038 | P1 | 15개 endpoint OpenAPI 스펙 작성, Hono OpenAPI 미들웨어, 요청/응답 타입 자동 생성 |
| F39 | D1 스키마 + Drizzle ORM | FX-REQ-039 | P1 | users, projects, wiki_pages, token_usage, agent_sessions 테이블, 마이그레이션 |
| F40 | JWT 인증 + RBAC 미들웨어 | FX-REQ-040 | P1 | signup/login, JWT(Access 1h + Refresh 7d), RBAC(admin/member/viewer), Hono 미들웨어 |

### 2.3 Sprint 7 — API 실데이터 + Web 고도화 (v0.7.0)

| F# | 제목 | REQ | Priority | 설명 |
|----|------|-----|:--------:|------|
| F41 | API 엔드포인트 실데이터 연결 | FX-REQ-041 | P1 | 기존 15개 endpoint를 D1 + Git 실데이터로 전환, data-reader 리팩토링 |
| F42 | shadcn/ui + 웹 컴포넌트 고도화 | FX-REQ-042 | P1 | shadcn/ui 도입, 인라인 컴포넌트 분리, 반응형, 다크모드 |
| F43 | API + Web 테스트 스위트 | FX-REQ-043 | P1 | API: Hono test helper + D1 mock, Web: React Testing Library, E2E: Playwright |

### 2.4 Sprint 8 — 고급 기능 (v0.8.0)

| F# | 제목 | REQ | Priority | 설명 |
|----|------|-----|:--------:|------|
| F44 | SSE 실시간 통신 + Git↔D1 정합성 | FX-REQ-044 | P1 | Agent 상태 SSE 스트림, Git→D1 reconciliation (Cron Trigger 5분 주기) |
| F45 | NL→Spec 변환 레이어 | FX-REQ-045 | P2 | LLM 연동 (Claude API), 자연어→Spec Markdown 초안, human-in-the-loop 승인 UI |
| F46 | Wiki Git 동기화 | FX-REQ-046 | P2 | 웹에서 수정한 Wiki를 Git에 자동 커밋, 충돌 감지 + 수동 해결 UI |

### 2.5 Sprint 9 — 에이전트 오케스트레이션 (v0.9.0)

| F# | 제목 | REQ | Priority | 설명 |
|----|------|-----|:--------:|------|
| F47 | 에이전트 병렬 작업 프로토타입 | FX-REQ-047 | P1 | 에이전트별 feature branch 자동 생성, 작업 상태 추적, D1 세션 테이블 |
| F48 | 브랜치 기반 충돌 해결 | FX-REQ-048 | P2 | 자동 rebase(최대 3회), 실패 시 human escalation, PR 라벨 자동 부여 |
| F49 | 에이전트 대시보드 고도화 | FX-REQ-049 | P2 | 실시간 에이전트 모니터링, 작업 할당 UI, 비용 경고 알림 |

### 2.6 Out of Scope (Phase 3+)

- 멀티테넌시 (조직 단위 격리)
- 외부 도구 연동 (Jira, Slack)
- MCP(Model Context Protocol) 지원
- 외부 고객사 파일럿

---

## 3. Architecture Decisions

### 3.1 Cloudflare 인프라 아키텍처

```
┌─────────────────────────────────────────────────┐
│  Cloudflare Edge Network                         │
│                                                  │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │ Pages       │  │ Workers                  │  │
│  │ (Next.js)   │  │ (Hono API)               │  │
│  │             │  │  ├── /api/auth/*          │  │
│  │ ─ SSR/SSG   │  │  ├── /api/wiki/*          │  │
│  │ ─ shadcn/ui │  │  ├── /api/agents/*        │  │
│  │ ─ Zustand   │  │  ├── /api/tokens/*        │  │
│  └──────┬──────┘  │  └── JWT middleware        │  │
│         │ fetch   └──────────┬───────────────┘  │
│         └────────────────────┤                   │
│                    ┌─────────┼─────────┐        │
│                    │ D1      │ KV      │        │
│                    │(SQLite) │(Cache)  │        │
│                    └─────────┘─────────┘        │
│                                                  │
│  ┌─────────────┐  ┌────────────────┐            │
│  │ Queues      │  │ Cron Triggers  │            │
│  │ (async job) │  │ (reconcile)    │            │
│  └─────────────┘  └────────────────┘            │
└─────────────────────────────────────────────────┘
         ↕ Git API (octokit)
┌─────────────────┐
│ GitHub (SSOT)   │
│ Git Repository  │
└─────────────────┘
```

### 3.2 D1 스키마 (초안)

```sql
-- users (인증 + RBAC)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK(role IN ('admin','member','viewer')),
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- projects (Git 리포 연결)
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  owner_id TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- wiki_pages (Wiki CRUD + Git 동기화)
CREATE TABLE wiki_pages (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  ownership_marker TEXT DEFAULT 'human',
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- token_usage (비용 추적)
CREATE TABLE token_usage (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  agent_name TEXT,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  recorded_at TEXT DEFAULT (datetime('now'))
);

-- agent_sessions (에이전트 작업 추적)
CREATE TABLE agent_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  agent_name TEXT NOT NULL,
  branch TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','failed','escalated')),
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT
);
```

### 3.3 OpenAPI 계약 원칙

- Hono OpenAPI(`@hono/zod-openapi`) 사용 — 런타임 검증 + 스펙 자동 생성
- 요청/응답 타입은 Zod 스키마에서 추출 → packages/shared에 export
- Swagger UI를 `/api/docs`에 자동 마운트
- API 변경 시 OpenAPI 스펙 변경이 선행 (Contract-First)

### 3.4 인증 흐름

```
POST /api/auth/signup → { email, password, name } → JWT pair
POST /api/auth/login  → { email, password }        → JWT pair
POST /api/auth/refresh → { refreshToken }           → new JWT pair

JWT 구조:
  Access Token  (1h): { sub, email, role, projectIds }
  Refresh Token (7d): { sub, jti }

미들웨어:
  authMiddleware → JWT 검증 → c.set('user', decoded)
  rbacMiddleware('admin') → role 검증
```

---

## 4. Implementation Plan

### 4.1 Sprint 6 상세 (인프라, v0.6.0)

```
Week 1: 배포 파이프라인 + DB
├── F37-1: wrangler.toml 설정 (Workers + D1 바인딩)
├── F37-2: GitHub Actions — Workers deploy + Pages deploy
├── F39-1: Drizzle ORM 설정 + D1 어댑터
├── F39-2: 마이그레이션 5개 테이블 생성
└── F39-3: seed 데이터 + 로컬 D1 테스트

Week 2: OpenAPI + 인증
├── F38-1: @hono/zod-openapi 도입 + 기존 route 전환
├── F38-2: Zod 스키마 → 타입 자동 생성 파이프라인
├── F40-1: auth 라우트 (signup/login/refresh)
├── F40-2: JWT 미들웨어 + RBAC 미들웨어
└── F40-3: API 테스트 (auth flow)
```

### 4.2 Sprint 7 상세 (실데이터 + UI, v0.7.0)

```
Week 3: API 실데이터 연결
├── F41-1: data-reader → D1 + Git 이중 소스 리팩토링
├── F41-2: wiki, requirements, freshness → D1 연결
├── F41-3: profile, integrity → Git 직접 읽기 유지
└── F43-1: API 테스트 스위트 (Hono test helper + D1 mock)

Week 4: Web 고도화
├── F42-1: shadcn/ui 설치 + 디자인 토큰
├── F42-2: 인라인 컴포넌트 → shadcn 기반 분리
├── F42-3: 반응형 레이아웃 + 다크모드
└── F43-2: Web 테스트 (React Testing Library)
```

### 4.3 Sprint 8 상세 (고급 기능, v0.8.0)

```
Week 5: 실시간 + 정합성
├── F44-1: SSE 엔드포인트 (Agent 상태 스트림)
├── F44-2: Git→D1 reconciliation (Cron Trigger 5분)
├── F44-3: 불일치 리포트 + 감사 로그
└── F46-1: Wiki Git 커밋 동기화

Week 6: NL→Spec
├── F45-1: Claude API 연동 레이어
├── F45-2: NL→Spec 변환 + 초안 미리보기 UI
├── F45-3: human-in-the-loop 승인 워크플로우
└── F46-2: Wiki 충돌 감지 + 해결 UI
```

### 4.4 Sprint 9 상세 (오케스트레이션, v0.9.0)

```
Week 7-8: 에이전트 오케스트레이션
├── F47-1: 에이전트 세션 생성 + feature branch 자동화
├── F47-2: 작업 상태 추적 (D1 + SSE)
├── F48-1: 자동 rebase (최대 3회) + escalation
├── F48-2: PR 라벨 자동 부여 + SDD 검증 게이트
├── F49-1: 에이전트 모니터링 대시보드 고도화
└── F49-2: 비용 경고 + 할당 UI
```

---

## 5. Risk & Mitigation

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| R1 | D1 SQLite 제약 (JOIN 성능, row 크기 한계) | 복잡 쿼리 성능 저하 | 단순 스키마 설계 + 필요 시 Hyperdrive 전환 |
| R2 | Workers 무상태 + 10ms CPU 제한 (Free) | 무거운 Git 분석 불가 | Git 분석은 Cron Trigger/Queue로 비동기 처리 |
| R3 | NL→Spec LLM 비용 | Token 비용 증가 | 비용 상한 설정 + Fallback 모델 (haiku) |
| R4 | 에이전트 오케스트레이션 복잡도 | 충돌 해결 실패 확률 | Phase 2 후반 착수, 단순 브랜치 격리부터 시작 |
| R5 | 1인 개발 병목 | 4 스프린트 일정 초과 | 스프린트당 핵심 2~3개 F-item에 집중, 나머지 이관 |

---

## 6. Success Criteria

### Phase 2 전체

| 지표 | 목표 | 측정 |
|------|------|------|
| 웹 대시보드 DAU | 3명+ (팀원 합류 기준) | Cloudflare Analytics |
| API 응답 시간 | p95 < 500ms | Workers Analytics |
| SDD Triangle 동기화 | 자동 감지 + 알림 | status API |
| 에이전트 자동 rebase 성공률 | > 80% | agent_sessions 테이블 |
| NL→Spec 승인율 | > 70% | 승인/거부 로그 |

### Sprint 6 완료 기준

- [ ] Cloudflare Workers + Pages 배포 성공
- [ ] D1 5개 테이블 생성 + 마이그레이션 적용
- [ ] OpenAPI 3.1 스펙 자동 생성 (`/api/docs`)
- [ ] JWT signup/login/refresh 동작
- [ ] RBAC 미들웨어 admin/member/viewer 검증
- [ ] API 테스트 커버리지 > 80%

---

## 7. Dependencies

| 의존성 | 상태 | 비고 |
|--------|:----:|------|
| Cloudflare 계정 | ✅ | 기존 사용 중 |
| D1 데이터베이스 생성 | 📋 | `wrangler d1 create` |
| Anthropic API Key (NL→Spec) | 📋 | Sprint 8에서 필요 |
| GitHub PAT (Git API) | ✅ | 기존 .git/.credentials |
| 팀원 온보딩 | 📋 | Phase 2 중반 이후 |

---

## 8. Open Questions (Phase 2)

| # | Question | Owner | Deadline |
|---|----------|-------|----------|
| Q2 | 에이전트 오케스트레이션 프로토콜 (MCP vs REST) | 아키텍트 | Sprint 9 전 |
| Q3 | 외부 파트너/SI 범위 및 역할 분담 | PM | Phase 2 후반 |
| Q7 | D1 → PostgreSQL(Hyperdrive) 전환 기준 | 아키텍트 | Sprint 8 |
| Q8 | NL→Spec 변환에 사용할 LLM 모델 선정 | 아키텍트 | Sprint 8 전 |
| Q9 | Cloudflare Workers Paid plan 필요 시점 | PM | Sprint 7 |
