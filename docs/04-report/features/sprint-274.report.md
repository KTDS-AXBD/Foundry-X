---
feature: F517
req: FX-REQ-545
sprint: 274
match_rate: 100
date: 2026-04-13
status: done
---

# Sprint 274 Report — F517 메타데이터 트레이서빌리티

## 요약

REQ↔F-item↔Sprint↔PR↔Commit 체인 D1 저장, API, Web UI 추적 탭을 구현했어요.

## 구현 결과

| 항목 | 결과 |
|------|------|
| D1 Migration 2개 (0129, 0130) | 완료 |
| TraceabilityService (4 메서드) | 완료 |
| API 2개 (GET /trace, POST /trace/sync) | 완료 |
| Web UI 추적 탭 | 완료 |
| TDD Red→Green 19 tests | 전부 PASS |
| 전체 API 테스트 (3584개) | 3581 PASS / 3 skip |
| Typecheck (api + web) | PASS |

## Gap Analysis

- **Match Rate: 100%**
- Design §8 체크리스트 8/8 PASS
- 추가 구현: `StructuredChangelogSchema` (Design 의도 부합)

## 파일 변경 목록

| 파일 | 변경 |
|------|------|
| `packages/api/src/db/migrations/0129_spec_traceability.sql` | NEW |
| `packages/api/src/db/migrations/0130_sprint_pr_links.sql` | NEW |
| `packages/api/src/services/traceability.service.ts` | NEW (373 lines) |
| `packages/api/src/schemas/work.ts` | +50 lines (스키마 6개 추가) |
| `packages/api/src/routes/work.ts` | +60 lines (엔드포인트 2개) |
| `packages/web/src/routes/work-management.tsx` | +180 lines (TraceTab) |
| `packages/api/src/__tests__/traceability.service.test.ts` | NEW (262 lines) |
| `packages/api/src/__tests__/helpers/mock-d1.ts` | +28 lines (새 테이블) |

## 학습

- SQLite `json_each.value` alias 문제 → `LIKE '%"F517"%'` 패턴이 더 안정적
- D1 mock에 새 테이블을 추가하면 테스트 환경 동기화 필수 (migration 파일과 동시 작업)
- PR body/title 양쪽에서 F번호를 파싱하는 fallback이 데이터 품질 개선에 효과적
