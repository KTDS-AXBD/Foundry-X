---
id: FX-REPORT-275
title: Sprint 275 완료 보고서 — F518 Work Ontology 기반 연결
sprint: 275
f_items: [F518]
req: FX-REQ-546
match_rate: 91
test_result: pass
status: done
created: 2026-04-13
---

# Sprint 275 완료 보고서 — F518 Work Ontology 기반 연결

## 요약

Work Lifecycle KG(Knowledge Graph)를 D1에 구축하고, SPEC.md + GitHub API에서 자동으로 노드/엣지를 생성하는 파이프라인을 구현했어요. KG 기반 그래프 탐색 API와 인증 불필요 공개 Roadmap/Changelog 뷰를 추가했어요.

## 구현 결과

| 항목 | 결과 |
|------|------|
| D1 Migration | 0131_work_kg.sql (work_kg_nodes + work_kg_edges) |
| TDD 테스트 | 18 tests PASS (Green 100%) |
| API 엔드포인트 | 4개 (공개 3 + 인증 1) |
| 웹 라우트 | 2개 (공개 /roadmap + /changelog) |
| Gap Match Rate | **91%** (≥ 90% 기준 충족) |

## 변경 파일 목록 (+9 files)

| # | 파일 | 변경 | 내용 |
|---|------|------|------|
| 1 | `packages/api/src/db/migrations/0131_work_kg.sql` | 신규 | work_kg 테이블 |
| 2 | `packages/api/src/services/work-kg.service.ts` | 신규 | KG 빌드/탐색 서비스 |
| 3 | `packages/api/src/__tests__/work-kg.service.test.ts` | 신규 | TDD 18 tests |
| 4 | `packages/api/src/__tests__/helpers/mock-d1.ts` | 수정 | work_kg 테이블 추가 |
| 5 | `packages/api/src/schemas/work.ts` | 수정 | KgNode/Edge/Graph/SyncOutput 스키마 |
| 6 | `packages/api/src/routes/work-public.ts` | 신규 | 공개 API 라우터 |
| 7 | `packages/api/src/routes/work.ts` | 수정 | KG sync 엔드포인트 추가 |
| 8 | `packages/api/src/app.ts` | 수정 | workPublicRoute 등록 (auth 이전) |
| 9 | `packages/web/src/routes/roadmap.tsx` | 신규 | 공개 Roadmap 페이지 |
| 10 | `packages/web/src/routes/changelog.tsx` | 신규 | 공개 Changelog 페이지 (트레이서빌리티 링크) |
| 11 | `packages/web/src/router.tsx` | 수정 | 공개 라우트 2개 추가 |
| 12 | `packages/web/e2e/roadmap-changelog.spec.ts` | 신규 | E2E 4 tests |

## KG 스키마

### 노드 타입 (10종)
`IDEA | BACKLOG | REQ | F_ITEM | SPRINT | PHASE | PR | COMMIT | DEPLOY | CHANGELOG`

### 엣지 타입 (5종)
`implements | belongs_to | derives_from | contains | deploys_to`

### 노드 ID 형식
```
work:FITEM:F518     → F-item 노드
work:REQ:FX-REQ-546 → REQ 노드
work:SPRINT:275     → Sprint 노드
work:PR:540         → PR 노드
work:COMMIT:abc1234 → Commit 노드
```

## API 엔드포인트

| 엔드포인트 | 인증 | 설명 |
|-----------|------|------|
| `GET /api/work/public/roadmap` | ❌ | Phase 진행 현황 |
| `GET /api/work/public/changelog` | ❌ | Changelog 콘텐츠 |
| `GET /api/work/public/kg/trace?id=...&depth=N` | ❌ | KG 그래프 탐색 |
| `POST /api/work/kg/sync` | ✅ | SPEC.md + PR → KG 동기화 |

## Gap Analysis (Match Rate 91%)

| 체크포인트 | 결과 |
|-----------|------|
| work_kg_nodes/edges 테이블 | ✅ PASS |
| syncFromSpec 노드 생성 | ✅ PASS |
| syncFromGitHub PR 노드 | ✅ PASS |
| traceGraph BFS | ✅ PASS |
| /api/work/public/kg/trace 무인증 | ✅ PASS |
| /roadmap 공개 접근 | ✅ PASS |
| /changelog 공개 접근 | ✅ PASS |
| router.tsx 공개 라우트 2건 | ✅ PASS |
| workPublicRoute auth 이전 등록 | ✅ PASS |

### 의도적 제외 (Design 역동기화 완료)
- `Sprint → Phase belongs_to` 엣지: Sprint 번호로 Phase 추정이 fragile → 후속 Sprint에서 별도 sync API로 분리

## Phase 37 완료 현황

| F-item | 상태 | Sprint |
|--------|------|--------|
| F516 — Backlog 인입 파이프라인 | ✅ | 273 |
| F517 — 메타데이터 트레이서빌리티 | ✅ | 274 |
| F518 — Work Ontology 기반 연결 | ✅ (PR 대기) | 275 |

**Phase 37 Work Lifecycle Platform 완료** 🎉
