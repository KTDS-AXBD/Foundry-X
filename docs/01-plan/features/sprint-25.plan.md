---
code: FX-PLAN-026
title: "Sprint 25 — Sprint 0: 기술 스택 점검 + AXIS DS UI 전환"
version: 0.1
status: Draft
category: PLAN
system-version: 2.0.0
created: 2026-03-20
updated: 2026-03-20
author: Sinclair Seo
---

# Sprint 25 — Sprint 0: 기술 스택 점검 + AXIS DS UI 전환

> **Summary**: PRD v5 통합 착수의 선결 조건인 기술 스택 점검(F98)을 완료하고, 분석 결과를 즉시 반영하여 AXIS DS UI 전환(F104)까지 실행한다.
>
> **Project**: Foundry-X
> **Version**: v2.1 (목표)
> **Author**: Sinclair Seo
> **Date**: 2026-03-20
> **Status**: Draft

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | Sprint 25 — Sprint 0: 기술 스택 점검 + AXIS DS 전환 (F98, F104) |
| **시작** | 2026-03-20 |
| **목표 버전** | v2.1 |

| Perspective | Content |
|-------------|---------|
| **Problem** | PRD v5 통합 비전을 실행하려면 3개 서비스(Discovery-X, AI Foundry, AXIS DS)의 기술 호환성을 확인해야 하는데, 아직 공식 점검이 없음. 또한 Foundry-X만 shadcn/ui를 유지하여 UI 일관성이 깨져 있음 |
| **Solution** | 3개 서비스 코드베이스 전수 분석 → 호환성 매트릭스 작성 → 마이그레이션 전략 수립 + AXIS DS(@axis-ds/tokens, ui-react, theme) 패키지로 UI 전환 |
| **Function/UX Effect** | 통합 로드맵의 기술적 확신 확보 + Foundry-X ↔ Discovery-X UI 일관성 달성 — 사용자가 두 서비스를 오갈 때 동일한 디자인 경험 |
| **Core Value** | "통합 전 확인" — PRD v5 Kill 조건(기술 호환 불가)을 사전에 검증하여, Phase 4 통합의 성공 확률을 극대화 |

---

## 1. Overview

### 1.1 Purpose

Sprint 25는 PRD v5 §7.13이 명시한 "Sprint 0: 기술 스택 점검 스프린트"를 실행한다.
코드베이스 분석 결과 **3개 서비스 모두 Cloudflare 생태계**임이 확인되었으므로, 점검과 동시에 가장 리스크가 낮은 AXIS DS UI 전환(F104)까지 실행하는 실행형 스프린트로 구성한다.

### 1.2 Background

**코드베이스 분석 결과 (2026-03-20 사전 스캔):**

| 항목 | Foundry-X | Discovery-X | AI Foundry |
|------|-----------|-------------|------------|
| **Frontend** | Next.js 14 + React 18 | Remix v2 + React 19 | React 18 + Vite SPA |
| **Backend** | Hono on Workers (1) | Remix + Workers (4) | Workers 12 microservices |
| **Database** | D1 (raw SQL) | D1 (Drizzle ORM) | D1 + Neo4j Aura + R2 |
| **Auth** | JWT + PBKDF2 + RBAC | Arctic OAuth (Google) | HMAC + RBAC |
| **UI** | shadcn/ui (Radix + Tailwind) | **AXIS DS v1.1.1** ✅ | Radix UI + Tailwind |
| **Language** | TypeScript 5.x | TypeScript 5.7.3 | TypeScript 5.7.3 |
| **Build** | pnpm + Turborepo | pnpm | Bun + Turborepo |
| **Deploy** | CF Workers + Pages | CF Pages + Workers | CF Pages + Workers |

**핵심 판단:**
- ✅ 인프라(Cloudflare) 완전 호환 — 통합 진행 가능
- ✅ UI(AXIS DS) 전환 리스크 낮음 — shadcn/ui와 동일 기반(Radix + Tailwind + CVA)
- ⚠️ 인증 통합(F108)이 향후 최대 난관 — 3가지 방식 병존
- ⚠️ AI Foundry의 Neo4j 의존성은 별도 서비스로 유지 필요

### 1.3 Related Documents

- PRD: [[FX-SPEC-PRD-V5]] §7.12 기술 스택 통일 전략, §7.13 점검 프로세스
- SPEC: [[FX-SPEC-001]] v5.5
- 기존 기술 스택 결정: [[FX-DSGN-007]] (tech-stack-review.design.md)
- F79 AXIS DS 리디자인: SPEC §5 F79 ✅ (forge→axis 전환, 디자인 토큰 기초)

---

## 2. Scope

### 2.1 In Scope

- [ ] **F98**: 기술 스택 점검 — 호환성 매트릭스 + 마이그레이션 전략 문서 작성
- [ ] **F104**: AXIS DS UI 전환 — @axis-ds/tokens, ui-react, theme 패키지 도입 + shadcn/ui 컴포넌트 교체

### 2.2 Out of Scope

- 인증 통합 (F108) — Phase 4에서 별도 스프린트
- API 통합 (F109) — 기술 스택 점검 후 설계
- AI Foundry Neo4j 마이그레이션 — 별도 서비스로 유지 결정
- Discovery-X Remix → Next.js 전환 — Big Bang 마이그레이션 금지 원칙 (PRD v5 §7.12)

---

## 3. Feature Details

### 3.1 F98 — 기술 스택 점검 (리서치)

**PRD v5 §7.13 요구사항:**

#### Step 1: 코드베이스 분석 (사전 스캔 완료)
- [x] Discovery-X: Remix v2 + React 19, D1(Drizzle), Arctic OAuth, CF Pages + 4 Workers
- [x] AI Foundry: React 18 + Vite, D1 + Neo4j + R2, HMAC Auth, CF Pages + 12 Workers
- [x] AXIS DS: npm 3-package (@axis-ds/tokens, ui-react, theme), Radix UI 기반, v1.1.1

#### Step 2: 호환성 평가 리포트
산출물: `docs/specs/tech-stack-audit.md`

| 평가 항목 | 방법 |
|-----------|------|
| Cloudflare Workers 호환 | Node.js API 사용 범위 점검 (workerd 런타임 제약) |
| D1 마이그레이션 가능 여부 | 기존 스키마 분석 + 크로스 서비스 FK 가능성 |
| Next.js 14 통합 가능 여부 | 빌드 의존성 충돌 검사 (Remix ↔ Next.js 공존 가능?) |
| AXIS DS 컴포넌트 커버리지 | Foundry-X 사용 컴포넌트 vs AXIS DS 제공 컴포넌트 매핑 |

#### Step 3: 마이그레이션 전략 수립

| 서비스 | 전략 |
|--------|------|
| Discovery-X | 프론트엔드 통합 시 Remix → Foundry-X 서브 라우트 (Module Federation 또는 iframe) |
| AI Foundry | API 프록시 통합 (BFF 패턴) — 12 Workers를 Foundry-X Workers가 라우팅 |
| AXIS DS | Foundry-X에 즉시 적용 가능 (이번 스프린트 F104) |
| Neo4j | 외부 서비스로 유지 — AI Foundry svc-ontology가 프록시 |

### 3.2 F104 — AXIS DS UI 전환 (구현)

**현재 상태:** Foundry-X는 shadcn/ui 직접 사용 (`packages/web/src/components/ui/`)
**목표:** @axis-ds/ui-react + @axis-ds/tokens + @axis-ds/theme 패키지로 교체

#### 전환 전략

AXIS DS는 shadcn/ui의 **상위 호환** (동일한 Radix UI + Tailwind + CVA 기반). 전환 방법:

1. **패키지 설치**: `@axis-ds/tokens`, `@axis-ds/ui-react`, `@axis-ds/theme`
2. **디자인 토큰 적용**: `@axis-ds/tokens/css/shadcn` import로 CSS 변수 교체
3. **테마 프로바이더**: `@axis-ds/theme` ThemeProvider로 기존 다크모드 래핑
4. **컴포넌트 교체**: `components/ui/*.tsx` → `@axis-ds/ui-react` import로 점진 교체
5. **커스텀 컴포넌트 유지**: AXIS DS에 없는 Foundry-X 전용 컴포넌트는 `components/feature/`에 유지

#### 컴포넌트 매핑 (예상)

| Foundry-X 현재 (shadcn/ui) | AXIS DS 대응 | 전환 |
|---------------------------|-------------|------|
| Button, Input, Card | @axis-ds/ui-react | 직접 교체 |
| Dialog, Sheet, Tabs | @axis-ds/ui-react | 직접 교체 |
| Badge, Avatar, Progress | @axis-ds/ui-react | 직접 교체 |
| Sidebar, Navbar | 없음 (커스텀) | 유지 + AXIS 토큰 적용 |
| AgentCard, PlanCard 등 | 없음 (도메인) | 유지 + AXIS 토큰 적용 |

#### 검증 기준

- [ ] AXIS DS 3 패키지 설치 + 빌드 성공
- [ ] 디자인 토큰 CSS 변수 교체 (기존 shadcn CSS → @axis-ds/tokens/css/shadcn)
- [ ] ThemeProvider 적용 (라이트/다크 모드 동작)
- [ ] 주요 페이지 시각적 검증 (대시보드, 에이전트, 위키, 토큰)
- [ ] 기존 48 Web 테스트 전부 pass
- [ ] E2E ~51 specs 전부 pass

---

## 4. Implementation Plan

### 4.1 작업 순서

```
Phase 1: F98 기술 스택 점검 (리서치, ~30min)
├── 1-1. 호환성 매트릭스 작성 (tech-stack-audit.md)
├── 1-2. 컴포넌트 커버리지 매핑 (AXIS DS ↔ Foundry-X)
└── 1-3. 마이그레이션 전략 문서화

Phase 2: F104 AXIS DS 전환 (구현, ~60min)
├── 2-1. @axis-ds/* 패키지 설치 + 빌드 검증
├── 2-2. 디자인 토큰 교체 (CSS 변수 레이어)
├── 2-3. ThemeProvider 적용
├── 2-4. components/ui/ → @axis-ds/ui-react 교체
├── 2-5. 잔여 커스텀 컴포넌트 토큰 적용
└── 2-6. 테스트 + E2E 검증

Phase 3: 통합 + 배포
├── 3-1. typecheck + lint + test 전부 pass
├── 3-2. Workers 배포 (v2.1)
└── 3-3. Pages 배포 + 시각적 검증
```

### 4.2 예상 산출물

| 산출물 | 위치 | 타입 |
|--------|------|------|
| 기술 스택 감사 리포트 | `docs/specs/tech-stack-audit.md` | 문서 |
| AXIS DS 패키지 설치 | `packages/web/package.json` | 설정 |
| 디자인 토큰 교체 | `packages/web/src/app/globals.css` | CSS |
| ThemeProvider | `packages/web/src/app/layout.tsx` | 코드 |
| 컴포넌트 교체 | `packages/web/src/components/ui/*` | 코드 |

### 4.3 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|:----:|:----:|------|
| AXIS DS 컴포넌트 API 불일치 | 낮음 | 중간 | shadcn/ui와 동일 기반이므로 Props 호환성 높음. 불일치 시 래퍼 작성 |
| Tailwind v4 호환성 | 중간 | 중간 | Foundry-X는 Tailwind 4.2, AXIS DS는 ≥3.0 피어. @theme inline 방식 확인 필요 |
| Next.js 14 + AXIS DS 빌드 충돌 | 낮음 | 높음 | Discovery-X(Remix)에서 이미 동작 확인. Next.js에서 ESM import 이슈 시 next.config.js transpilePackages 설정 |
| E2E 테스트 시각적 변경으로 실패 | 중간 | 낮음 | Playwright는 기능 테스트 중심이므로 영향 적음. 스크린샷 테스트 있으면 업데이트 |

---

## 5. Success Criteria

| 기준 | 목표 |
|------|------|
| F98 호환성 매트릭스 완성 | ✅ 문서 작성 + Kill 조건 판단 |
| F104 AXIS DS 전환 완료 | ✅ 3 패키지 적용 + 주요 컴포넌트 교체 |
| 기존 테스트 유지 | Web 48 + E2E ~51 전부 pass |
| typecheck | 0 에러 |
| 빌드 | 성공 |
| 배포 | Workers v2.1 + Pages 배포 완료 |
| Match Rate | ≥ 90% |
