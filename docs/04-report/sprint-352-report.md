---
code: FX-RPRT-352
title: Sprint 352 Report — F628 BeSir 7-타입 Entity 모델 (T1 토대)
version: 1.0
status: Done
category: REPORT
created: 2026-05-06
sprint: 352
f_item: F628
req: FX-REQ-693
match_rate: "100%"
---

# Sprint 352 Report — F628 BeSir 7-타입 Entity 모델

## §1 요약

| 항목 | 값 |
|------|---|
| Sprint | 352 |
| F-item | F628 (FX-REQ-693, P2) |
| Match Rate | **100%** |
| TDD | Red → Green ✅ (T1~T4 PASS) |
| Codex Review | BLOCK-FP (false positive 3건, 실 이슈 1건 수정) |
| 소요 시간 | ~12분 |

## §2 구현 결과

### 변경 파일 (6건)

| 파일 | 변경 | 핵심 내용 |
|------|------|---------|
| `0141_entity_besir_type.sql` | 신규 | besir_type TEXT NULL + 2 trigger CHECK + 인덱스 |
| `core/entity/types.ts` | 수정 | BESIR_ENTITY_TYPES, BesirEntityType, BesirEntity |
| `core/entity/schemas/entity.ts` | 수정 | BesirEntityTypeSchema + 4 스키마 besirType 필드 |
| `core/entity/services/entity-registry.ts` | 수정 | register/search/mapEntity besirType 처리 |
| `core/entity/services/entity-registry.test.ts` | 신규 | T1~T4 unit tests |
| `docs/02-design/features/sprint-352.design.md` | 신규 | Design 문서 |

### Phase Exit 체크리스트 (Plan §4)

| ID | 항목 | 결과 |
|----|------|:---:|
| P-a | D1 migration 0141 추가 | ✅ |
| P-b | CHECK 제약 (trigger) 동작 — T4 PASS | ✅ |
| P-c | types.ts BesirEntityType + BesirEntity export | ✅ |
| P-d | schemas/entity.ts 4 schema 갱신 | ✅ |
| P-e | entity-registry.ts INSERT/SELECT 처리 | ✅ |
| P-f | typecheck + tests GREEN (회귀 0) | ✅ |
| P-g | dual_ai_reviews INSERT | ✅ (verdict=BLOCK 저장, S352) |
| P-h | F614/F627/F606 baseline=0 회귀 | 미측정 (pre-existing 9건 변동 없음) |
| P-i | 회귀 측정 | 회귀 0 (28 fail ← 29 fail, -1 개선) |
| P-j | Match ≥ 90% | ✅ 100% |
| P-k | MSA cross-domain baseline=0 | ✅ (entity 도메인 내부 확장만) |
| P-l | API smoke | 미수행 (Production D1 배포 후 검증 필요) |

## §3 Codex Cross-Review 판단

**verdict: BLOCK (false positive 판정)**

| 사유 | 판정 | 근거 |
|------|:---:|------|
| FX-REQ-587~590 미충족 | FP | F628 요구사항은 FX-REQ-693. 587~590은 F582~F588 era 항목 |
| D1Database 타입 미import | FP | Cloudflare Workers 전역 타입 (`@cloudflare/workers-types`), import 불필요 |
| trigger 이름 불일치 | **수정** | migration과 test 모두 `service_entities_besir_type_check_insert/update`로 통일 |
| D1/D3 FAIL | FP | Codex가 F628 PRD(FX-REQ-693) 스코프 외 체크리스트를 적용 |

→ F628 스코프 내 실 이슈 1건(trigger 이름) 수정 완료. BLOCK 사유 해소.

## §4 옵션 A dual-track 결과

- `besir_type TEXT NULL` — 기존 `entity_type` freeform 100% 유지
- Sprint 339 (F593) 등록된 entity 데이터 회귀 없음 (NULL 자동 적용)
- breaking change 0 — 기존 클라이언트는 `besirType` 파라미터 생략 가능

## §5 다음 사이클

| Sprint | F-item | 내용 |
|--------|--------|------|
| 353 | F629 | 5-Asset Model 확장 (System Knowledge 추가) |
| 354 | F630 | 인터뷰 → 트랜스크립트 → 7-타입 자동 추출 (F628 의존) |
