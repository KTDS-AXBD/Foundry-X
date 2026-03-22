---
code: FX-ANLS-047
title: "Sprint 47 Gap Analysis — F164+F165+F166"
version: 1.0
status: Active
category: ANLS
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-47
sprint: 47
matchRate: 93
references:
  - "[[FX-DSGN-047]]"
  - "[[FX-SPEC-001]]"
---

# Sprint 47 Gap Analysis Report

> **Match Rate: 93%** (수정 후)
>
> **Project**: Foundry-X
> **Analyst**: gap-detector + Sinclair Seo
> **Date**: 2026-03-22
> **Design Doc**: [sprint-47.design.md](../../02-design/features/sprint-47.design.md)

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| F164 Plugin Interface + Policy | 100% | ✅ |
| F165 AuditLogService + D1 | 95% | ✅ |
| F165 API + Schema | 88% | ✅ |
| F166 PiiMaskerService + D1 | 96% | ✅ |
| F166 PII Middleware | 90% | ✅ |
| F166 Governance API | 93% | ✅ |
| File Structure | 100% | ✅ |
| Tests (46/~55) | 84% | ⚠️ |
| Integration | 90% | ✅ |
| **Overall** | **93%** | **✅** |

---

## 2. Critical Fixes Applied

| # | Issue | Fix | Status |
|---|-------|-----|:------:|
| 1 | PII Middleware path: `/api/agent/` → `/api/agents/` | `pii-masker.middleware.ts:10` 수정 | ✅ 완료 |
| 2 | InputClassification `restricted` 누락 | `schemas/audit.ts` enum 수정 | ✅ 완료 |

## 3. Accepted Differences (Design 갱신 필요)

| # | Design | Implementation | 판정 |
|---|--------|----------------|:----:|
| 1 | AuditEventType 5종 | 8종 (확장) | ✅ 수용 |
| 2 | getEvents 응답키 `events` | `logs` | ✅ 수용 |
| 3 | getStats period string enum | number (일 수) | ✅ 수용 |
| 4 | logEvent 반환 `{id}` | `{id, recorded}` | ✅ 수용 |
| 5 | mask/maskAbove 동기 | 비동기 (DB 로드) | ✅ 수용 |
| 6 | Middleware 감사 로그 직접 호출 | context 저장 방식 | ✅ 수용 |

## 4. Test Summary

| 영역 | 테스트 수 |
|------|:---------:|
| AuditLogService | 11 |
| PiiMaskerService | 17 |
| audit 라우트 | 8 |
| governance 라우트 | 10 |
| **합계** | **46** |

전체 API 테스트: **999/999 통과** (961 → 999, +38)

## 5. Verification

- Typecheck: 에러 0건
- 전체 테스트: 999/999 통과
- Critical Bug 수정 후 재테스트: 46/46 통과
- Match Rate: **93%** (≥ 90% 통과)
