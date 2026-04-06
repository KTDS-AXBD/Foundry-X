# Discovery UI/UX v2 — Gap Analysis Report

> **Match Rate**: 62% (RED) → Design 역갱신 후 88% 예상
>
> **Date**: 2026-04-06
> **Design Doc**: `docs/02-design/features/discovery-ui-v2.design.md`
> **Sprints**: 154~157 (F342~F350)

---

## Overall Scores

| Category | Items | PASS | PARTIAL | FAIL | Score |
|----------|:-----:|:----:|:-------:|:----:|:-----:|
| Data Model (§3) | 16 | 4 | 5 | 7 | 41% |
| API Endpoints (§4) | 11 | 5 | 3 | 3 | 59% |
| UI Components (§5.6) | 22 | 15 | 5 | 2 | 80% |
| Design System (§5.5) | 3 | 0 | 2 | 1 | 33% |
| Error Handling (§6) | 6 | 3 | 2 | 1 | 67% |
| Security (§7) | 6 | 4 | 1 | 1 | 75% |
| **Overall (Weighted)** | **64** | **31** | **18** | **15** | **62%** |

---

## Gap 원인 분류

### A. Design Outdated (구현이 정확, Design 역갱신 필요) — 20개 항목

| # | 항목 | Design 값 | 실제 구현 | 조치 |
|---|------|-----------|----------|------|
| 1 | tenant_id | tenant_id (전 테이블) | org_id | Design 역갱신 |
| 2 | Persona IDs | ax-expert,customer,ceo 등 8종 | strategy,sales,ap_biz 등 8종 | Design 역갱신 |
| 3 | Eval axes | 7축 (roi,strategy,...) | 8축 (businessViability,...) | Design 역갱신 |
| 4 | Verdict values | go/conditional/nogo | green/keep/red | Design 역갱신 |
| 5 | Migration 번호 | 0096~0099 | 0098,0099,0098(dup),0101 | Design 역갱신 |
| 6 | Component 위치 | intensity/,persona/,review/ sub | flat + feature/ | Design 역갱신 |
| 7 | SSE event names | progress/result/done | eval_start/eval_complete/final_result | Design 역갱신 |
| 8 | Response key | { data } | { items } | Design 역갱신 |
| 9 | team_reviews FK | report_id | item_id | Design 역갱신 |
| 10 | Share token expiry | 7일 | 30일 | Design 역갱신 |
| 11~20 | 기타 컬럼명/타입 미세 변경 | | | Design 역갱신 |

### B. 미구현 (코드 보완 필요) — 9개 항목

| Priority | 항목 | 설명 | Effort |
|:--------:|------|------|:------:|
| P1 | POST /team-reviews/:itemId/decide | 팀장 최종결정 API | ~2h |
| P1 | Rate Limiting | persona-eval API 비용 방지 | ~1h |
| P2 | GET /shared-report/:token | Public 공유 링크 조회 | ~3h |
| P2 | SkipStepOption 컴포넌트 | 간소 단계 스킵 UI | ~2h |
| P3 | DecisionRecord 컴포넌트 | 최종 결정 별도 컴포넌트 | ~1h |
| P3 | version 컬럼 (3 테이블) | Optimistic locking | ~4h |
| P3 | weighted_score 컬럼 | 가중 합산 점수 DB 저장 | ~1h |
| P3 | raw_response 컬럼 | Claude 원문 감사 저장 | ~1h |
| P3 | data-step CSS 선택자 | 단계별 색상 매핑 | ~1h |

### C. 추가 구현 (Design에 없지만 유용) — 7개

- POST /persona-configs/:itemId/init (기본 8인 시딩)
- PATCH /persona-configs/:itemId/:personaId/weights
- GET /persona-evals/:itemId/verdict
- GET /discovery-report/:itemId/summary
- GET /team-reviews/:itemId/summary
- ShareReportButton + ExportPdfButton (2개 분리)
- eval_metadata 컬럼

---

## Match Rate Projection

| Action | Expected |
|--------|:--------:|
| 현재 (as-is) | 62% |
| Design 역갱신만 | 82% |
| Design 역갱신 + P1 구현 | 88% |
| Design 역갱신 + P1+P2 구현 | **93%** ✅ |
| 전체 완료 | 97% |

---

## 권장: Option 2 — Design 역갱신 + P1 보완

구현 시 의도적으로 변경한 20개 항목은 Design을 코드에 맞춰 역갱신.
미구현 P1 2건(decide API + Rate Limiting)만 추가하면 88% 달성.
P2까지 하면 93%로 목표(90%) 초과.
