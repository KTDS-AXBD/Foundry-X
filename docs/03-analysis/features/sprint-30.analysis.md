---
code: FX-ANLS-030
title: "Sprint 30 Gap Analysis — 프로덕션 배포 동기화 + Phase 4 Go 판정 + 품질 강화"
version: 0.1
status: Active
category: ANLS
system-version: 2.2.0
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Sprint 30 Gap Analysis

> **Match Rate: 93%**
>
> **Design Doc**: [sprint-30.design.md](../../02-design/features/sprint-30.design.md)
> **Date**: 2026-03-21

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 91% | ✅ |
| Architecture Compliance | 95% | ✅ |
| Convention Compliance | 93% | ✅ |
| **Overall** | **93%** | ✅ |

---

## 2. F-item별 Match Rate

| F# | Feature | Match | Items | Status |
|----|---------|:-----:|:-----:|:------:|
| F123 | Production Deploy | 100% | 3/3 | ✅ |
| F124 | Frontend Integration | 86% | 5/7 | ⚠️ |
| F125 | Phase 4 Go Decision | 100% | 6/6 | ✅ |
| F126 | Harness Rules | 88% | 6/8 | ⚠️ |
| F127 | PRD Consistency | 100% | 2/2 | ✅ |
| F128 | Error + E2E | 72% | 4/9 | ⚠️ |

```
Match:    26 items (72%)
Changed:   9 items (25%)
Missing:   1 item  (3%)
```

---

## 3. Missing Items

| # | Design Location | Description | Impact |
|---|----------------|-------------|:------:|
| 1 | §3.6.4 | `e2e/integration-path.spec.ts` 4개 통합 경로 E2E 테스트 미구현 | Medium |

## 4. Changed Items

| # | Item | Design | Implementation | Impact |
|---|------|--------|---------------|:------:|
| 1 | iframe sandbox | `sandbox="allow-scripts..."` | `allow="clipboard-write"` (sandbox 미사용) | Medium |
| 2 | shared 타입 import | shared/sso.ts에서 import | 컴포넌트 로컬 타입 재선언 | Low |
| 3 | HarnessRulesService DI | `(db, kpiLogger, sseManager)` | `(db, sseManager)` + 직접 INSERT | Low |
| 4 | SSE pushEvent 시그니처 | `pushEvent(tenantId, event, data)` | `pushEvent({ event, data }, tenantId)` | Low |
| 5 | StructuredErrorSchema | nested `{ error: { code, message } }` | flat `{ error: string, errorCode: string }` | Medium |
| 6 | errorResponse 시그니처 | `(c, status, code, details?)` | `(c, status, code, message?, details?)` | Low |
| 7-9 | auth/agent/spec 마이그레이션 | `errorResponse()` 헬퍼 호출 | 인라인 `{ error, errorCode }` 패턴 | Low |

---

## 5. Verification

| Area | Count | Status |
|------|:-----:|:------:|
| typecheck API | 0 errors | ✅ |
| typecheck Web | 0 errors | ✅ |
| API tests | 583/583 pass | ✅ |
| E2E integration-path | 미구현 | ❌ |

---

## 6. Recommendations

### Immediate (Match Rate 향상)

1. **E2E 테스트 작성** — `e2e/integration-path.spec.ts` 4개 시나리오 (F128 완결, +5%p)

### Design 문서 갱신

- StructuredErrorSchema flat 구조 채택 의도 반영
- iframe sandbox 제거 사유 문서화
- HarnessRulesService DI 구조 변경 반영

### Backlog

- shared/sso.ts 타입 통합 (DRY)
- errorResponse() 헬퍼 전면 적용 (점진적)
- iframe sandbox 보안 재검토

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial — 93% match rate (26 match, 9 changed, 1 missing) | Sinclair Seo |
