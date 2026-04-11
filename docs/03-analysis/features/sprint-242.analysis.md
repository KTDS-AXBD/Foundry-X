---
code: FX-ANLS-S242
title: "Sprint 242 Analysis — F493 발굴 평가결과서 v2 Gap 분석"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint/242 autopilot)
sprint: 242
f_items: [F493]
match_rate: 97
---

# Sprint 242 Analysis — F493 Gap Analysis

## Executive Summary

| 항목 | 값 |
|------|-----|
| Match Rate | **97%** (23 요소 중 22.3 충족) |
| Status | ✅ PASS (≥ 90%) |
| 미달 항목 | E2E functional assertion (smoke 수준만 구현) |

## Design ↔ Implementation 매핑

### §1 데이터 모델

| Design 요소 | 구현 위치 | 상태 |
|------|------|------|
| Migration 0124 `report_data TEXT` | `packages/api/src/db/migrations/0124_evaluation_reports_v2.sql` | ✅ |
| `idx_eval_reports_biz_item` | 동일 파일 | ✅ |
| `DiscoveryReportDataSchema` (9탭 Zod) | `packages/api/src/modules/gate/schemas/evaluation-report.schema.ts:103` | ✅ |
| `EvaluationReport.reportData` 필드 | 동일 파일 line 24 | ✅ |

### §2 Fixture

| Design 요소 | 구현 위치 | 상태 |
|------|------|------|
| `bi-koami-001.json` (500~900줄 목표) | `packages/api/src/fixtures/discovery-reports/bi-koami-001.json` (511줄) | ✅ |
| `bi-xr-studio-001.json` | 동일 디렉토리 (464줄) | ✅ |
| `bi-iris-001.json` | 동일 디렉토리 (467줄) | ✅ |

### §3 API

| Design 요소 | 구현 위치 | 상태 |
|------|------|------|
| `generateFromFixture()` | `evaluation-report-service.ts:110` | ✅ |
| Legacy `skill_scores` 호환 삽입 | 동일 파일 | ✅ |
| POST `/ax-bd/evaluation-reports/seed-fixtures` | `routes/evaluation-report.ts:31` | ✅ |
| Static fixture import (Workers `fs` 불가 대응) | `routes/evaluation-report.ts:14` | ✅ |
| `FIXTURE_MAP` 구조 | 동일 | ✅ |
| `rowToReport` reportData 파싱 | `evaluation-report-service.ts:66-71` | ✅ |

### §4 Frontend

| Design 요소 | 구현 위치 | 상태 |
|------|------|------|
| `evaluation-report.tsx` v2 in-place 재작성 | `packages/web/src/routes/ax-bd/evaluation-report.tsx` | ✅ |
| `DiscoveryReportV2View.tsx` | `components/feature/discovery/report-v2/` | ✅ |
| `TabRenderer.tsx` (범용 블록 기반) | 동일 디렉토리 | ✅ |
| Block 6종 (Card/Metric/Table/Insight/NextStep/Chart) | `report-v2/blocks/*.tsx` (6 파일) | ✅ |
| Chart = recharts (신규 의존성 X) | `ChartBlock.tsx` | ✅ (§4.4 변경 주석 반영) |
| CSS `--discovery-*` 변수 재사용 | `globals.css` 기존 사용 | ✅ |

### §6 테스트

| Design 요소 | 구현 위치 | 상태 |
|------|------|------|
| API service test | `packages/api/src/__tests__/evaluation-report.test.ts` | ✅ |
| Web render test | `packages/web/src/__tests__/discovery-report-v2.test.tsx` | ✅ |
| E2E smoke (`/discovery/report` 목록 3건 + 탭) | `packages/web/e2e/uncovered-pages.spec.ts` | ⚠️ 부분 |

**E2E 미달 상세**: design §6.3는 KOAMI/XR/IRIS 3건 visible + 탭 전환 + TAM 카드 검증 요구. 현 E2E는 empty 응답 mock + heading 렌더만 확인 (기본 smoke). Functional assertion 보강은 후속 Sprint에서 prod seed 완료 후 진행 (E2E → F490 timeout 트랙과 함께 일괄 점검 권장).

### §7~§8 배포·Deprecation

| Design 요소 | 구현 위치 | 상태 |
|------|------|------|
| `scripts/seed-discovery-reports.sh` | `scripts/seed-discovery-reports.sh` | ✅ |
| `INSERT OR REPLACE` idempotent | `generateFromFixture` 내부 | ✅ |
| `generate()` `@deprecated` JSDoc | `evaluation-report-service.ts:158` | ✅ |

## Match Rate 계산

```
Fully met:    22 / 23
Partial:       1 / 23 × 0.3 = 0.3
Total:        22.3 / 23 = 96.9%
```

## 결론

**97% ≥ 90%** — 완료 보고로 진행 가능. E2E functional 보강은 prod seed 실행 직후 별도 small PR 또는 F490 E2E 최적화 트랙에 병합 권장.
