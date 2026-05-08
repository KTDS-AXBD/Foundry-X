---
code: FX-PLAN-367
title: Sprint 367 — F620 Cross-Org Integration (T5 마지막)
version: 1.1
status: SUPERSEDED
category: PLAN
created: 2026-05-06
updated: 2026-05-08
sprint: 367
f_item: F620
req: FX-REQ-685
priority: P2
---

# Sprint 367 — F620 Cross-Org Integration (T5 마지막)

> **STATUS: SUPERSEDED (S337, 2026-05-08)** — F620 코드화 완료. plan §3 (a~k) 모두 충족: D1 0153 + 3 service(PolicyEmbedder/ExpertReviewManager/LaunchBlockingSignalService) + types.ts 7 export + schemas 7 + routes 6 endpoints + audit-bus 4 events + 11 unit tests + 1 E2E CO-I09 cascade. 정식 sprint WT 시동 없이 master cascade 패턴(본 세션 6번째 PR)으로 처리. CO-I02(LLM 보조 동치) + CO-I03(business_impact 자동 평가)는 후속 sprint deferred — stub embedding은 sha256 deterministic. SPEC.md F620 row가 진실 — `Sprint 367 | ✅`. **T5 종결 → T6 진입 가능** (외부 의존 게이트).

> SPEC.md §5 F620 row 권위 소스. T5 Integration 세 번째(마지막).
> **시동 조건**: Sprint 366 F618 MERGED 후 (CO-I07 Launch-X 차단 contract 의존).

## §1 배경 + 사전 측정

### 12 dev plan §7.2 CO-I 매핑

| Stage | 작업 | 본 sprint |
|-------|------|-----------|
| **CO-I01** | LLM 임베딩 통합 (PolicyEmbedder) | ✅ stub |
| CO-I02 | LLM 보조 동치 판정 | 후속 |
| CO-I03 | business_impact 자동 평가 | 후속 |
| **CO-I04** | ExpertReviewManager (HITL 라이프사이클) | ✅ 큐 |
| **CO-I07** | Launch-X 차단 신호 발행 | ✅ stub |
| **CO-I09** | E2E (3조직 → 분류 → 차단 → HITL → 재분류) | ✅ |

### 의존
- F603 Cross-Org default-deny ✅ MERGED (Sprint 363)
- **F618 Launch-X Integration** — Sprint 366 진행 중 (MERGED 필수)
- F606 audit-bus ✅ + F627 llm wrapper ✅
- F605 HITL Console UI는 외부 (escalation 큐 contract만)

## §2 인터뷰 4회 패턴 (S336, 46회차)

| 회차 | 결정 |
|------|------|
| 1차 메인 결정 | T5 마지막 = F620 |
| 2차 분량 | Minimal (CO-I01 + I04 + I07 + I09) |
| 3차 위치 | core/cross-org/ 합류 (F603 sub-app 확장) |
| 4차 시동 | F618 MERGED 대기 후 |

## §3 범위 (a~k)

### (a) `policy-embedder.service.ts` (CO-I01)
- LLM 호출(F627) + 벡터 cache (F596 KVCacheService)
- `embedPolicy(policyText)` + `findSimilar(orgId, threshold)`

### (b) `expert-review-manager.service.ts` (CO-I04)
- `enqueueReview(assignmentId)` + `getQueue(orgId)` + `signOff(reviewId, expertId, decision)`
- F605 HITL UI는 외부 — escalation 큐 contract만

### (c) `launch-blocking-signal.service.ts` (CO-I07)
- `notifyLaunch(blockId, releaseId)` F618 Launch-X consumer 호출 또는 audit emit `cross_org.launch_blocked`

### (d) D1 0153
- `cross_org_review_queue` (review_id + assignment_id + status + decision)
- `policy_embeddings_cache` (policy_text_hash + vector_json + cached_at)

### (e~h) types/schemas/routes/audit
- 5 endpoints 추가 (embed/review/launch-blocking)
- audit 4 이벤트

### (i) E2E test (CO-I09)
- 3 가상 조직 → policy embed → 4그룹 자동 할당 → checkExport 차단 → enqueueReview → signOff → 재할당
- Launch-X publish 시도 → notifyLaunch → blocked

### (j~k) typecheck + Phase Exit 12항

## §4 Phase Exit 체크리스트

| ID | 항목 | 기준 |
|----|------|------|
| P-a | D1 0153 적용 + 2 테이블 | review_queue + embeddings_cache |
| P-b | services 3 신규 | embedder + review-manager + launch-blocking-signal |
| P-c~h | types/schemas/routes/audit-bus | 3 export + 4 schema + 5 endpoint + 4 emit |
| P-i | typecheck + E2E GREEN | 회귀 0 |
| P-j | dual_ai_reviews sprint 367 INSERT | hook 42 sprint 연속 |
| P-k | baseline 0 | F603/F606/F618 회귀 0 |
| P-l | API smoke embed/review/launch-blocking | 200 OK |

## §5 전제

- F603 ✅ + F606 ✅ + F627 ✅
- **F618 MERGED 필수** (CO-I07 Launch-X 차단 contract)

## §6 예상 시간

- autopilot **~25분**

## §7 다음 사이클 후보

- T5 종결 → T6 외부 의존 게이트 (F619 Decode-X / F621 AXIS-DS / F600 5-Layer)
- F603 4그룹 자동 분류 LLM 본격화 (CO-I02/I03 후속)
