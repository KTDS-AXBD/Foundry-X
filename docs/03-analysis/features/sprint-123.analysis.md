---
code: FX-ANLS-S123
title: "Sprint 123 — F301 Gap Analysis"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-03
updated: 2026-04-03
author: Claude Opus 4.6
sprint: 123
f_items: [F301]
---

# FX-ANLS-S123 — Sprint 123: F301 Gap Analysis

## Match Rate: 100% (10/10 PASS)

## Gap Analysis

| # | Design 항목 | 구현 상태 | 결과 |
|---|------------|-----------|------|
| 1 | discovery-detail에 ArtifactList 삽입 | `<ArtifactList bizItemId={id} />` | PASS |
| 2 | discovery-detail에 프로세스 진행률 바 | 7단계 스텝 바 + currentStage 하이라이트 + completedCount | PASS |
| 3 | getDiscoveryProgress 병렬 호출 | `Promise.all([fetchBizItemDetail, getDiscoveryProgress])` | PASS |
| 4 | STAGE_LABELS/STAGE_COLORS 재사용 | `import from item-card.tsx` | PASS |
| 5 | pipeline useNavigate 전환 | `window.location.href` → `navigate("/ax-bd/" + id)` | PASS |
| 6 | mvp-tracking bizItemId Link | `<Link to={/ax-bd/${bizItemId}}>` + 조건부 렌더링 | PASS |
| 7 | bizItemId 없을 때 "-" 유지 | `{item.bizItemId ? <Link>...</Link> : "-"}` | PASS |
| 8 | 신규 파일 0건 | 기존 ArtifactList + api-client 재사용 | PASS |
| 9 | Web 테스트 통과 | 46/46 files, 314/314 tests | PASS |
| 10 | Typecheck 통과 (F301 파일) | F301 변경 파일 에러 0건 | PASS |

## 변경 파일 요약

| 파일 | 변경 | LOC |
|------|------|-----|
| `packages/web/src/routes/ax-bd/discovery-detail.tsx` | 수정 | +50 |
| `packages/web/src/routes/pipeline.tsx` | 수정 | +3, -3 |
| `packages/web/src/routes/mvp-tracking.tsx` | 수정 | +10, -2 |
| `packages/web/src/__tests__/mvp-tracking.test.tsx` | 수정 | +2, -1 (MemoryRouter 추가) |

## 검증 결과
- Typecheck: F301 파일 에러 0건 (기존 validation-*.tsx 3건은 pre-existing)
- Tests: 314/314 통과 (mvp-tracking 테스트 MemoryRouter 추가로 수정)
