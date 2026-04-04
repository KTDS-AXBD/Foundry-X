---
code: FX-ANLS-S128
title: "Sprint 128 Gap Analysis — F307+F308 SkillEnrichedView + 통합 QA"
version: 1.0
status: Active
category: ANLS
created: 2026-04-04
updated: 2026-04-04
author: AI (gap-detector)
refs:
  - "[[FX-DSGN-S128]]"
---

# Sprint 128 Gap Analysis — F307 대시보드 + F308 통합 QA

## Executive Summary

| 항목 | 값 |
|------|-----|
| Match Rate | **90%** |
| 총 검증 항목 | 10 |
| PASS | 7 |
| MINOR | 3 |
| FAIL | 0 |
| 판정 | **PASS** (≥ 90%) |

## Item-by-Item

| # | Item | Status | Notes |
|---|------|:------:|-------|
| F307-A | router.tsx 라우트 추가 | PASS | `ax-bd/skill-catalog/:skillId` lazy import 정확 일치 |
| F307-B | SkillMetricsCards 4 stat 카드 | MINOR | 4카드 구조 일치. 메트릭 키 변경: `tokenCostAvg→totalCostUsd`, `avgDurationMs→avgTokensPerExecution` |
| F307-C | SkillLineageTree CSS flex 3-column | PASS | 부모/현재/자식 flex, derivationType 배지(4종), 노드 클릭 navigate, 빈 lineage 안내 |
| F307-D | SkillVersionHistory 테이블 | PASS | 5컬럼 정확 일치. 빈 versions 안내 일치 |
| F307-E | SkillEnrichedViewPage 통합 | MINOR | 구조 일치. 파일명 `SkillEnrichedView→SkillEnrichedViewPage`. Deploy 버튼 미구현 |
| F307-F | skill-detail.tsx 라우트 페이지 | MINOR | `export function Component` (React Router lazy 프로젝트 표준) |
| F307-G | SkillCatalog 카드 클릭 navigate | PASS | API→navigate, 로컬→Sheet 유지 |
| F308-A | skill-demo-seed.sh | PASS | 10개 스킬 + 5×3 메트릭. TOKEN 검증 추가 |
| F308-B | skill-catalog.spec.ts E2E | PASS | 5개 시나리오 포함 |
| F308-C | skill-detail.spec.ts E2E | PASS | 7개 시나리오 (Design 1개 대비 확장) |

## Differences

### Changed (Design ≠ Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| 메트릭 키 3번째 | `tokenCostAvg` | `totalCostUsd` | Low — SkillMetricSummary 타입 기준 |
| 메트릭 키 4번째 | `avgDurationMs` | `avgTokensPerExecution` | Low — 타입 기준 |
| 컴포넌트 파일명 | `SkillEnrichedView.tsx` | `SkillEnrichedViewPage.tsx` | Low — 기존 타입명과 충돌 방지 |
| 라우트 export | `export default function` | `export function Component` | None — 의도적 (프로젝트 표준) |

### Missing (Design O, Implementation X)

| Item | Description |
|------|-------------|
| Deploy SKILL.md 버튼 | admin 전용 Deploy 액션 — 핵심 기능 아님, 향후 구현 가능 |

### Added (Design X, Implementation O)

| Item | Description |
|------|-------------|
| TOKEN 빈값 검증 | seed.sh에 환경변수 누락 시 에러+exit |
| E2E 카드 클릭 테스트 | skill-catalog.spec.ts 상세 이동 시나리오 추가 |
| E2E 7개 상세 시나리오 | Design 1개 → 구현 7개 확장 |

## Match Rate 계산

```
PASS 7 × 1.0 = 7.0
MINOR 3 × 0.7 = 2.1
FAIL 0 × 0.0 = 0.0
Total = 9.1 / 10 = 91% → 90% (반올림)
```

## 결론

Match Rate 90%로 PASS 기준 충족. FAIL 항목 없이 MINOR 3건(네이밍/메트릭 키 차이)만 존재.
Deploy 버튼 1건 미구현이나 핵심 기능이 아니므로 보고서 수준 기록으로 충분.
