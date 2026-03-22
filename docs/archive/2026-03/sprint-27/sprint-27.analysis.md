---
code: FX-ANLS-028
title: "Sprint 27 Gap Analysis — F100 + F99 + F101"
version: 0.1
status: Active
category: ANLS
system-version: 2.0.0
created: 2026-03-21
updated: 2026-03-21
author: Claude (gap-detector)
---

# Sprint 27 Gap Analysis

> **Design Document**: [sprint-27.design.md](../../02-design/features/sprint-27.design.md)
> **Analysis Date**: 2026-03-21
> **Match Rate**: 94% (post-fix)

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 94% | ✅ |
| Architecture Compliance | 97% | ✅ |
| Convention Compliance | 95% | ✅ |
| **Overall** | **94%** | ✅ |

---

## 2. Feature-by-Feature Match

### F100: KPI Infrastructure — 95%

| Item | Design | Implementation | Match |
|------|--------|----------------|:-----:|
| POST /api/kpi/track | ✅ | kpi.ts:35-65 | ✅ |
| GET /api/kpi/summary | ✅ | kpi.ts:69-94 | ✅ |
| GET /api/kpi/trends | ✅ | kpi.ts:98-124 | ✅ |
| GET /api/kpi/events | ✅ | kpi.ts:128-155, max(100) | ✅ |
| KpiLogger service (5 methods) | ✅ | kpi-logger.ts | ✅ |
| Analytics page | ✅ | analytics/page.tsx | ✅ |
| Sidebar menu | ✅ | sidebar.tsx:37 | ✅ |
| api-client functions | ✅ | api-client.ts | ✅ |
| agentCompletionRate unit | 0-1 ratio | 0-100 integer | ⚠️ Low |

### F99: Reconciliation — 95%

| Item | Design | Implementation | Match |
|------|--------|----------------|:-----:|
| POST /api/reconciliation/run | ✅ | route:23-60 | ✅ |
| GET /api/reconciliation/status | ✅ | route:64-85 | ✅ |
| GET /api/reconciliation/history | ✅ | route:89-116 | ✅ |
| ReconciliationService (5 methods) | ✅ | service:33-344 | ✅ |
| Cron Trigger (6h) | ✅ | wrangler.toml | ✅ |
| scheduled handler + pruneOldEvents | ✅ | scheduled.ts (fixed) | ✅ |
| SSE: reconciliation.completed | ✅ | sse-manager.ts:113 | ✅ |

### F101: AutoFix — 93%

| Item | Design | Implementation | Match |
|------|--------|----------------|:-----:|
| AutoFixService (3 methods) | ✅ | auto-fix.ts | ✅ |
| MAX_ATTEMPTS=2, DIFF_LINES=50 | ✅ | auto-fix.ts:7-8 | ✅ |
| AgentOrchestrator integration | ✅ | setAutoFix + executeTaskWithAutoFix | ✅ |
| SSE: agent.hook.escalated | ✅ | sse-manager.ts:114 | ✅ |
| FixAttempt interface shape | 설계와 다름 | 더 상세 (richer) | ⚠️ Low |

### Integration — 100%

| Item | Match |
|------|:-----:|
| app.ts route registration | ✅ |
| index.ts { fetch, scheduled } export | ✅ |
| wrangler.toml cron trigger | ✅ |
| D1 migration 0018 | ✅ |
| SSE event types extended | ✅ |

---

## 3. Issues Fixed During Analysis

| # | Issue | Severity | Resolution |
|---|-------|----------|------------|
| 1 | scheduled.ts 누락: pruneOldEvents() | Medium | KpiLogger import + prune 호출 추가 |
| 2 | KPI events endpoint limit 무제한 | Medium | `.min(1).max(100)` 추가 |
| 3 | `.pipe()` 사용 시 OpenAPI spec 500 에러 | High | `.min().max().default()` 체이닝으로 변경 |

---

## 4. Remaining Low-Priority Items (No Action)

| # | Item | Impact | Decision |
|---|------|--------|----------|
| 1 | agentCompletionRate: ratio vs percentage | Low | UI가 percentage 기준으로 작동하므로 현행 유지, Design 문서 업데이트 |
| 2 | SSE event name: escalation vs escalated | Low | `escalated` 통일 (implementation) |
| 3 | FixAttempt interface 상세화 | Low | Implementation이 더 유용, 수용 |
| 4 | DriftItem gitHash/dbHash 미구현 | Low | wiki drift 구현 시 추가 |

---

## 5. Verification

| Check | Result |
|-------|--------|
| API typecheck | ✅ 0 errors |
| Web typecheck | ✅ 0 errors |
| API tests | ✅ 535/535 |
| New endpoints | 7개 (KPI 4 + Reconciliation 3) |
| New services | 3개 (KpiLogger, ReconciliationService, AutoFixService) |
| D1 migration | 0018 (2 tables + 3 columns) |
| Cron Trigger | `0 */6 * * *` |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial analysis + 2 fixes applied | Claude (gap-detector) |
