---
code: FX-RPRT-S164
title: "Sprint 164 Completion Report — Rule 효과 측정 + 운영 지표 대시보드"
version: 1.0
status: Active
category: RPRT
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-ANLS-S164]], [[FX-DSGN-S164]], [[FX-PLAN-S164]]"
---

# Sprint 164 Completion Report

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F361 에이전트 자기 평가 연동 + Rule 효과 측정, F362 운영 지표 대시보드 |
| Sprint | 164 |
| Phase | 17 — Self-Evolving Harness v2 |
| Match Rate | **100%** (16/16 PASS) |
| 신규 파일 | 12 |
| 수정 파일 | 4 |
| 신규 테스트 | 9 |
| 기존 테스트 영향 | 0 (3009 pass, 0 fail) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Guard Rail 배치 후 효과를 측정할 수 없음 + "built but unused" 위험 |
| Solution | Rule 효과 점수 (pre/post window 비교) + Skill 재사용률 + 에���전트 활용률 |
| Function UX Effect | Dashboard에서 Rule 효과·활용률·재사용률을 한눈에 확인 |
| Core Value | Guard Rail의 실질적 가치 정량 증명 + 인프라 미활용 조기 감지 |

---

## Deliverables

### API (F361 + F362)

| # | 파일 | 내용 |
|---|------|------|
| 1 | `migrations/0109_grp_effectiveness.sql` | guard_rail_proposals 4 컬럼 확장 |
| 2 | `shared/src/metrics.ts` | 타입 7개 (RuleEffectiveness, SkillReuse, AgentUsage, MetricsOverview + Response) |
| 3 | `schemas/metrics-schema.ts` | Zod 스키마 10개 |
| 4 | `services/rule-effectiveness-service.ts` | Rule 효과 측정 (pre/post window 비교 알고리즘) |
| 5 | `services/metrics-service.ts` | 통합 운영 지표 (재사용률 + 활용률 + overview) |
| 6 | `routes/metrics.ts` | GET /metrics/overview, /skill-reuse, /agent-usage |
| 7 | `routes/guard-rail.ts` | GET /guard-rail/effectiveness 추가 |

### Web (F362)

| # | 파일 | 내용 |
|---|------|------|
| 8 | `routes/dashboard.metrics.tsx` | 운영 지표 페이지 (3-section + summary cards) |
| 9 | `components/feature/AgentUsageChart.tsx` | 활용률 수평 바 차트 |
| 10 | `components/feature/SkillReuseChart.tsx` | 재사용률 SVG 도넛 차트 |
| 11 | `components/feature/RuleEffectChart.tsx` | Rule 효과 바 차트 |
| 12 | `components/feature/UnusedHighlight.tsx` | 미사용 항목 경고 카드 |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `shared/src/index.ts` | metrics.ts export 추가 |
| `api/src/app.ts` | metricsRoute import + 등록 |
| `web/src/components/sidebar.tsx` | "운영 지표" 네비 항목 |
| `web/src/router.tsx` | dashboard/metrics 라우트 등록 |

---

## Technical Decisions

1. **agent_self_evaluations 대용**: 테이블 미존재 → execution_events severity=error 활용. 실제 에이전트 실패 패턴을 동일하게 집계 가능
2. **차트 라이브러리 미사용**: CSS div width% (바 차트) + SVG stroke-dasharray (도넛 차트). 번들 사이즈 0 추가
3. **Rule 효과 측정 알고리즘**: `score = max(0, (1 - post/pre) * 100)`. 데이터 부족 시 'insufficient_data' 상태 반환으로 정직한 표시

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Initial report — Match 100% | Sinclair Seo |
