---
code: FX-PLAN-007
title: Sprint 7 (v0.7.0) — OpenAPI 전환 + API 실데이터 + Web 고도화
version: 0.1
status: Draft
category: PLAN
system-version: 0.7.0
created: 2026-03-17
updated: 2026-03-17
author: Sinclair Seo
---

# Sprint 7 (v0.7.0) Planning Document

> **Summary**: Sprint 6에서 구축한 Cloudflare 인프라(D1+Workers+JWT)를 기반으로, API를 OpenAPI 계약 기반으로 전환하고 mock→실데이터로 연결하며, 웹 대시보드를 shadcn/ui로 고도화한다.
>
> **Project**: Foundry-X
> **Version**: 0.7.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-17
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | API가 mock 데이터를 반환하고 OpenAPI 스펙이 없어 프론트엔드 연동이 수동이며, 웹 컴포넌트가 인라인 스타일이라 유지보수·일관성이 떨어진다 |
| **Solution** | F38: 9개 라우트를 `@hono/zod-openapi` createRoute 패턴으로 전환 + F41: data-reader를 D1 쿼리로 리팩토링 + F42: shadcn/ui 디자인 시스템 + F43: API·Web 테스트 스위트 |
| **Function/UX Effect** | `/api/docs`에서 인터랙티브 API 문서 확인, 실제 D1 데이터로 대시보드 동작, 일관된 UI 컴포넌트와 다크모드 지원 |
| **Core Value** | 프로토타입(Phase 1 프론트엔드 + Sprint 6 인프라)을 실서비스 수준으로 끌어올려 팀원 온보딩이 가능한 상태로 만든다 |

---

## 1. Overview

### 1.1 Purpose

Sprint 7은 Sprint 6에서 구축한 인프라를 **실서비스 수준**으로 끌어올리는 스프린트예요:

- **F38 OpenAPI 전환**: 정적 JSON → Zod 스키마 기반 자동 생성, 런타임 타입 검증
- **F41 실데이터 연동**: data-reader.ts의 mock → D1 쿼리 + GitHub API
- **F42 Web 고도화**: 인라인 컴포넌트 → shadcn/ui 기반, 반응형 + 다크모드
- **F43 테스트 스위트**: API(Hono test helper + D1 mock) + Web(React Testing Library)

### 1.2 Background

- **Sprint 6 성과**: Cloudflare Workers 배포 + D1 6테이블 + JWT 인증 + RBAC (Match Rate 84%)
- **현재 한계**:
  - API: OpenAPI 스펙 없음 (Swagger UI는 빈 태그만 표시), data-reader가 하드코딩 mock
  - Web: 인라인 스타일, 디자인 시스템 없음, API client가 mock 호출
- **세션 #19**: D1 프로덕션 DB 생성 + Workers 실배포 검증 완료 (`foundry-x-api.ktds-axbd.workers.dev`)

### 1.3 Prerequisites (Sprint 6 완료 항목)

| 항목 | 상태 | 비고 |
|------|:----:|------|
| Cloudflare Workers 배포 | ✅ | `foundry-x-api.ktds-axbd.workers.dev` |
| D1 데이터베이스 (6테이블) | ✅ | `foundry-x-db` (APAC/ICN) |
| JWT 인증 + RBAC | ✅ | signup/login/refresh 동작 확인 |
| GitHub Actions CI/CD | ✅ | CLOUDFLARE_API_TOKEN Secret 등록 |
| wrangler.toml + nodejs_compat | ✅ | 세션 #19 |

### 1.4 Related Documents

- Phase 2 Plan: [[FX-PLAN-006]] (`docs/01-plan/features/phase-2.plan.md`)
- Phase 2 Design: [[FX-DSGN-006]] (`docs/02-design/features/phase-2.design.md`)
- Sprint 6 Analysis: (`docs/03-analysis/features/phase-2.analysis.md`)
- SPEC: [[FX-SPEC-001]] (`SPEC.md`)
- PRD: [[FX-SPEC-PRD-V4]] (`docs/specs/prd-v4.md`)

---

## 2. Scope

### 2.1 F-items

| F# | 제목 | REQ | Priority | 설명 | 예상 |
|----|------|-----|:--------:|------|:----:|
| F38 | OpenAPI 3.1 계약서 + API 리팩토링 | FX-REQ-038 | P0 | 9개 라우트 → `createRoute()` + Zod 스키마, 자동 스펙 생성 | 6h |
| F41 | API 엔드포인트 실데이터 연결 | FX-REQ-041 | P0 | data-reader → D1 쿼리, wiki CRUD, token/agent 조회 | 8h |
| F42 | shadcn/ui + 웹 컴포넌트 고도화 | FX-REQ-042 | P1 | shadcn/ui 도입, 컴포넌트 분리, 반응형, 다크모드 | 6h |
| F43 | API + Web 테스트 스위트 | FX-REQ-043 | P1 | Hono test helper, D1 mock, React Testing Library | 4h |

**총 예상**: 24h (1인 기준, 3~4 세션)

### 2.2 F38 — OpenAPI 3.1 계약서 + API 리팩토링

**현재 상태** (Sprint 6 Match 15%):
- `@hono/zod-openapi`, `@hono/swagger-ui` 패키지 설치 ✅
- Swagger UI `/api/docs` 마운트 ✅ (빈 스펙)
- 정적 `openapi.json` 반환 (태그만 정의)

**Sprint 7 범위**:

| 서브태스크 | 설명 | 완료기준 |
|-----------|------|---------|
| F38-1 | `OpenAPIHono` 전환 + `app.doc()` 자동 스펙 | `/api/openapi.json`에 전체 endpoint 스키마 포함 |
| F38-2 | 9개 라우트 `createRoute()` 마이그레이션 | health, profile, integrity, freshness, wiki, requirements, agent, token, auth |
| F38-3 | Zod 스키마 → `packages/shared` 타입 export | shared/api-types.ts 생성, Web에서 import |
| F38-4 | 요청/응답 런타임 검증 | 잘못된 요청에 400 + Zod 에러 응답 |

**대상 라우트 (9개)**:

| Route | Method | Endpoints | Zod 스키마 필요 |
|-------|--------|-----------|:---:|
| health | GET | `/api/health` | 응답 |
| profile | GET | `/api/profile` | 응답 |
| integrity | GET | `/api/integrity` | 응답 |
| freshness | GET | `/api/freshness` | 응답 |
| wiki | GET/POST/PUT/DELETE | `/api/wiki`, `/api/wiki/:slug` | 요청+응답 |
| requirements | GET | `/api/requirements` | 응답 |
| agent | GET | `/api/agents`, `/api/agents/:id` | 응답 |
| token | GET | `/api/tokens` | 응답 |
| auth | POST ×3 | signup, login, refresh | 요청+응답 |

### 2.3 F41 — API 엔드포인트 실데이터 연결

**현재 상태**: `data-reader.ts`가 하드코딩된 mock 데이터 반환 + `node:fs/promises` 사용 (Workers에서 불가)

**Sprint 7 범위**:

| 서브태스크 | 설명 | 데이터 소스 |
|-----------|------|:----------:|
| F41-1 | data-reader 리팩토링 (D1 바인딩 주입) | — |
| F41-2 | wiki CRUD → D1 `wiki_pages` 테이블 | D1 |
| F41-3 | requirements → SPEC.md 파싱 (Git API) | GitHub API |
| F41-4 | token/agent 조회 → D1 테이블 | D1 |
| F41-5 | health/integrity/freshness → Git + 분석 로직 | GitHub API + 계산 |
| F41-6 | profile → JWT payload + D1 users | D1 + JWT |

**데이터 소스 전략**:

| Endpoint | 현재 | Sprint 7 | 비고 |
|----------|------|---------|------|
| `/api/wiki/*` | mock | D1 `wiki_pages` | CRUD 전체 |
| `/api/tokens` | mock | D1 `token_usage` | 집계 쿼리 |
| `/api/agents` | mock | D1 `agent_sessions` | 상태 조회 |
| `/api/requirements` | mock (fs 파싱) | GitHub API (SPEC.md) | octokit 사용 |
| `/api/health` | mock score | 계산 로직 유지 (mock 입력) | Sprint 8 Git 분석 전환 |
| `/api/profile` | mock | JWT payload + D1 users | 인증된 사용자 정보 |
| `/api/integrity` | mock | mock 유지 → Sprint 8 | Git diff 분석 필요 |
| `/api/freshness` | mock (fs) | mock 유지 → Sprint 8 | 파일 시스템 의존 |

### 2.4 F42 — shadcn/ui + 웹 컴포넌트 고도화

**Sprint 7 범위**:

| 서브태스크 | 설명 | 완료기준 |
|-----------|------|---------|
| F42-1 | shadcn/ui + Tailwind CSS 설치 | `npx shadcn-ui init` 성공, tailwind.config 설정 |
| F42-2 | 공통 컴포넌트 도입 (Card, Button, Table, Badge) | 기존 인라인 → shadcn 교체 |
| F42-3 | DashboardCard, AgentCard 등 feature 컴포넌트 리팩토링 | 일관된 디자인 토큰 |
| F42-4 | 반응형 레이아웃 + 사이드바 | 모바일/데스크톱 반응형 |
| F42-5 | 다크모드 (next-themes) | 시스템 테마 감지 + 토글 |

### 2.5 F43 — API + Web 테스트 스위트

**현재 상태**: API 39 tests + Web 18 tests (기존 Sprint 5~6)

**Sprint 7 범위**:

| 서브태스크 | 설명 | 완료기준 |
|-----------|------|---------|
| F43-1 | API: OpenAPI 라우트 테스트 갱신 | Zod 검증 + D1 mock |
| F43-2 | API: D1 mock 유틸 (in-memory SQLite) | `createTestApp()` 팩토리 |
| F43-3 | Web: api-client → 실 API 연동 테스트 | MSW 또는 fetch mock |
| F43-4 | Web: 컴포넌트 테스트 갱신 (shadcn 교체 후) | React Testing Library |

### 2.6 Out of Scope

- SSE 실시간 통신 (Sprint 8 F44)
- NL→Spec 변환 (Sprint 8 F45)
- Wiki Git 동기화 (Sprint 8 F46)
- E2E 테스트 — Playwright (Sprint 8+)
- Cloudflare Workers Paid plan 전환

---

## 3. Architecture

### 3.1 OpenAPI 전환 아키텍처 (F38)

```
현재:
  Hono → route.get() → handler → c.json(mock)

전환 후:
  OpenAPIHono → createRoute({ schema }) → handler → c.json(data)
  ↓
  app.doc('/api/openapi.json') → 자동 스펙 생성
  ↓
  swaggerUI({ url: '/api/openapi.json' }) → 인터랙티브 문서
```

### 3.2 데이터 레이어 아키텍처 (F41)

```
┌──────────────┐
│ API Routes   │
│ (OpenAPIHono)│
└──────┬───────┘
       │
┌──────┴───────┐
│ data-reader  │  ← 리팩토링 대상
│ (Service)    │
└──┬───────┬───┘
   │       │
┌──┴──┐ ┌──┴──────┐
│ D1  │ │ GitHub  │
│(SQL)│ │ API     │
└─────┘ │(octokit)│
        └─────────┘
```

**D1 쿼리 패턴**: Drizzle ORM 사용 (Sprint 6에서 스키마 정의 완료)

### 3.3 Web 컴포넌트 구조 (F42)

```
packages/web/src/
├── app/                  # Next.js App Router
│   ├── layout.tsx        # + ThemeProvider (next-themes)
│   └── [pages]
├── components/
│   ├── ui/               # shadcn/ui 컴포넌트 (Card, Button, Table, Badge...)
│   └── feature/          # 비즈니스 컴포넌트 (DashboardCard, AgentCard...)
└── lib/
    ├── api-client.ts     # 실 API 호출
    └── utils.ts          # cn() helper (tailwind-merge)
```

---

## 4. Implementation Plan

### 4.1 구현 순서 (의존성 기반)

```
Phase A: OpenAPI 기반 전환 (F38) — 선행
├── F38-1: OpenAPIHono + app.doc() 설정
├── F38-2: 9개 라우트 createRoute() 마이그레이션
└── F38-3: Zod 스키마 → shared 타입 export

Phase B: 실데이터 연동 (F41) — F38 완료 후
├── F41-1: data-reader 리팩토링 (D1 바인딩)
├── F41-2: wiki CRUD (D1)
├── F41-3: token/agent 조회 (D1)
├── F41-4: requirements (GitHub API)
└── F41-6: profile (JWT + D1)

Phase C: Web 고도화 (F42) — F38 병렬 가능
├── F42-1: shadcn/ui + Tailwind 설치
├── F42-2: 공통 컴포넌트 교체
├── F42-3: feature 컴포넌트 리팩토링
├── F42-4: 반응형 레이아웃
└── F42-5: 다크모드

Phase D: 테스트 (F43) — F38+F41+F42 완료 후
├── F43-1: API OpenAPI 테스트 갱신
├── F43-2: D1 mock 유틸
├── F43-3: Web api-client 테스트
└── F43-4: Web 컴포넌트 테스트
```

### 4.2 Agent Teams 구성 (권장)

| Worker | 담당 | 범위 |
|--------|------|------|
| W1 (API) | F38 + F41 | OpenAPI 전환 + 실데이터 연동 |
| W2 (Web) | F42 | shadcn/ui + 반응형 + 다크모드 |
| Leader | F43 + 통합 | 테스트 스위트 + 최종 검증 |

---

## 5. Risk & Mitigation

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| R1 | OpenAPI 라우트 전환 시 기존 테스트 깨짐 | API 테스트 39건 실패 가능 | F38 완료 직후 F43-1로 테스트 갱신 |
| R2 | D1 쿼리 성능 (Workers 10ms CPU) | 복잡 JOIN 시 타임아웃 | 단순 SELECT 위주, JOIN 최소화 |
| R3 | shadcn/ui + Next.js 14 호환성 | SSR/CSR 불일치 | "use client" 명시, hydration 주의 |
| R4 | GitHub API Rate Limit | requirements 파싱 빈도 제한 | KV 캐시 (5분 TTL) + 401 fallback |
| R5 | node:fs 의존 제거 미완 | Workers 런타임 에러 | F41에서 모든 fs import 제거 확인 |

---

## 6. Success Criteria

### Sprint 7 완료 기준

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-1 | `/api/openapi.json`에 전체 endpoint 스키마 포함 | curl + jq로 paths 확인 |
| SC-2 | `/api/docs` Swagger UI에서 모든 API 테스트 가능 | 브라우저 확인 |
| SC-3 | wiki CRUD가 D1 실데이터로 동작 | curl로 create/read/update/delete |
| SC-4 | token, agent 조회가 D1 실데이터 반환 | curl + D1 seed 데이터 비교 |
| SC-5 | shadcn/ui 컴포넌트 적용 (Card, Button, Table) | 웹 UI 스크린샷 |
| SC-6 | 다크모드 토글 동작 | 브라우저 테마 전환 |
| SC-7 | API 테스트 > 40건, Web 테스트 > 20건 | `turbo test` 통과 |
| SC-8 | Workers 배포 성공 + 프로덕션 API 정상 응답 | curl 배포 URL |
| SC-9 | node:fs 의존 완전 제거 | grep 확인 |
| SC-10 | PDCA Match Rate >= 85% | Gap Analysis |

---

## 7. Dependencies

| 의존성 | 상태 | 비고 |
|--------|:----:|------|
| Sprint 6 완료 (F37/F39/F40) | ✅ | 인프라 기반 확보 |
| D1 프로덕션 DB | ✅ | `foundry-x-db` (세션 #19) |
| Workers 배포 | ✅ | `foundry-x-api.ktds-axbd.workers.dev` |
| CLOUDFLARE_API_TOKEN | ✅ | GitHub Secret 등록 |
| shadcn/ui 호환 (Next.js 14) | 📋 | 설치 시 검증 |
| octokit (GitHub API) | 📋 | package.json 추가 필요 |

---

## 8. Open Questions

| # | Question | Owner | Deadline |
|---|----------|-------|----------|
| Q9 | Cloudflare Workers Paid plan 필요 시점 (Free CPU 10ms 제한) | PM | Sprint 7 중 |
| Q10 | GitHub API 인증 방식 (PAT vs GitHub App) | 아키텍트 | F41 착수 전 |
| Q11 | shadcn/ui 테마 커스텀 범위 (Foundry-X 브랜드 컬러) | 디자인 | F42 착수 전 |
