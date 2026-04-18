---
id: FX-PLAN-311
title: Sprint 311 Plan — F560 Discovery 완전 이관 + F566 MSA Roadmap v2
sprint: 311
date: 2026-04-19
status: active
---

# Sprint 311 Plan

## F-items

| F-item | 제목 | REQ | Priority | 분류 |
|--------|------|-----|----------|------|
| F560 | Discovery 완전 이관 (Gap 1 해소) | FX-REQ-603 | P0 | Code |
| F566 | MSA Separation Roadmap v2 | FX-REQ-609 | P0 | Meta/Docs |

---

## F560 현황 분석 (2026-04-19)

### F539c 이후 완료 상태

F539c (Sprint 296, PR #597)에서 원래 7개 proxy 엔드포인트가 fx-discovery로 이전됨:
- Group A: GET/POST /biz-items, GET /biz-items/:id (3개)
- Group B: GET/POST /biz-items/:id/discovery-progress|stage (2개), GET /discovery-pipeline/runs/:id? (2개)

### 미완료 항목 (4개 route 파일)

| 파일 | URL 패턴 | 현재 처리 | 목표 |
|------|----------|----------|------|
| ax-bd-artifacts.ts | GET /ax-bd/artifacts | MAIN_API (fx-gateway `/api/ax-bd/*` → SHAPING) | fx-shaping 이전 |
| ax-bd-discovery.ts | POST /ax-bd/discovery/ingest | MAIN_API (fx-gateway `/api/ax-bd/*` → SHAPING) | fx-shaping 이전 |
| discovery-shape-pipeline.ts | POST/GET /pipeline/shape/* | MAIN_API (catch-all) | fx-discovery 이전 |
| discovery-stage-runner.ts | POST /biz-items/:id/discovery-stage/:stage/run|confirm<br>POST /biz-items/:id/discovery-graph/run-all | MAIN_API (catch-all) | **defer** — agent 도메인 deps |

### F539c KOAMI P2 Deferred 원인

SPEC 분석 결과: "KOAMI Smoke P2 미실측 — PR Test plan에 Graph 실행 증거 없음". 코드 버그가 아닌 **운영 검증 미실행**. 현재 코드는 정상이며 Phase Exit P1~P4 Smoke Reality를 실행하면 해소됨.

---

## F560 Sprint 311 구현 범위

### 구현 (코드 변경)

**A. ax-bd-artifacts.ts → fx-shaping 이전**
- fx-shaping에 BdArtifactService 이미 존재
- `packages/fx-shaping/src/routes/ax-bd-artifacts.ts` 신규 생성
- fx-shaping `app.ts`에 route 등록
- fx-gateway: `/api/ax-bd/*` → SHAPING 이미 동작 (추가 변경 불필요)

**B. ax-bd-discovery.ts → fx-shaping 이전**
- DiscoveryXIngestService는 collection 도메인. 
- collection 도메인 아직 분리 미착수 → fx-shaping에 서비스 복사 이전
- `packages/fx-shaping/src/routes/ax-bd-discovery.ts` 신규 생성
- `packages/fx-shaping/src/services/discovery-x-ingest.service.ts` 신규 생성

**C. discovery-shape-pipeline.ts → fx-discovery 이전**
- DiscoveryShapePipelineService는 OfferingService/ContentAdapterService 의존
  → fx-offering Service Binding 없이: DB 직접 쿼리로 단순화 또는 인라인 처리
- EventBus는 단순 pub/sub(in-memory) → fx-discovery에 복사
- `packages/fx-discovery/src/routes/discovery-shape-pipeline.ts` 신규 생성
- `packages/fx-discovery/src/services/discovery-shape-pipeline.service.ts` 신규 생성
- fx-gateway: `app.all("/api/pipeline/*", ...)` → DISCOVERY 추가
- discovery app.ts에 route 등록

**D. discovery-stage-runner 게이트웨이 라우팅 명시화**
- /api/biz-items/:id/discovery-graph/* → MAIN_API (명시적 라우트 추가, catch-all 의존 탈피)
- /api/biz-items/:id/discovery-stage/:stage/* → MAIN_API 명시
- 이유: agent 도메인 deps (F571 Sprint 318 이후 완결)

**E. Cross-domain grep 검증**
- `grep -rn "core/discovery"` in fx-shaping/fx-offering → 0건 목표

### 검증 (Phase Exit)

| # | 항목 | 방법 |
|---|------|------|
| P1 | Dogfood 1회 실행 | fx-gateway URL로 KOAMI bi-koami-001 접근 |
| P2 | 실측 산출물 | Discovery 10 routes 응답 확인 |
| P3 | 6축 메트릭 | `/api/discovery/health` + `/api/shaping/health` 200 |
| P4 | 회고 작성 | Sprint 보고서 |

---

## F566 구현 범위

`docs/specs/fx-msa-roadmap-v2/prd-final.md` v2 업데이트:
- §9 Phase 45 분리 로드맵 추가 (Sprint 311~318 배치 근거)
- §10 6 도메인 분리 우선순위 + 리소스/일정/롤백 시나리오
- §11 Phase 46+ 예측 로드맵

---

## TDD 계획

신규 서비스/라우트에 대해 TDD Red→Green 사이클:
- `packages/fx-shaping/src/__tests__/ax-bd-artifacts.test.ts`
- `packages/fx-shaping/src/__tests__/ax-bd-discovery.test.ts`
- `packages/fx-discovery/src/__tests__/discovery-shape-pipeline.test.ts`

---

## 전제 조건

- F541 MERGED ✅ (fx-offering Worker live)
- F539c MERGED ✅ (7 proxy routes in fx-discovery)
- F540 MERGED ✅ (fx-shaping Worker live)
