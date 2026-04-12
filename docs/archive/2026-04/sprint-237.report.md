---
code: FX-RPRT-S237
title: "Sprint 237 완료 보고서 — F484 파이프라인 UI + F487 리포트 버그"
version: "1.0"
status: Active
category: report
created: 2026-04-09
updated: 2026-04-09
author: Claude
sprint: 237
f_items: [F484, F487]
match_rate: 100
---

# Sprint 237 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 237 |
| Feature | F484 (파이프라인 UI 개선) + F487 (리포트 500 에러 수정) |
| 시작일 | 2026-04-09 |
| 완료일 | 2026-04-09 |
| Match Rate | **100%** (11/11 항목 PASS) |
| 변경 파일 | 3개 |
| 테스트 | 6/6 통과 (신규 3 + 기존 3) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 파이프라인 진행률이 시각적으로 불명확 + 팀장 결정 시 500 에러 |
| Solution | pulse 애니메이션 + 상태 라벨 + 진행률 바 + SQL 컬럼명 수정 |
| Function UX Effect | 현재 단계 즉시 인지 가능 + 리포트 페이지 정상 접근 |
| Core Value | Discovery 상세 페이지의 기본 품질 확보 |

## 변경 상세

### F487: 리포트 500 에러 수정 (P0)

**파일**: `packages/api/src/modules/gate/routes/team-reviews.ts`

| 변경 | 전 | 후 |
|------|---|---|
| SELECT | `WHERE item_id = ? OR biz_item_id = ?` | `WHERE item_id = ?` |
| INSERT | `(id, org_id, biz_item_id, ...)` | `(id, org_id, item_id, ...)` |

**근본 원인**: `ax_discovery_reports` 테이블은 `item_id` 컬럼으로 정의(0098 마이그레이션)되었으나, `team-reviews.ts`에서 존재하지 않는 `biz_item_id` 참조.

### F484: 파이프라인 진행률 UI 개선 (P1)

**파일**: `packages/web/src/components/feature/discovery/PipelineProgressStepper.tsx`

| 개선 항목 | 상세 |
|-----------|------|
| pulse 애니메이션 | 현재 단계 노드에 `animate-pulse` 적용 |
| 노드 크기 차별화 | 현재=h-8/w-8, 나머지=h-7/w-7 |
| 상태 라벨 | "완료" (초록) / "진행 중" (파랑) |
| 진행률 바 | 하단 프로그레스 바 + 퍼센트 표시 |

## 검증 결과

| # | 항목 | 결과 |
|---|------|------|
| D1 | decide SQL 문법 | ✅ PASS |
| D2 | discovery-report-service 미변경 | ✅ PASS |
| D3 | INSERT 컬럼명 일치 | ✅ PASS |
| D4~D7 | UI 개선 4항목 | ✅ PASS |
| D8~D11 | 테스트 4항목 | ✅ PASS |

## 교훈

1. **Plan과 실제 버그 위치 불일치**: Plan은 `discovery-report-service.ts`를 지목했지만 실제 버그는 `team-reviews.ts`에 있었다. 소스 코드 직접 확인이 필수.
2. **React SSR 텍스트 분할**: `renderToString`에서 `{var}텍스트` 패턴은 `<!-- -->` 주석이 삽입된다. 템플릿 리터럴로 합쳐야 테스트 통과.
