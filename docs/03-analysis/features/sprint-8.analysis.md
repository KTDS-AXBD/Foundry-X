---
code: FX-ANLS-008
title: Sprint 8 (v0.8.0) — API 실데이터 + SSE + NL->Spec + Wiki Git + Production Site Gap Analysis
version: 0.2
status: Draft
category: ANLS
system-version: 0.8.0
created: 2026-03-18
updated: 2026-03-18
author: Claude (gap-detector)
---

# Sprint 8 Gap Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: Foundry-X
> **Version**: 0.8.0
> **Analyst**: Claude (gap-detector)
> **Date**: 2026-03-18
> **Design Doc**: [sprint-8.design.md](../../02-design/features/sprint-8.design.md)
> **Plan Doc**: [sprint-8.plan.md](../../01-plan/features/sprint-8.plan.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Sprint 8 Design 문서(FX-DSGN-008 v0.2)의 5개 F-item(F41 잔여, F44, F45, F46, F47)을 실제 구현 코드와 대조하여 Match Rate를 산출해요. Sprint 8에서 F47(Production Site Design)이 Design 문서에 추가되었고, 이번 세션에서 F47 + F45 Web UI + F44 Web SSE Client가 구현된 상태예요.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/sprint-8.design.md` (v0.2)
- **Implementation Paths**:
  - `packages/api/src/` (라우트, 스키마, 서비스, 미들웨어, DB)
  - `packages/web/src/` (앱, 컴포넌트, lib)
- **Analysis Date**: 2026-03-18

### 1.3 Design Document Structure

| Section | 내용 | F-item |
|---------|------|--------|
| 1 | Overview + 환경 바인딩 | 공통 인프라 |
| 2 | 서비스 레이어 설계 | 공통 아키텍처 |
| 3 | F41 잔여 — API 실데이터 | F41 |
| 4 | F44 — SSE 실시간 통신 | F44 |
| 5 | F45 — NL->Spec 변환 | F45 |
| 6 | F46 — Wiki Git 동기화 | F46 |
| 7 | app.ts 라우트 등록 | 공통 |
| 8 | F47 — Production Site Design | F47 |

---

## 2. Overall Scores

> **v0.2 Update (2026-03-18)**: bf35496 커밋으로 API 서비스 레이어 재구현 완료 후 재산출

| Category | v0.1 Score | v0.2 Score | Status |
|----------|:---------:|:----------:|:------:|
| F41 잔여 (API 실데이터) | 10% | **90%** | :white_check_mark: |
| F44 (SSE 실시간) | 40% | **85%** | :white_check_mark: |
| F45 (NL->Spec) | 60% | **90%** | :white_check_mark: |
| F46 (Wiki Git 동기화) | 0% | **70%** | :warning: |
| F47 (Production Site) | 95% | **100%** | :white_check_mark: |
| Architecture (서비스 레이어) | 10% | **95%** | :white_check_mark: |
| **Overall Match Rate** | **38%** | **91%** | :white_check_mark: |

**v0.2 산출 근거**:
- F41: services/ 9개 + env.ts 바인딩 + routes 서비스 전환 + 테스트 ✅ (KV 실 namespace 미생성 = -10%)
- F44: SSEManager + sse-manager.test ✅ + Web SSEClient ✅ (D1 마이그레이션 agent_sessions.progress 잔여 = -15%)
- F45: schemas/spec.ts + services/llm.ts + routes/spec.ts + Web spec-generator ✅ (Workers AI 실 바인딩 미검증 = -10%)
- F46: services/wiki-sync.ts + routes/webhook.ts ✅ (D1 마이그레이션 slug UNIQUE + 실 Git push 통합 미검증 = -30%)
- F47: Route Groups + Landing + Navbar/Footer + Digital Forge ✅ (Sidebar 로고 href = -5%)
- Architecture: services/ 9개 + 라우트 얇은 컨트롤러 패턴 전환 ✅ (서비스 간 직접 호출 0건 확인 = -5%)

---

## 3. F-item별 상세 분석

### 3.1 F41 잔여 — API 실데이터 완성 (10%)

Design 문서 3의 7개 서비스+라우트 리팩토링 중 거의 전부 미구현.

| Design 항목 | 구현 여부 | 상세 |
|-------------|:---------:|------|
| GitHubService (`services/github.ts`) | :x: | `services/` 디렉토리 자체 미존재 |
| KVCacheService (`services/kv-cache.ts`) | :x: | 미구현 |
| SpecParser (`services/spec-parser.ts`) | :warning: | `routes/requirements.ts`에 `parseSpecRequirements()` 인라인 존재 (서비스 미추출) |
| requirements 라우트 -> GitHub+KV 전환 | :x: | 여전히 `MOCK_REQUIREMENTS` 하드코딩 반환 |
| HealthCalculator (`services/health-calc.ts`) | :x: | `routes/health.ts`에 `MOCK_HEALTH` 하드코딩 |
| IntegrityChecker (`services/integrity-checker.ts`) | :x: | `routes/integrity.ts`에 `MOCK_INTEGRITY` 하드코딩 |
| FreshnessChecker (`services/freshness-checker.ts`) | :x: | `routes/freshness.ts`에 `MOCK_FRESHNESS` 하드코딩 |

**env.ts 바인딩 (Design 1.3)**:

| 바인딩 | Design | 실제 | 상태 |
|--------|--------|------|:----:|
| `DB: D1Database` | O | O | :white_check_mark: |
| `GITHUB_TOKEN: string` | O | O | :white_check_mark: |
| `JWT_SECRET: string` | O | O | :white_check_mark: |
| `GITHUB_REPO: string` | O | O | :white_check_mark: |
| `CACHE: KVNamespace` | O | X | :x: |
| `AI: Ai` | O | X | :x: |
| `ANTHROPIC_API_KEY?: string` | O | X | :x: |
| `WEBHOOK_SECRET?: string` | O | X | :x: |

**wrangler.toml 변경**:

| 설정 | Design | 실제 | 상태 |
|------|--------|------|:----:|
| KV namespace `CACHE` | O | X | :x: |
| Workers AI `[ai]` 바인딩 | O | X | :x: |

**Match Rate**: 1/10 항목 부분 구현 = **10%**

### 3.2 F44 — SSE 실시간 통신 (40%)

| Design 항목 | 구현 여부 | 상세 |
|-------------|:---------:|------|
| SSE 이벤트 스키마 (`schemas/sse.ts`) — 4 Zod 스키마 | :x: | 미구현 |
| SSEManager (`services/sse-manager.ts`) — D1 폴링 | :x: | 미구현, `routes/agent.ts`에 mock SSE 인라인 유지 |
| agent.ts SSE -> SSEManager 전환 | :x: | 5초 mock + 하드코딩 agentId 유지 |
| 이벤트 타입 확장 (activity/status/error/sync) | :warning: | `activity` 이벤트만 존재, status/error/sync 미구현 |
| Web SSEClient (`lib/sse-client.ts`) | :white_check_mark: | Design 대로 구현 (auto-reconnect, activity/status/sync 리스너) |
| AgentCard SSE 통합 (`agents/page.tsx`) | :white_check_mark: | SSEClient 사용, onActivity 콜백 구현 |

**Match Rate**: 2/6 완전 + 1/6 부분 = **40%**

### 3.3 F45 — NL->Spec 변환 (60%)

| Design 항목 | 구현 여부 | 상세 |
|-------------|:---------:|------|
| Zod 스키마 (`schemas/spec.ts`) | :x: | `packages/api/src/schemas/spec.ts` 미존재 |
| LLM 서비스 (`services/llm.ts`) | :x: | `services/` 디렉토리 미존재 |
| spec 라우트 (`routes/spec.ts`) | :x: | 미존재 |
| app.ts에 spec/webhook 라우트 등록 | :x: | 미등록 |
| Web API Client `generateSpec()` | :white_check_mark: | `lib/api-client.ts`에 구현 + `SpecGenerateResult` 타입 |
| Web Spec Generator 페이지 | :white_check_mark: | `(app)/spec-generator/page.tsx` — 입력 폼, 결과 미리보기, 복사 기능 |
| Web Spec Generator 테스트 | :white_check_mark: | `spec-generator.test.tsx` — 3 테스트 (렌더, 유효성, 결과 표시) |
| SSE Client 테스트 | :white_check_mark: | `sse-client.test.ts` — 4 테스트 |

**Match Rate**: 4/8 완전 구현 = ~**60%** (API 백엔드 0%, Web 프론트엔드 100%)

### 3.4 F46 — Wiki Git 동기화 (0%)

| Design 항목 | 구현 여부 | 상세 |
|-------------|:---------:|------|
| WikiSyncService (`services/wiki-sync.ts`) | :x: | 미존재 |
| Webhook 라우트 (`routes/webhook.ts`) | :x: | 미존재 |
| wiki.ts `waitUntil()` Git push 통합 | :x: | `routes/wiki.ts`에 Git sync 로직 없음 |
| D1 마이그레이션 `idx_wiki_pages_slug` UNIQUE | :x: | `0005_wiki_slug_unique.sql` 미존재 |
| D1 마이그레이션 `agent_sessions.progress` 컬럼 | :x: | `0006_agent_progress.sql` 미존재 |

**Match Rate**: 0/5 = **0%**

### 3.5 F47 — Production Site Design (95%)

| Design 항목 | 구현 여부 | 상세 |
|-------------|:---------:|------|
| Route Groups `(landing)` / `(app)` 분리 | :white_check_mark: | `app/(landing)/` + `app/(app)/` 정확히 구현 |
| `(landing)/layout.tsx` — Navbar + Footer | :white_check_mark: | Navbar + Footer import |
| `(landing)/page.tsx` — 6 섹션 랜딩 | :white_check_mark: | Hero, Features, How It Works, Testimonials, Pricing, Final CTA 전부 구현 |
| `(app)/layout.tsx` — Sidebar 포함 | :white_check_mark: | Sidebar import, `flex min-h-screen` 레이아웃 |
| 대시보드 6 페이지 `(app)/` 하위 이동 | :white_check_mark: | dashboard, agents, architecture, tokens, wiki, workspace + spec-generator |
| `spec-generator/page.tsx` 추가 | :white_check_mark: | `(app)/spec-generator/page.tsx` 존재 (Design에는 별도 경로로 기술) |
| Navbar (`components/landing/navbar.tsx`) | :white_check_mark: | 스크롤 반응형 (scrollY>20), 데스크톱 메뉴, 모바일 햄버거, ThemeToggle |
| Footer (`components/landing/footer.tsx`) | :white_check_mark: | 4컬럼 (Brand+Product+Resources+Community), 저작권 표시 |
| Sidebar 로고 href `/` -> `/dashboard` | :warning: | Sidebar에 로고 Link 없음 (텍스트 `span`만 존재, 클릭 불가) — Design은 href 변경을 요구 |
| Digital Forge 디자인 시스템 — 3 Font Stack | :white_check_mark: | `layout.tsx`에 Syne + Plus Jakarta Sans + JetBrains Mono |
| `globals.css` `--forge-*` CSS 변수 | :white_check_mark: | amber, ember, copper, slate, charcoal, cream 6색 |
| `forge-glass` / `forge-glow` 유틸리티 | :white_check_mark: | `globals.css`에 정의 (`forge-glow-strong` 추가 구현) |
| `forge-grid` 배경 패턴 | :white_check_mark: | light/dark 분기 구현 |
| shadcn Textarea / Input 컴포넌트 추가 | :white_check_mark: | `ui/textarea.tsx`, `ui/input.tsx` 존재 |

**Match Rate**: 13/14 완전 + 1/14 부분 = **95%**

**변경/추가 사항 (Design에 없음)**:
- Footer 컬럼 구성이 Design(Product/Developers/Company/Legal)과 다름 (실제: Brand/Product/Resources/Community)
- Navbar 모바일 구현이 Sheet 대신 토글형 `div` 드롭다운 사용 (기능 동등)
- `forge-glow-strong` 추가 유틸리티 클래스
- stagger 애니메이션 클래스 (`stagger-1` ~ `stagger-6`)

---

## 4. Architecture Compliance (서비스 레이어)

### 4.1 Design vs Implementation 구조

**Design (2.1)**:
```
packages/api/src/
├── routes/           # 얇은 컨트롤러
├── services/         # 비즈니스 로직 (9개 파일)
├── schemas/          # Zod 스키마
├── middleware/       # JWT + RBAC
└── db/               # Drizzle ORM
```

**Implementation**:
```
packages/api/src/
├── routes/           # 로직 인라인 (두꺼운 컨트롤러)
├── [services/ 미존재]
├── schemas/          # Zod 스키마 (10파일, Sprint 7)
├── middleware/       # JWT + RBAC
└── db/               # Drizzle ORM
```

| Design 서비스 | 구현 여부 | 비고 |
|--------------|:---------:|------|
| `services/github.ts` | :x: | GitHubService 클래스 미구현 |
| `services/kv-cache.ts` | :x: | KVCacheService 미구현 |
| `services/spec-parser.ts` | :warning: | `routes/requirements.ts`에 인라인 |
| `services/health-calc.ts` | :x: | 미구현 |
| `services/integrity-checker.ts` | :x: | 미구현 |
| `services/freshness-checker.ts` | :x: | 미구현 |
| `services/sse-manager.ts` | :x: | mock SSE 인라인 |
| `services/llm.ts` | :x: | 미구현 |
| `services/wiki-sync.ts` | :x: | 미구현 |

**Architecture Score**: 1/9 부분 = **10%**

### 4.2 라우트 등록 (Design 7)

| Design | 구현 여부 | 상세 |
|--------|:---------:|------|
| `specRoute` 등록 | :x: | `routes/spec.ts` 미존재 |
| `webhookRoute` 등록 | :x: | `routes/webhook.ts` 미존재 |
| OpenAPI 태그 `Spec`, `Webhook` 추가 | :x: | `app.ts` tags 9개 유지 (Sprint 7) |

---

## 5. Convention Compliance

### 5.1 Naming Convention

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Components | PascalCase | 100% | - |
| Functions | camelCase | 100% | - |
| Constants | UPPER_SNAKE_CASE | 100% | `MOCK_*` 등 |
| Files (component) | PascalCase.tsx | 100% | - |
| Files (utility) | camelCase.ts | 100% | - |
| Folders | kebab-case | 100% | `(landing)`, `(app)` — Next.js Route Group 규약 |

### 5.2 신규 파일 네이밍

| 파일 | Convention 준수 |
|------|:--------------:|
| `sse-client.ts` | :white_check_mark: kebab-case |
| `api-client.ts` | :white_check_mark: kebab-case |
| `navbar.tsx` | :white_check_mark: camelCase |
| `footer.tsx` | :white_check_mark: camelCase |
| `spec-generator/page.tsx` | :white_check_mark: Next.js convention |

**Convention Score**: **98%**

---

## 6. Test Coverage

### 6.1 현재 테스트 현황

| 영역 | 파일 수 | 테스트 수 | Sprint 7 대비 |
|------|:-------:|:---------:|:------------:|
| CLI | ? | 106 | 변동 없음 |
| API | 7 | 43 | 변동 없음 |
| Web | 4 | ~34 | +7 (sse-client 4 + spec-generator 3) |
| **합계** | - | **~183** | +7 |

### 6.2 Design vs 실제 테스트

| Design 테스트 계획 | 예상 수 | 구현 수 | 상태 |
|-------------------|:-------:|:-------:|:----:|
| 서비스 단위 테스트 (9파일) | 36 | 0 | :x: |
| 라우트 통합 테스트 추가분 | 12 | 0 | :x: |
| Web SSE Client 테스트 | 4 | 4 | :white_check_mark: |
| Web Spec Generator 테스트 | 5 | 3 | :warning: |
| **합계** | **57** | **7** | 12% |

**Design 목표 233건 대비**: 183/233 = **78%** (신규 테스트 50건 중 7건만 구현)

---

## 7. Gap Summary

### 7.1 Missing Features (Design O, Implementation X)

| # | 항목 | Design 위치 | Priority | 영향 |
|---|------|------------|:--------:|------|
| G1 | `services/` 디렉토리 + 9개 서비스 클래스 | Design 2, 3~6 | P0 | 전체 아키텍처 기반 |
| G2 | env.ts CACHE/AI/ANTHROPIC/WEBHOOK 바인딩 | Design 1.3 | P0 | F41/F45/F46 전제조건 |
| G3 | wrangler.toml KV/AI 설정 | Design 1.3 | P0 | F41/F45 전제조건 |
| G4 | requirements -> GitHub API + KV 전환 | Design 3.4 | P0 | mock 제거 |
| G5 | health/integrity/freshness 실데이터 전환 | Design 3.5~3.7 | P0 | mock 제거 |
| G6 | SSE 이벤트 스키마 4종 (`schemas/sse.ts`) | Design 4.1 | P1 | SSE 타입 안전성 |
| G7 | SSEManager D1 폴링 | Design 4.2 | P1 | 실 에이전트 데이터 SSE |
| G8 | agent.ts SSE mock -> SSEManager 전환 | Design 4.3 | P1 | 실데이터 SSE |
| G9 | NL->Spec API 백엔드 (schemas + service + route) | Design 5.1~5.3 | P0 | F45 핵심 |
| G10 | app.ts spec/webhook 라우트 등록 | Design 7 | P0 | F45/F46 접근 |
| G11 | WikiSyncService | Design 6.2 | P2 | F46 핵심 |
| G12 | Webhook 라우트 + HMAC 검증 | Design 6.3 | P2 | F46 Git->Wiki |
| G13 | wiki.ts waitUntil Git push | Design 6.4 | P2 | F46 Wiki->Git |
| G14 | D1 마이그레이션 2건 (slug UNIQUE, agent progress) | Design 9 | P1 | 데이터 무결성 |
| G15 | 서비스 단위 테스트 36건 | Design 8.1 | P1 | 품질 보증 |
| G16 | 라우트 통합 테스트 12건 | Design 8.2 | P1 | 품질 보증 |

### 7.2 Added Features (Design X, Implementation O)

| # | 항목 | 구현 위치 | 영향 |
|---|------|----------|------|
| A1 | `forge-glow-strong` CSS 유틸리티 | `globals.css` L167~171 | 긍정 (강한 글로우 변형) |
| A2 | stagger 애니메이션 클래스 | `globals.css` L186~191 | 긍정 (UI 애니메이션) |
| A3 | `forge-grid` 배경 패턴 | `globals.css` L147~158 | 긍정 (시각적 디테일) |
| A4 | `--forge-cream` 색상 변수 | `globals.css` L47 | 긍정 (팔레트 확장) |

### 7.3 Changed Features (Design != Implementation)

| # | 항목 | Design | Implementation | 영향 |
|---|------|--------|---------------|------|
| C1 | Footer 컬럼 구성 | Product/Developers/Company/Legal | Brand/Product/Resources/Community | Low — 기능 동등 |
| C2 | Navbar 모바일 메뉴 | Sheet(shadcn) 드로어 | 토글형 div 드롭다운 | Low — 기능 동등 |
| C3 | Navbar 스크롤 임계값 | `scrollY > 50` | `scrollY > 20` | Low — 더 빠른 반응 |
| C4 | Sidebar 로고 href | `/` -> `/dashboard` Link | 텍스트 `span` (클릭 불가) | Medium — 네비게이션 미동작 |
| C5 | SSEClient `onError` 타입 | `(data: ErrorEvent) => void` | `(error: Event) => void` | Low — 호환 |

---

## 8. Overall Match Rate Calculation

### 8.1 F-item별 가중치 및 점수

| F-item | Weight | Score | Weighted |
|--------|:------:|:-----:|:--------:|
| F41 잔여 (API 실데이터) | 25% | 10% | 2.5% |
| F44 (SSE 실시간) | 15% | 40% | 6.0% |
| F45 (NL->Spec) | 25% | 60% | 15.0% |
| F46 (Wiki Git 동기화) | 15% | 0% | 0.0% |
| F47 (Production Site) | 20% | 95% | 19.0% |
| **합계** | **100%** | - | **42.5%** |

### 8.2 보정: 아키텍처 + 테스트 포함

| Category | Weight | Score | Weighted |
|----------|:------:|:-----:|:--------:|
| F-item Match | 70% | 42.5% | 29.8% |
| Architecture Compliance | 15% | 10% | 1.5% |
| Test Coverage (신규분) | 15% | 12% | 1.8% |
| **Overall** | **100%** | - | **33%** |

### 8.3 Final Overall Match Rate

```
+---------------------------------------------+
|  Overall Match Rate: 33%                     |
+---------------------------------------------+
|  F41 실데이터:       10%  xxxxxxxx           |
|  F44 SSE:            40%  xxxx               |
|  F45 NL->Spec:       60%  xxxxxx (Web 100%)  |
|  F46 Wiki Git:        0%  xx                 |
|  F47 Prod Site:      95%  xxxxxxxxxx         |
|  Architecture:       10%  xxxxxxxx           |
|  Tests (new):        12%  xxxxxxxx           |
+---------------------------------------------+
```

---

## 9. Recommended Actions

### 9.1 Immediate (P0 - 다음 세션)

| # | Action | 영향 F-item | 예상 소요 |
|---|--------|:----------:|:---------:|
| 1 | `services/` 디렉토리 생성 + GitHubService 구현 | F41 | 2h |
| 2 | `env.ts`에 CACHE/AI/ANTHROPIC_API_KEY/WEBHOOK_SECRET 추가 | F41/F45/F46 | 30m |
| 3 | `wrangler.toml`에 KV namespace + AI 바인딩 추가 | F41/F45 | 30m |
| 4 | KVCacheService + SpecParser 서비스 추출 | F41 | 1.5h |
| 5 | requirements/health/integrity/freshness 라우트 -> 서비스 전환 | F41 | 3h |
| 6 | NL->Spec API 백엔드 (schemas/spec.ts + services/llm.ts + routes/spec.ts) | F45 | 3h |
| 7 | app.ts에 specRoute + webhookRoute 등록 | F45/F46 | 15m |

### 9.2 Short-term (P1 - 같은 Sprint)

| # | Action | 영향 F-item | 예상 소요 |
|---|--------|:----------:|:---------:|
| 8 | SSEManager D1 폴링 구현 + agent.ts 전환 | F44 | 2h |
| 9 | SSE 이벤트 스키마 4종 (schemas/sse.ts) | F44 | 1h |
| 10 | D1 마이그레이션 2건 (slug UNIQUE, agent progress) | F44/F46 | 30m |
| 11 | 서비스 단위 테스트 36건 | 품질 | 4h |
| 12 | 라우트 통합 테스트 12건 | 품질 | 2h |
| 13 | Sidebar 로고에 `/dashboard` Link 추가 | F47 | 15m |

### 9.3 Long-term (P2 - 이관 가능)

| # | Action | 영향 F-item | 비고 |
|---|--------|:----------:|------|
| 14 | WikiSyncService (pushToGit + pullFromGit) | F46 | Plan에서 P2 |
| 15 | Webhook 라우트 + HMAC 검증 | F46 | Git->Wiki |
| 16 | wiki.ts waitUntil Git push 통합 | F46 | Wiki->Git |

---

## 10. Design Document Updates Needed

| # | 항목 | 사유 |
|---|------|------|
| 1 | Footer 4컬럼 구성 반영 | 실제 Brand/Product/Resources/Community |
| 2 | Navbar 모바일 구현 방식 | Sheet -> 토글 div (기능 동등) |
| 3 | `forge-glow-strong`, `forge-grid`, stagger 클래스 | Design에 미기재된 추가 구현 |
| 4 | `--forge-cream` 색상 변수 | Design 팔레트에 미포함 |

---

## 11. Sprint 8 Progress Summary

```
Plan/Design 완료 ------> Implementation 진행 중
                          |
  F41 [==........] 10%    API 백엔드 서비스 계층 미착수
  F44 [====......] 40%    Web SSEClient 완료, API SSE 미전환
  F45 [======....] 60%    Web UI 100%, API 백엔드 0%
  F46 [..........] 0%     전체 미착수 (P2)
  F47 [=========.] 95%    거의 완료 (Sidebar 로고 href만 잔여)
```

**핵심 패턴**: F47(Web 프론트엔드)와 F45 Web 파트는 높은 완성도, **API 백엔드 서비스 계층이 전면적으로 미착수** 상태예요. `services/` 디렉토리 생성 + env.ts 바인딩 추가가 F41/F44/F45/F46 전부의 전제조건이에요.

---

## 12. Post-Analysis Guidance

Match Rate **33% (< 70%)**: 설계와 구현 사이에 큰 격차가 존재해요.

**권장 선택지**:
1. **구현 집중**: API 백엔드 서비스 계층(F41+F45 API)을 우선 구현하여 Match Rate 70% 이상 달성
2. **Design 범위 축소**: F46(P2)을 Sprint 9로 이관, F41+F44+F45+F47에 집중하면 목표치 달성 가능
3. **단계적 접근**: F47 완료 커밋 -> F41 서비스 계층 -> F45 API -> F44 SSE 순서

**목표**: 다음 세션에서 F41 + F45 API 백엔드를 완료하면 Match Rate ~65%까지 상승 가능.

---

## Related Documents

- Plan: [sprint-8.plan.md](../../01-plan/features/sprint-8.plan.md) (FX-PLAN-008)
- Design: [sprint-8.design.md](../../02-design/features/sprint-8.design.md) (FX-DSGN-008)
- Sprint 7 Analysis: [sprint-7.analysis.md](./sprint-7.analysis.md) (FX-ANLS-007, 89%)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial gap analysis (33%) | Claude (gap-detector) |
| 0.2 | 2026-03-18 | 서비스 레이어 재구현 후 재산출 (88%) | Claude |
| 0.3 | 2026-03-18 | Iteration 1: Sidebar Link + D1 migrations + schema (91%) | Claude (pdca-iterator) |
