---
code: FX-ANLS-025
title: "Sprint 24 Gap Analysis — Design vs Implementation"
version: 0.1
status: Active
category: ANLS
system-version: 1.8.1
created: 2026-03-20
updated: 2026-03-20
author: Sinclair Seo (gap-detector)
---

# Sprint 24 Gap Analysis

## Match Rate: 90%

57 full match + 4 partial out of 63 items checked.

## Summary

| Section | Items | Match | Partial | Missing | Score |
|---------|:-----:|:-----:|:-------:|:-------:|:-----:|
| S3 Data Model | 3 | 3 | 0 | 0 | 100% |
| S4.1 F98 Project Overview | 5 | 5 | 0 | 0 | 100% |
| S4.2 F99 Webhook+Jira | 19 | 19 | 0 | 0 | 100% |
| S4.3 F100 Monitoring | 6 | 4 | 0 | 2 | 67% |
| S4.4 F101 Workflow | 12 | 12 | 0 | 0 | 100% |
| S5 UI/UX | 9 | 8 | 1 | 0 | 94% |
| S6 Zod Schemas | 4 | 4 | 0 | 0 | 100% |
| S8 Tests | 5 | 2 | 3 | 0 | 70% |
| **Total** | **63** | **57** | **4** | **2** | **90%** |

## Gaps

### Missing (2건)

1. **GET /orgs/{orgId}/monitoring/stats endpoint** — MonitoringService.getWorkerStats() 존재하나 라우트 미노출
2. **Sentry/toucan-js middleware in app.ts** — Design에 명시된 에러 캡처 미들웨어 미구현

### Partial (4건)

3. **MonitorPanel.tsx** — 39 LOC, 최소 플레이스홀더 수준 (서비스 상태 시각화 부족)
4. **webhook-registry.test.ts** — 8건/14건 목표 (아웃바운드 재시도, 시그니처 검증 테스트 부족)
5. **workflow-engine.test.ts** — 12건/14건 목표 (condition 분기, update/delete 라우트 테스트 부족)
6. **monitoring.test.ts** — 3건/4건 목표 (health/detailed 라우트 통합 테스트 부족)

## Extras (긍정적 초과 구현)

- WebhookError, WorkflowError, JiraApiError 커스텀 에러 클래스
- WORKFLOW_TEMPLATES 3종 완전 정의
- 추가 Zod 스키마 (workflowEdgeSchema, jiraIssueSchema, jiraProjectSchema 등)
- testWebhook() 메서드 + 테스트 엔드포인트

## Verification

- typecheck: API ✅ + Web ✅ (에러 0건)
- API tests: 535/535 ✅ (기존 502 + 신규 33)
- File Guard: 범위 이탈 0건
