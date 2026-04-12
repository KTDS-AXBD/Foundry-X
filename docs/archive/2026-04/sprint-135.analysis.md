---
code: FX-ANLS-S135
title: "Sprint 135 — F316 Discovery E2E 테스트 Gap 분석"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-05
updated: 2026-04-05
author: Claude Code
sprint: 135
features: [F316]
design: "[[FX-DSGN-S135]]"
---

# Sprint 135 Gap Analysis — F316 Discovery E2E 테스트

## Match Rate: 100% (10/10 PASS)

## 상세 항목

| # | Design 항목 | 구현 상태 | 결과 |
|---|------------|----------|------|
| 1 | mock-factory에 `makePipelineRun()` 추가 | ✅ 구현 완료 | PASS |
| 2 | mock-factory에 `makeCheckpoint()` 추가 | ✅ 구현 완료 | PASS |
| 3 | T1: 위저드 아이템 전환 → 스텝퍼 갱신 | ✅ E2E pass | PASS |
| 4 | T2: 전체 완료(11/11) 상태 표시 | ✅ E2E pass | PASS |
| 5 | T3: 트래픽 라이트 표시 | ✅ E2E pass | PASS |
| 6 | T4: 빈 아이템 리스트 상태 | ✅ E2E pass | PASS |
| 7 | T5: 상세 프로세스 진행률 바 | ✅ E2E pass | PASS |
| 8 | T6: 상세 산출물 목록 | ✅ E2E pass | PASS |
| 9 | T7: 상세 뒤로가기 링크 | ✅ E2E pass | PASS |
| 10 | T8: 파이프라인 factory 데이터 검증 | ✅ E2E pass | PASS |
| 11 | T9: 대시보드 탭 전환 | ✅ E2E pass | PASS |
| 12 | T10: 대시보드 신호등 필터 | ✅ E2E pass | PASS |

## 변경 파일 요약

| 파일 | 동작 | 라인 |
|------|------|------|
| `e2e/fixtures/mock-factory.ts` | 수정 (+57 lines) | `makePipelineRun()` + `makeCheckpoint()` |
| `e2e/discovery-wizard-advanced.spec.ts` | 신규 (193 lines) | 4건 |
| `e2e/discovery-detail-advanced.spec.ts` | 신규 (168 lines) | 3건 |
| `e2e/discovery-pipeline-api.spec.ts` | 신규 (210 lines) | 3건 |
| **합계** | 3 신규 + 1 수정 | ~628 lines |

## Design 대비 변경사항

| Design 계획 | 실제 구현 | 사유 |
|-------------|----------|------|
| `/ax-bd/items/:id` 경로 | `/discovery/items/:id` | router.tsx 매핑 확인 후 수정 |
| `/ax-bd/discover` 경로 | `/discovery/dashboard` | router.tsx 매핑 확인 후 수정 |
| API mock `ax-bd/portfolio-progress` | `ax-bd/progress` | api-client.ts 실제 경로 확인 후 수정 |
| 4개 파일 (Design §4) | 3개 파일 | 에러 복구 + 통합 시나리오를 pipeline-api.spec.ts에 통합 |

## Skip 항목

| 항목 | 사유 | 해소 조건 |
|------|------|----------|
| CheckpointReviewPanel UI 직접 E2E | F315에서 라우트 연결 예정 | F315 완료 후 |
| AutoAdvanceToggle UI 직접 E2E | 동일 | F315 완료 후 |
| PipelineTimeline UI 직접 E2E | 동일 | F315 완료 후 |

> Skip 항목은 mock-factory에 데이터가 준비되어 있어 F315 후 빠르게 추가 가능
