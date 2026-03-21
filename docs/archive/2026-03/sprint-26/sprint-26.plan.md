---
code: FX-PLAN-027
title: "Sprint 26 — Phase 4 통합: 프론트엔드 + SSO + API BFF + D1 스키마"
version: 0.1
status: Draft
category: PLAN
system-version: 2.0.0
created: 2026-03-20
updated: 2026-03-20
author: Sinclair Seo
---

# Sprint 26 — Phase 4 통합: 프론트엔드 + SSO + API BFF + D1 스키마

> **Summary**: PRD v5 통합 Step 2~5를 한 Sprint에 실행하여, Discovery-X/AI Foundry/Foundry-X를 단일 플랫폼으로 통합한다. 프론트엔드 서브 라우트 → SSO 인증 → API BFF 프록시 → D1 크로스 서비스 쿼리까지 전 레이어 통합.
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
| **Feature** | Sprint 26 — Phase 4 통합 (F106, F108, F109, F111) |
| **시작** | 2026-03-20 |
| **목표 버전** | v2.1 |
| **F-items** | 4개 (F106 프론트엔드, F108 SSO, F109 API BFF, F111 D1 스키마) |

| Perspective | Content |
|-------------|---------|
| **Problem** | 3개 서비스(Discovery-X, AI Foundry, Foundry-X)가 각각 독립 배포·독립 인증·독립 DB로 운영되어, 사용자가 서비스 간 전환 시 별도 로그인 + 데이터 단절 경험 |
| **Solution** | Foundry-X를 통합 셸로 삼아 (1) Next.js 서브 라우트로 UI 통합 (2) JWT 기반 SSO (3) Workers BFF 프록시 (4) D1 공유 스키마로 크로스 서비스 쿼리 |
| **Function/UX Effect** | 단일 URL(fx.minu.best)에서 모든 서비스 접근 + 한 번 로그인으로 전체 이용 + 크로스 프로젝트 대시보드에서 Discovery-X 실험→AI Foundry 스킬→Foundry-X 에이전트 연결 |
| **Core Value** | "하나의 플랫폼, 하나의 경험" — 분산된 도구를 통합하여 AX BD팀의 전체 워크플로우를 단일 인터페이스로 제공 |

---

## 1. Overview

### 1.1 Purpose

Sprint 26은 PRD v5 §7.2 축6의 통합 Step 2~5를 실행한다.
Sprint 25에서 기술 스택 점검(F98)이 완료되어 "Go" 판정을 받았으므로,
이제 실제 통합을 진행한다.

### 1.2 Background — 3개 서비스 현황 (Sprint 25 F98 감사 결과)

| 항목 | Foundry-X | Discovery-X | AI Foundry |
|------|-----------|-------------|------------|
| **Frontend** | Next.js 14 + React 18 | Remix v2 + React 19 | React 18 + Vite SPA |
| **Backend** | Hono on Workers (1) | Remix + Workers (4) | Workers 12 microservices |
| **Database** | D1 27 테이블 (raw SQL) | D1 14 스키마 (Drizzle) | D1 10개 + Neo4j + R2 |
| **Auth** | JWT + PBKDF2 + RBAC | Arctic OAuth (Google) | HMAC + RBAC |
| **UI** | AXIS DS ✅ (Sprint 25 전환) | AXIS DS v1.1.1 ✅ | Radix UI + Tailwind |
| **Deploy** | CF Workers + Pages | CF Pages + 4 Workers | CF Pages + 12 Workers |
| **MCP 연동** | — | 미연동 | ✅ 3 meta-tools |

**핵심 판단:**
- ✅ Cloudflare 인프라 완전 호환 — Workers 간 Service Bindings 사용 가능
- ✅ UI 통일 완료 — AXIS DS (Foundry-X + Discovery-X), AI Foundry만 추후 적용
- ⚠️ 프레임워크 이질성 — Remix vs Next.js vs Vite (Module Federation 또는 재작성 필요)
- ⚠️ 인증 3종 병존 — JWT vs OAuth vs HMAC (SSO 레이어 필요)
- ⚠️ Neo4j 의존 — AI Foundry 온톨로지는 별도 서비스 유지

### 1.3 Related Documents

- PRD: [[FX-SPEC-PRD-V5]] §7.2 축6, §7.12 기술 스택, Phase 4 범위
- SPEC: [[FX-SPEC-001]] v5.6
- Sprint 25 감사: [[FX-PLAN-026]] (기술 스택 점검 결과)
- 기존 MCP 설계: [[FX-DSGN-009]] (mcp-protocol.design.md)

---

## 2. Scope

### 2.1 In Scope

- [ ] **F106**: 프론트엔드 통합 — Discovery-X/AI Foundry UI를 Foundry-X 서브 라우트로 통합
- [ ] **F108**: 인증 SSO 통합 — 단일 JWT 기반 SSO + Org별 서비스 권한
- [ ] **F109**: API BFF→통합 — Foundry-X Workers가 서비스 API 프록시
- [ ] **F111**: D1 스키마 통합 — 크로스 서비스 쿼리 + 메타데이터 연결

### 2.2 Out of Scope

- Discovery-X Remix → Next.js 전체 재작성 (Big Bang 마이그레이션 금지 — PRD v5 §7.12)
- AI Foundry Neo4j → D1 마이그레이션 (외부 서비스로 유지 결정)
- AI Foundry 12 Workers 통합 (Service Bindings 프록시만)
- 모바일/네이티브 앱 지원
- 외부 고객사 접근 (Phase 5 범위)

---

## 3. Feature Details

### 3.1 F106 — 프론트엔드 통합

**전략: Next.js Proxy + Iframe Hybrid**

Discovery-X(Remix)와 AI Foundry(Vite SPA)를 Next.js로 **재작성하지 않고** 통합하는 전략:

```
fx.minu.best/                     → Foundry-X (Next.js, 네이티브)
fx.minu.best/discovery/           → Discovery-X (Proxy → dx.minu.best)
fx.minu.best/foundry/             → AI Foundry (Proxy → aif.workers.dev)
```

#### 구현 방법

1. **Next.js Rewrites**: `next.config.js`에 서브 경로를 각 서비스로 프록시
2. **통합 네비게이션**: Foundry-X의 Sidebar에 Discovery-X/AI Foundry 메뉴 추가
3. **서비스 컨테이너**: iframe 또는 Next.js `rewrites`로 기존 서비스를 서브 경로에 임베드
4. **공유 레이아웃**: AXIS DS 기반 통합 Sidebar + Top Nav — 서비스 간 일관된 네비게이션

#### 산출물

| 파일 | 변경 내용 |
|------|-----------|
| `packages/web/next.config.mjs` | rewrites 규칙 추가 (discovery/*, foundry/*) |
| `packages/web/src/app/(app)/discovery/` | Discovery-X 프록시 라우트 |
| `packages/web/src/app/(app)/foundry/` | AI Foundry 프록시 라우트 |
| `packages/web/src/components/layout/` | 통합 Sidebar (서비스 스위처 메뉴) |

#### 검증 기준

- [ ] fx.minu.best/discovery/ 에서 Discovery-X 기능 접근 가능
- [ ] fx.minu.best/foundry/ 에서 AI Foundry 기능 접근 가능
- [ ] Sidebar 네비게이션으로 서비스 간 전환
- [ ] AXIS DS 디자인 일관성 유지

### 3.2 F108 — 인증 SSO 통합

**전략: Foundry-X JWT를 Hub 토큰으로 승격**

```
                    ┌─────────────┐
                    │  사용자 로그인  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Foundry-X   │
                    │ JWT 발급     │
                    │ (Hub Token)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │ Discovery-X│ │ FX API│ │ AI Foundry│
        │ 토큰 검증  │ │ 네이티브│ │ 토큰 검증  │
        └───────────┘ └───────┘ └───────────┘
```

#### 구현 방법

1. **Hub Token**: Foundry-X JWT에 `services` 클레임 추가 — 접근 가능한 서비스 목록
2. **서비스별 토큰 검증 미들웨어**: 각 서비스 Workers에 Foundry-X JWT 검증 로직 추가
3. **기존 인증 유지**: Discovery-X Google OAuth, AI Foundry HMAC은 폴백으로 유지
4. **Org별 서비스 권한**: `org_services` 테이블 — Org마다 접근 가능한 서비스 설정

#### 산출물

| 파일 | 변경 내용 |
|------|-----------|
| `packages/api/src/services/auth.ts` | Hub Token 발급 (services 클레임) |
| `packages/api/src/middleware/sso-verify.ts` | 크로스 서비스 JWT 검증 미들웨어 |
| `packages/api/src/routes/auth.ts` | SSO 엔드포인트 (token exchange) |
| `packages/api/src/db/migrations/0017_*.sql` | org_services 테이블 |
| `packages/shared/src/sso.ts` | SSO 공유 타입 + 검증 유틸 |

#### 검증 기준

- [ ] Foundry-X 로그인 한 번으로 Discovery-X/AI Foundry 접근
- [ ] 서비스별 권한 제어 (Org Admin이 서비스 활성화/비활성화)
- [ ] 기존 독립 인증 경로도 폴백으로 동작
- [ ] JWT 토큰 갱신 시 서비스 권한 자동 반영

### 3.3 F109 — API BFF→통합

**전략: Foundry-X Workers를 API Gateway로 활용**

```
클라이언트 → Foundry-X Workers (BFF)
                 ├── /api/*           → 네이티브 (Hono 라우트)
                 ├── /api/dx/*        → Service Binding → Discovery-X Workers
                 └── /api/aif/*       → Service Binding → AI Foundry Workers
```

#### 구현 방법

1. **Service Bindings**: `wrangler.toml`에 Discovery-X/AI Foundry Workers 바인딩 추가
2. **BFF 프록시 라우트**: `/api/dx/*`, `/api/aif/*` 경로를 각 서비스로 프록시
3. **인증 주입**: BFF에서 Hub Token 검증 후, 서비스별 인증 헤더 변환
4. **응답 정규화**: 각 서비스의 응답 형식을 통일된 API 포맷으로 변환

#### 산출물

| 파일 | 변경 내용 |
|------|-----------|
| `packages/api/wrangler.toml` | services 바인딩 추가 |
| `packages/api/src/routes/proxy.ts` | BFF 프록시 라우트 |
| `packages/api/src/services/service-proxy.ts` | Service Binding 프록시 서비스 |
| `packages/api/src/middleware/bff-auth.ts` | BFF 인증 변환 미들웨어 |

#### 검증 기준

- [ ] /api/dx/* 경로로 Discovery-X API 접근 가능
- [ ] /api/aif/* 경로로 AI Foundry API 접근 가능
- [ ] Hub Token으로 인증 통과
- [ ] Service Binding 성능 (콜드 스타트 없음)

### 3.4 F111 — D1 스키마 통합

**전략: 공유 메타데이터 테이블 + 크로스 서비스 뷰**

D1 데이터베이스는 각 서비스별로 유지하되, Foundry-X D1에 **통합 메타데이터 테이블**을 추가하여 크로스 서비스 쿼리를 가능하게 한다.

#### 구현 방법

1. **통합 메타데이터 테이블**: `service_entities` — 각 서비스의 핵심 엔티티 참조
2. **크로스 서비스 링크**: Discovery-X 실험 → AI Foundry 스킬 → Foundry-X 에이전트 태스크 연결
3. **동기화 서비스**: 각 서비스의 웹훅/이벤트로 메타데이터 자동 갱신
4. **통합 쿼리 API**: 크로스 서비스 엔티티 검색 + 관계 그래프

#### 산출물

| 파일 | 변경 내용 |
|------|-----------|
| `packages/api/src/db/migrations/0017_*.sql` | service_entities, entity_links 테이블 |
| `packages/api/src/services/entity-registry.ts` | 크로스 서비스 엔티티 레지스트리 |
| `packages/api/src/services/entity-sync.ts` | 서비스 이벤트 → 메타데이터 동기화 |
| `packages/api/src/routes/entities.ts` | 통합 엔티티 API (검색, 관계, 그래프) |
| `packages/api/src/schemas/entity.ts` | Zod 스키마 |

#### 검증 기준

- [ ] Discovery-X 실험 → Foundry-X 메타데이터로 조회 가능
- [ ] AI Foundry 스킬 → Foundry-X 메타데이터로 조회 가능
- [ ] 크로스 서비스 관계 그래프 (실험 → 스킬 → 에이전트 태스크)
- [ ] 웹훅 기반 자동 동기화

---

## 4. Implementation Plan

### 4.1 작업 순서

```
Phase 1: F108 인증 SSO (기반, ~45min)
├── 1-1. Hub Token 설계 + JWT 클레임 확장
├── 1-2. org_services 테이블 (D1 migration 0017)
├── 1-3. SSO 검증 미들웨어 + 엔드포인트
├── 1-4. shared/sso.ts 공유 타입
└── 1-5. SSO 테스트 스위트

Phase 2: F109 API BFF (프록시, ~30min)
├── 2-1. wrangler.toml Service Bindings 설정
├── 2-2. proxy.ts BFF 프록시 라우트
├── 2-3. service-proxy.ts 서비스 프록시 서비스
├── 2-4. bff-auth.ts 인증 변환 미들웨어
└── 2-5. BFF 프록시 테스트

Phase 3: F106 프론트엔드 통합 (UI, ~60min)
├── 3-1. next.config.mjs rewrites 설정
├── 3-2. discovery/ 서브 라우트 + 컨테이너
├── 3-3. foundry/ 서브 라우트 + 컨테이너
├── 3-4. 통합 Sidebar 서비스 스위처
├── 3-5. SSO 토큰 전달 (iframe postMessage 또는 cookie)
└── 3-6. E2E 통합 테스트

Phase 4: F111 D1 스키마 통합 (데이터, ~45min)
├── 4-1. D1 migration 0017: service_entities + entity_links
├── 4-2. entity-registry.ts 서비스
├── 4-3. entity-sync.ts 웹훅 동기화
├── 4-4. entities.ts 라우트 + 스키마
└── 4-5. 크로스 서비스 쿼리 테스트

Phase 5: 통합 + 배포
├── 5-1. typecheck + lint + test 전부 pass
├── 5-2. Workers 배포 (v2.1)
├── 5-3. Pages 배포 + 통합 검증
└── 5-4. 크로스 서비스 E2E 검증
```

### 4.2 의존 관계

```
F108 (SSO) ──────┐
                  ├──→ F109 (BFF) ──→ F106 (Frontend) ──→ F111 (Data)
F108 필수 선행    │                    F109의 프록시 경로    F106 + F109 기반
                  └──→ F111 (Data sync에 인증 필요)
```

**핵심**: F108(SSO)이 모든 것의 기반. BFF 프록시와 프론트엔드 모두 SSO 토큰에 의존.

### 4.3 Worker 분배 계획 (Agent Teams)

| Worker | 담당 | 의존 |
|--------|------|------|
| **W1** | F108 SSO + F109 BFF (백엔드) | 없음 (선행) |
| **W2** | F106 프론트엔드 + F111 D1 스키마 | W1 완료 후 |

### 4.4 예상 산출물

| 산출물 | 위치 | 타입 |
|--------|------|------|
| SSO 인증 미들웨어 | `packages/api/src/middleware/sso-verify.ts` | 코드 |
| SSO 공유 타입 | `packages/shared/src/sso.ts` | 코드 |
| BFF 프록시 라우트 | `packages/api/src/routes/proxy.ts` | 코드 |
| Service Proxy 서비스 | `packages/api/src/services/service-proxy.ts` | 코드 |
| 통합 Sidebar | `packages/web/src/components/layout/` | 코드 |
| Discovery 서브 라우트 | `packages/web/src/app/(app)/discovery/` | 코드 |
| Foundry 서브 라우트 | `packages/web/src/app/(app)/foundry/` | 코드 |
| Entity Registry | `packages/api/src/services/entity-registry.ts` | 코드 |
| D1 migration 0017 | `packages/api/src/db/migrations/0017_*.sql` | SQL |

### 4.5 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|:----:|:----:|------|
| Service Bindings 미지원 (free plan) | 낮음 | 높음 | 대안: fetch() 직접 호출 (약간의 latency 증가) |
| iframe CSP 차단 | 중간 | 중간 | Discovery-X/AI Foundry의 X-Frame-Options 헤더 조정. 또는 rewrites 프록시 방식 사용 |
| JWT 비밀키 공유 이슈 | 낮음 | 높음 | 서비스별 공개키 배포 (asymmetric JWT) 또는 Workers Secrets 공유 |
| D1 크로스 서비스 트랜잭션 불가 | 높음 | 중간 | 메타데이터만 Foundry-X D1에 저장. eventual consistency 수용 |
| 프론트엔드 CORS 이슈 | 중간 | 낮음 | BFF 프록시 경유로 same-origin 보장 |
| 스프린트 범위 과다 (4개 F-item) | 중간 | 중간 | F111(D1 스키마)을 MVP 수준(메타데이터 테이블 + 기본 CRUD만)으로 축소 가능 |

---

## 5. Success Criteria

| 기준 | 목표 |
|------|------|
| F106 프론트엔드 통합 | fx.minu.best에서 3개 서비스 네비게이션 가능 |
| F108 SSO 통합 | 한 번 로그인으로 전체 서비스 접근 |
| F109 API BFF | /api/dx/*, /api/aif/* 프록시 동작 |
| F111 D1 스키마 | 크로스 서비스 엔티티 조회 + 관계 |
| 기존 테스트 유지 | API 535 + Web 48 + E2E ~51 전부 pass |
| typecheck | 0 에러 |
| 빌드 | 성공 |
| 배포 | Workers v2.1 + Pages 배포 완료 |
| Match Rate | ≥ 90% |

---

## 6. PDCA 스케줄

| 단계 | 내용 | 예상 시간 |
|------|------|:---------:|
| **Plan** | 본 문서 작성 | ✅ 완료 |
| **Design** | 상세 설계 (API 스키마, 시퀀스 다이어그램) | ~20min |
| **Do** | 구현 (Agent Teams W1+W2) | ~120min |
| **Check** | Gap Analysis | ~10min |
| **Act** | 보정 (필요 시) | ~15min |
| **Report** | 완료 보고서 | ~10min |
