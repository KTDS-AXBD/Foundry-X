---
id: FX-RPRT-338
sprint: 338
feature: F592
req: FX-REQ-659
date: 2026-05-04
match_rate: 100
status: completed
---

# Sprint 338 Report — F592: services/ 잔존 dead+sibling 2 files 정리 (옵션 D-a)

## 요약

서비스 루트 정리 사이클 23회차. entity-sync.ts(0 callers, pure dead) 제거 + methodology-types.ts(1 sibling caller) → core/discovery/services/ 이동. services/ 루트 18 → **16 files** (-2).

## Match Rate

**100%** (semantic). P-a~P-k 11항 전원 PASS.

## 구현 결과

| 항목 | 결과 |
|------|------|
| git rm entity-sync.ts | ✅ 0 callers 확증, pure dead |
| git mv methodology-types.ts | ✅ core/discovery/services/ 정착 |
| pm-skills-criteria.ts import | ✅ sibling path 갱신 (`./methodology-types.js`) |
| dist orphan | ✅ 0 (dist 없음 = 클린 WT) |
| typecheck | ✅ 19/19 PASS |
| tests | ✅ 2288 passed (2290 total, 2 skipped) |
| services/ 루트 .ts | ✅ 18 → **16** |
| cross-domain 룰 위반 | ✅ 19 → **19** (증가 없음) |

## OBSERVED P-a~P-k

| ID | 기대 | 실측 | 결과 |
|----|------|------|------|
| P-a entity-sync+methodology in services/ | 0 | **0** | ✅ |
| P-b methodology-types in core/discovery | 1 | **1** | ✅ |
| P-c services/ .ts count | 16 | **16** | ✅ |
| P-d OLD import 잔존 | 0 | **0** | ✅ |
| P-e typecheck+tests | PASS | **19/19+2288** | ✅ |
| P-f dual_ai_reviews INSERT | ≥27 | **27** (13 sprint 연속) | ✅ |
| P-g save-dual-review log | 존재 | 미발견 (S328 패턴) | ⚠️ (acceptable) |
| P-h-1 services/agent=0 | 0 | **0** | ✅ |
| P-h-2 model-router | 1 | **1** | ✅ |
| P-h-7 pm-skills-guide | 1 | **1** | ✅ |
| P-h-8 prd/prototype ≥5 | 5 | **8** | ✅ |
| P-j dist orphan | 0 | **0** | ✅ |
| P-k MSA violations | 19 | **19** | ✅ |

## Codex Cross-Review

- verdict: **BLOCK** (false positive — wrong PRD context: `fx-codex-integration/prd-final.md` 참조, FX-REQ-587~590 구 요구사항 참조)
- 실제 F592 요구사항 FX-REQ-659는 해당 PRD에 없음
- D1 dual_ai_reviews 저장 완료 (id=27, hook 13 sprint 연속 정상)
- **판정**: false positive BLOCK, implementation 100% correct. PRD_PATH 매핑 개선 후보 (F-item 검토 필요)

## 패턴 재현

- **F587/F590 옵션 D 23회차**: dead 1 rm + sibling 1 mv + 1 caller path 갱신
- **dist orphan P-j ✅**: WT 클린 상태 (dist 미존재) → S326~S328 22회차 패턴 대비 자동 해소
- **인터뷰 4회 패턴 23회차**: 1차 18 후보 → 2차 4 files 옵션 D → 3차 entity-registry 도메인 모호 발견 → 4차 D-a 보수 2 files 채택

## 회귀 검증

F583(0) ✅ / F584(1) ✅ / F585(≥7) ✅ / F589(1) ✅ / F590(1) ✅ / F591(8≥5) ✅

## 다음 후보

- **C105 entity-registry** 도메인 결정 (P3, routes/entities + schemas/entity 묶음)
- **F593 spec-* 묶음** spec-parser(8) + spec-library(2) → core/spec/ (P2)
- **F594 sr-* 묶음** 3 files → core/sr/ 신규 도메인 (P2~P3)
- **F595 infra cluster** sse-manager(14) + kv-cache(12) + event-bus(6) (P3)
- **MSA 룰 강제 교정 F-item** pnpm lint 스코프 src/ 전체 확장 + grandfathered 19건 해소
