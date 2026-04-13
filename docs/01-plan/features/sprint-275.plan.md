---
id: FX-PLAN-275
title: Sprint 275 Plan — F518 Work Ontology 기반 연결
sprint: 275
f_items: [F518]
req: FX-REQ-546
priority: P0
status: done
created: 2026-04-13
---

# Sprint 275 Plan — F518 Work Ontology 기반 연결

## 1. 목표

Work Lifecycle KG(Knowledge Graph)를 D1에 구축하고, SPEC.md + GitHub API에서 자동으로 노드/엣지를 생성한다.
KG 기반 그래프 탐색 API를 추가하고, 인증 없이 접근 가능한 공개 Roadmap/Changelog 뷰를 제공한다.

## 2. 배경

- F516(Sprint 273): Backlog 인입 파이프라인 ✅
- F517(Sprint 274): 메타데이터 트레이서빌리티 (REQ↔F-item↔Sprint↔PR 선형 체인) ✅
- F518(Sprint 275): KG로 고도화 — 선형 체인 → 그래프 탐색 + 외부 공개 뷰

## 3. 핵심 요구사항 (FX-REQ-546)

| # | 요구사항 | 우선순위 |
|---|----------|----------|
| R1 | Work KG 스키마: 10 노드타입 + 5 엣지타입 D1 테이블 | P0 |
| R2 | SPEC.md 파싱 → REQ/F-item/Sprint/Phase 노드 자동생성 | P0 |
| R3 | GitHub API → PR/Commit 노드 + 엣지 자동생성 | P0 |
| R4 | KG 그래프 탐색 API: GET /api/work/kg/trace?id=... | P1 |
| R5 | POST /api/work/kg/sync: 전체 KG 갱신 | P0 |
| R6 | 공개 Roadmap 뷰 (/roadmap) — 인증 불필요 | P1 |
| R7 | 공개 Changelog 뷰 (/changelog) — 인증 불필요, 트레이서빌리티 링크 포함 | P1 |

## 4. 스코프 경계

### In Scope
- D1 migration 0131: `work_kg_nodes` + `work_kg_edges` 신규 테이블
- `work-kg.service.ts`: KG 빌드 + 탐색 로직
- API 엔드포인트 2개 (KG trace, KG sync)
- 공개 웹 라우트 2개 (`/roadmap`, `/changelog`)
- 라우터에서 공개 라우트 인증 우회 처리

### Out of Scope
- 인터랙티브 그래프 탐색 UI (P2 → 후속 Sprint)
- 기존 org KG (`kg_nodes/kg_edges`) 수정
- KG 노드에서 SPEC.md 역방향 업데이트

## 5. 기술 선택

| 항목 | 선택 | 근거 |
|------|------|------|
| KG 테이블 | 신규 `work_kg_nodes/work_kg_edges` | 기존 org KG와 `org_id` 의미 충돌 방지 |
| 노드 ID 형식 | `work:REQ:FX-REQ-546`, `work:FITEM:F518` | 타입 접두사로 충돌 방지 + 가독성 |
| 공개 라우트 인증 | URL prefix `/roadmap`, `/changelog` → 인증 미들웨어 skip | 기존 auth guard 패턴 확인 필요 |
| SPEC.md 파싱 | `TraceabilityService.parseFItemLinks()` 재활용 | F517에서 이미 검증된 파서 |

## 6. TDD 계획

### TDD 필수 (API 서비스 로직)
- `work-kg.service.ts` 핵심 메서드: `syncFromSpec()`, `traceGraph()`
- Red: 빈 stub export → vitest FAIL
- Green: 최소 구현으로 테스트 통과

### TDD 권장 (E2E)
- `/roadmap`, `/changelog` 공개 접근 가능 여부
- `/api/work/kg/trace` 응답 구조 검증

## 7. 파일 매핑

| 파일 | 액션 | 내용 |
|------|------|------|
| `packages/api/src/db/migrations/0131_work_kg.sql` | 신규 | work_kg_nodes + work_kg_edges 테이블 |
| `packages/api/src/services/work-kg.service.ts` | 신규 | KG 빌드/탐색 서비스 |
| `packages/api/src/routes/work.ts` | 수정 | KG trace + sync 엔드포인트 추가 |
| `packages/web/src/routes/roadmap.tsx` | 신규 | 공개 Roadmap 뷰 |
| `packages/web/src/routes/changelog.tsx` | 신규 | 공개 Changelog 뷰 |
| `packages/web/src/router.tsx` | 수정 | 공개 라우트 2개 추가 (인증 bypass) |
| `packages/api/src/routes/work.ts` (스키마) | 수정 | KgTraceResult / KgSyncOutput 스키마 |

## 8. 위험 요소

| 위험 | 대응 |
|------|------|
| GitHub API 레이트 리밋 | sync 시 캐시(D1) 우선, TTL 1h |
| SPEC.md 파서 노이즈 | 기존 `parseFItemLinks()` 재활용 + 노드 upsert |
| 공개 라우트 auth bypass 누락 | 라우터 설정 검토 + E2E 테스트로 검증 |
