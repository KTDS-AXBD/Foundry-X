---
code: FX-ANLS-116
title: Sprint 116 Gap Analysis — 2-tier 검증 + 미팅 관리 (F294+F295)
version: 1.0
status: Active
category: ANLS
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 116
f-items: F294, F295
match-rate: 95
---

# Sprint 116 Gap Analysis — F294+F295

> **Design**: [[FX-DSGN-116]]  |  **Match Rate**: **95%**  |  **Date**: 2026-04-03

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| D1 Migration (S2) | 100% | PASS |
| API Schema (S3) | 100% | PASS |
| Services (S4) | 100% | PASS |
| API Routes (S5) | 100% | PASS |
| Web Pages (S6) | 100% | PASS |
| Test Strategy (S7) | 71% | WARN |
| File Map (S8) | 88% | WARN |
| **Overall** | **95%** | **PASS** |

---

## Section-by-Section

### S2. D1 Migration — 100% + 3 Enhancements

| Design Item | Implementation | Status |
|-------------|---------------|:------:|
| ALTER TABLE pipeline_stages ADD validation_tier | 0086 L4 | PASS |
| CREATE TABLE expert_meetings | 0086 L7-22 | PASS |
| idx_expert_meetings_org | 0086 L24 | PASS |
| idx_expert_meetings_status | 0086 L25 | PASS |
| *validation_history table (추가)* | 0086 L28-38 | ADDED |
| *idx_validation_history_* (추가)* | 0086 L39-40 | ADDED |

### S3. API Schema — 100% + 1 Enhancement

| Design Item | Status |
|-------------|:------:|
| VALIDATION_TIERS, SubmitValidationSchema, ValidationFilterSchema | PASS |
| MEETING_TYPES, MEETING_STATUSES, CreateMeetingSchema, UpdateMeetingSchema | PASS |
| *MeetingFilterSchema (추가)* | ADDED |

### S4. Services — 100%

- ValidationService: 5 methods 전체 구현 (submitDivisionReview, submitCompanyReview, getDivisionItems, getCompanyItems, getValidationStatus)
- MeetingService: 5 methods 전체 구현 (create, list, getById, update, delete)
- 비즈니스 로직 검증: tier transition, guard, history tracking 모두 일치

### S5. API Routes — 100% (10 endpoints)

- validation-tier.ts: 5 endpoints (division submit/items, company submit/items, status)
- validation-meetings.ts: 5 endpoints (CRUD + list)
- app.ts 라우트 등록 완료

### S6. Web Pages — 100%

- 3 페이지 + sidebar 3 메뉴 + router 3 라우트 전체 구현

### S7. Test Strategy — 71% (5/7 files)

| Test File | Tests | Status |
|-----------|:-----:|:------:|
| validation-tier.test.ts | 11 | PASS |
| validation-meetings.test.ts | 11 | PASS |
| validation-service.test.ts | — | SKIP (route test 커버) |
| meeting-service.test.ts | — | SKIP (route test 커버) |
| validation-division.test.tsx | 3 | PASS |
| validation-company.test.tsx | 4 | PASS |
| validation-meetings.test.tsx | 4 | PASS |
| **Total** | **33** | **33 PASS** |

---

## Missing Items (2건, Low Impact)

| Item | Description | Impact |
|------|-------------|--------|
| validation-service.test.ts | 서비스 단위 테스트 | Low — route 통합 테스트가 동일 로직 커버 |
| meeting-service.test.ts | 서비스 단위 테스트 | Low — route 통합 테스트가 동일 로직 커버 |

## Added Items (4건, 합리적 보강)

| Item | Description |
|------|-------------|
| validation_history DDL | Design S4 history 반환에 필수 — 설계 보완 |
| idx_validation_history_* (2) | 이력 조회 성능 인덱스 |
| MeetingFilterSchema | list endpoint query validation |

## Changed Items (3건, None Impact)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| 테스트 파일 위치 | routes/__tests__/ | src/__tests__/ | None (프로젝트 관례) |
| 라우트 등록 파일 | index.ts | app.ts | None (프로젝트 구조) |
| division items stage | REVIEW only | REVIEW + DECISION | Low (범위 확장) |

---

## Conclusion

핵심 기능(D1+Schema+Service+Route+Web) **100% Match**. 미구현 2건은 서비스 단위 테스트 파일로, route 통합 테스트가 동일 로직을 이미 검증하므로 실질적 영향 없음. **Match Rate 95% — PASS.**
