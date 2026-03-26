---
code: FX-PLAN-066
title: "Sprint 66 — F205 Homepage 재구성 + F208 Discovery-X API 스펙"
version: 1.0
status: Active
category: PLAN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 66
features: [F205, F208]
req: [FX-REQ-197, FX-REQ-200]
prd: docs/specs/prd-v8-final.md, docs/specs/ax-bd-atoz/prd-final.md
depends-on: Sprint 64 완료 (F203+F204)
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | Landing page가 Sprint 46 수치(163 endpoints, 76 services)로 정지. README.md도 착수 패키지 그대로. 팀원/의사결정권자에게 "지금 뭘 하고 있는지" 전달 불가. Discovery-X API 연동 스펙이 미정의 상태로 향후 수집 단계 통합에 블로커 |
| **Solution** | (1) Landing page + README를 최신 수치(192 endpoints, 116 services, 1481 tests)와 Phase 5d BDP 기능으로 갱신 (2) Discovery-X API 인터페이스 계약을 OpenAPI 3.1 + TypeScript 타입으로 정의 |
| **Function UX Effect** | fx.minu.best 방문 → 최신 BDP 7단계 프로세스·실시간 수치 확인 / Discovery-X 개발자 → OpenAPI spec으로 연동 계약 파악 |
| **Core Value** | "AX BD팀은 Foundry-X로 사업개발 한다" — 1문장 설명이 Homepage에서 즉시 가능. Discovery-X 연동의 기술적 합의 기반 확보 |

| 항목 | 값 |
|------|-----|
| Feature | F205 Homepage 재구성 + F208 Discovery-X API 스펙 |
| Sprint | 66 |
| PRD | FX-SPEC-PRD-008 v8 (플랫폼) + FX-PLAN-AX-BD-ATOZ prd-final (A-to-Z) |
| 선행 조건 | Sprint 64 완료 ✅ |
| 병렬 대상 | F205(Web) vs F208(API 스펙+타입) — 파일 겹침 없음 |
| Worker 구성 | W1: F205 (Homepage+README), W2: F208 (OpenAPI+타입) |

---

## 1. Feature 상세

### F205 — Foundry-X 소개 상시 최신화 (FX-REQ-197, P1)

**목표**: Landing page와 README.md를 현행 기준(Sprint 64, Phase 5d)으로 재구성. 1차 독자: AX BD팀, 2차: 타부서/의사결정권자.

**갱신 항목**:

| # | 영역 | 현재 (낡은) | 목표 (최신) |
|---|------|------------|------------|
| 1 | SITE_META | Sprint 46, Phase 5 고객 파일럿 | Sprint 64, Phase 5d AX BD Ideation MVP |
| 2 | Stats bar | 163 endpoints, 76 services, 1160 tests, 6 agents, 46 sprints | 192 endpoints, 116 services, 1,481+ tests, 64 sprints, 50 D1 migrations |
| 3 | Process Flow | 수주 파이프라인 4단계 | BDP 7단계 (수집→발굴→형상화→검증→제품화→GTM→평가) |
| 4 | Pillars | 에이전트/PoC 속도/SDD | BDP 라이프사이클/AI 에이전트 하네스/SDD Triangle |
| 5 | Agent 목록 | 6종 Phase 4 에이전트 | BMCAgent, InsightAgent 등 Phase 5d 에이전트 추가 |
| 6 | Architecture | 163 endpoints, 76 services, 30 routes | 192 endpoints, 116 services, 36 routes, 50 migrations |
| 7 | Roadmap | Phase 5까지 | Phase 5a~5e 세분화 |
| 8 | Ecosystem | 3종 (Discovery-X, AI Foundry, AXIS DS) | 역할 재정의 (prd-final 기반) |
| 9 | Footer | Sprint 50 · Phase 5 | 동적 Sprint 번호 (또는 Phase 5d) |
| 10 | README.md | 착수 패키지 (2026-03-16) | 프로젝트 개요+현재 상태+퀵스타트 |

**수정 파일**:
| # | 파일 | 변경 |
|---|------|------|
| 1 | `packages/web/src/app/(landing)/page.tsx` | 전체 데이터 + 섹션 재구성 |
| 2 | `packages/web/src/components/landing/navbar.tsx` | navLinks BDP 기반 갱신 |
| 3 | `packages/web/src/components/landing/footer.tsx` | Sprint 번호 + 링크 갱신 |
| 4 | `README.md` | 프로젝트 소개 전면 재작성 |

**UI 변경 없는 것**: 레이아웃 구조, CSS 클래스, 테마 시스템 — 데이터와 콘텐츠만 교체.

### F208 — Discovery-X API 인터페이스 계약 (FX-REQ-200, P1)

**목표**: Discovery-X → Foundry-X 수집 데이터 연동을 위한 API 계약 정의. OpenAPI 3.1 spec + TypeScript 타입.

**산출물**:
| # | 파일 | 설명 |
|---|------|------|
| 1 | `docs/specs/ax-bd-atoz/discovery-x-api-contract.md` | 인터페이스 계약 문서 (스키마, 인증, Rate Limit, Fallback, 에러 코드) |
| 2 | `packages/shared/src/discovery-x.ts` | TypeScript 타입 정의 (DiscoveryDataPayload, MarketTrend, Competitor 등) |
| 3 | `packages/api/src/schemas/discovery-x.schema.ts` | Zod 스키마 (수신 데이터 검증용) |
| 4 | `packages/api/src/routes/ax-bd-discovery.ts` | Webhook/Polling 수신 엔드포인트 (stub) |
| 5 | `packages/api/src/services/discovery-x-ingest-service.ts` | 수집 데이터 수신·검증·저장 서비스 (stub) |

**API Endpoints (stub)**:
| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | POST | `/api/ax-bd/discovery/ingest` | Discovery-X → Foundry-X 수집 데이터 수신 (webhook) |
| 2 | GET | `/api/ax-bd/discovery/status` | 연동 상태 확인 (health check) |
| 3 | POST | `/api/ax-bd/discovery/sync` | 수동 재동기화 트리거 |

**계약 핵심 요소**:
- **인증**: Bearer token (Discovery-X 전용 API key, D1 `api_keys` 테이블 또는 환경변수)
- **Rate Limit**: 60 req/min (token bucket)
- **Payload 스키마**: MarketTrend, CompetitorData, PainPoint, CollectionSource
- **에러**: 400 (스키마 불일치), 401 (인증 실패), 429 (Rate Limit), 503 (일시적 장애)
- **Fallback**: 수신 실패 시 DLQ(Dead Letter Queue) 패턴 — 별도 테이블에 보관 후 재처리

**코드 변경 없음 (F179과의 관계)**: F179(수집 채널 통합)은 실제 데이터 파이프라인 구현. F208은 **인터페이스 계약** 문서 + 타입/스키마 정의만. 구현은 향후 Sprint에서 F179를 확장.

---

## 2. D1 마이그레이션

이번 Sprint에서 D1 마이그레이션 없음.
- F205: 데이터 변경 없음 (프론트엔드 + README만)
- F208: stub 엔드포인트 + 타입 정의만 (실제 데이터 저장은 향후 Sprint)

---

## 3. Worker Plan

| Worker | Feature | 파일 범위 | 산출물 |
|--------|---------|-----------|--------|
| W1 | F205 Homepage 재구성 | `page.tsx`, `navbar.tsx`, `footer.tsx`, `README.md` | Landing 재구성 + README 재작성 |
| W2 | F208 Discovery-X API 스펙 | `discovery-x-api-contract.md`, `discovery-x.ts`, `discovery-x.schema.ts`, `ax-bd-discovery.ts`, `discovery-x-ingest-service.ts` | 계약 문서 + 타입 + stub API |

**파일 충돌 없음**: W1은 web/landing + README, W2는 shared/api/docs — 완전 독립 도메인.
**app.ts 라우트 등록**: W2의 stub 라우트를 리더가 merge 후 app.ts에 등록.

---

## 4. 테스트 전략

### F205 (Web)
- 기존 Web 테스트 패스 확인 (데이터 변경이므로 기능 테스트 없음)
- typecheck 통과

### F208 (API)
- `ax-bd-discovery.test.ts`: stub 엔드포인트 응답 검증 (~10 tests)
  - POST /ingest: 200 (정상), 400 (잘못된 payload), 401 (인증 실패)
  - GET /status: 200 (healthy)
  - POST /sync: 200 (trigger accepted)
- Zod 스키마 검증 테스트 (~5 tests)
- typecheck 통과

---

## 5. 리스크

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| 1 | Landing page 데이터 하드코딩 | 다음 Sprint에서도 수동 갱신 필요 | 추후 API에서 실시간 수치 조회 (Phase 6) |
| 2 | Discovery-X API 스펙 변경 가능성 | 계약 갱신 필요 | 버전 필드로 하위호환 관리 |
