---
code: FX-ANLS-S164
title: "Sprint 164 Gap Analysis — Rule 효과 측정 + 운영 지표 대시보드"
version: 1.0
status: Active
category: ANLS
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-DSGN-S164]], [[FX-PLAN-S164]]"
---

# Sprint 164 Gap Analysis

## Summary

| 항목 | 수치 |
|------|------|
| 총 검증 항목 | 16 |
| PASS | 16 |
| FAIL | 0 |
| **Match Rate** | **100%** |

## Detailed Results

| # | 항목 | 판정 | 근거 |
|---|------|------|------|
| D-01 | D1 migration 0109 (4 ALTER) | PASS | `0109_grp_effectiveness.sql` 존재 |
| D-02 | shared/src/metrics.ts 타입 7개 export | PASS | 7 interface exported |
| D-03 | metrics-schema.ts Zod 스키마 | PASS | 10 schema exports |
| D-04 | rule-effectiveness-service.ts measureAll() | PASS | 함수 존재 + 테스트 통과 |
| D-05 | metrics-service.ts 3 메서드 + RuleEffectivenessService 연동 | PASS | getOverview → measureAll 호출 |
| D-06 | GET /guard-rail/effectiveness 200 | PASS | 테스트 3건 통과 |
| D-07 | GET /metrics/overview 200 | PASS | 테스트 2건 통과 |
| D-08 | GET /metrics/skill-reuse 200 | PASS | 테스트 2건 통과 |
| D-09 | GET /metrics/agent-usage 200 | PASS | 테스트 2건 통과 |
| D-10 | dashboard.metrics.tsx 페이지 | PASS | Component export 확인 |
| D-11 | AgentUsageChart 컴포넌트 | PASS | 파일 존재 + typecheck 통과 |
| D-12 | SkillReuseChart 컴포넌트 | PASS | SVG 도넛 + 범례 |
| D-13 | RuleEffectChart 컴포넌트 | PASS | 바 차트 + status 표시 |
| D-14 | UnusedHighlight 컴포넌트 | PASS | 경고/성공 분기 |
| D-15 | app.ts metricsRoute 등록 | PASS | import + app.route 2곳 |
| D-16 | Sidebar 네비게이션 "운영 지표" | PASS | sidebar.tsx + router.tsx |

## Test Results

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| API 전체 | 3010 | 3009 | 0 (1 skip) |
| Sprint 164 신규 | 9 | 9 | 0 |
| Typecheck (shared+api+web) | 3 pkg | 3 pass | 0 |

## Notes

- `agent_self_evaluations` 테이블이 D1에 존재하지 않아 `execution_events` severity=error를 agent 실패 가중치 대용으로 활용 (FR-01 적응적 구현)
- 차트 컴포넌트는 CSS div + SVG 기반 (외부 라이브러리 미사용, 번들 사이즈 무증가)
