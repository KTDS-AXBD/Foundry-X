---
code: FX-RPRT-363
title: Sprint 363 Report — F603 Cross-Org default-deny 골격
version: 1.0
status: Completed
category: REPORT
created: 2026-05-06
sprint: 363
f_item: F603
req: FX-REQ-667
match_rate: 100
---

# Sprint 363 Report — F603 Cross-Org default-deny 골격 (T4)

## §1 Summary

| 항목 | 내용 |
|------|------|
| Sprint | 363 |
| F-item | F603 (FX-REQ-667, P2) |
| Match Rate | **100%** (code-측정 9항) |
| TDD | Red 3 FAIL → Green 3 PASS ✅ |
| Typecheck | PASS ✅ |
| 전체 회귀 | 0건 (pre-existing `biz-items-sixhats` 2건 제외) |
| Codex | BLOCK (false positive — 상세 §5) |
| 예상 시간 | ~20분 (autopilot) |

## §2 구현 산출물

| 파일 | 상태 | 비고 |
|------|------|------|
| `db/migrations/0149_cross_org_groups.sql` | ✅ | 2 테이블 + 인덱스 + append-only 트리거 |
| `core/cross-org/types.ts` | ✅ | CrossOrgGroup + AssetKind + ExportBlockReason + GroupAssignment + ExportCheckResult + GroupStats |
| `core/cross-org/schemas/cross-org.ts` | ✅ | AssignGroupSchema + CheckExportSchema + 2 Response |
| `core/cross-org/services/cross-org-enforcer.service.ts` | ✅ | assignGroup + checkExport + getGroupStats |
| `core/cross-org/routes/index.ts` | ✅ | POST /assign-group + POST /check-export + GET /stats |
| `app.ts` | ✅ | `/api/cross-org` mount 추가 |
| `core/cross-org/cross-org-enforcer.test.ts` | ✅ | 3 시나리오 PASS |

## §3 TDD 결과

| 시나리오 | Red | Green |
|----------|-----|-------|
| core_differentiator → checkExport allowed=false + audit emits | FAIL ✅ | PASS ✅ |
| common_standard → checkExport allowed=true | FAIL ✅ | PASS ✅ |
| 미분류 자산 → checkExport allowed=true, groupType=null | FAIL ✅ | PASS ✅ |

## §4 Phase Exit P-a~P-i (code-측정)

| ID | 항목 | 결과 |
|----|------|------|
| P-a | D1 0149 + 2 테이블 | ✅ |
| P-b | core/cross-org/ 5+ files | ✅ (5 files) |
| P-c | types.ts 5 export | ✅ (6 export, 추가 GroupStats 무해) |
| P-d | schemas 4 등록 | ✅ (5 schemas, ExportBlockReasonSchema 추가 무해) |
| P-e | CrossOrgEnforcer + 3 method | ✅ |
| P-f | routes 3 endpoints | ✅ |
| P-g | audit-bus 2 이벤트 | ✅ (mock 검증) |
| P-h | app.ts /api/cross-org mount | ✅ |
| P-i | typecheck + 1 test GREEN | ✅ (turbo typecheck PASS + 3 test PASS) |

Post-merge 측정 (P-j ~ P-l): CI 완료 후 확인 필요.

## §5 Codex Cross-Review 노트 (false positive)

- **verdict**: BLOCK, **degraded**: false
- **이슈 1** "cross_org_export_blocks 테이블 생성 누락" → **false positive**: 0149 migration 17~30행에 이미 존재
- **이슈 2** "D1Database import 누락" → **false positive**: CF Workers global 타입, import 불필요, typecheck PASS로 확인
- **PRD 미충족** FX-REQ-587~590 → **스코프 오류**: fx-codex-integration PRD 항목, F603과 무관
- **판정**: Gap 100% + typecheck PASS + 3 test PASS의 3축 실증으로 BLOCK 무효화. Post-merge CI 검증으로 최종 확인.

## §6 의식적 결정

| 결정 | 이유 |
|------|------|
| Test 위치: `core/cross-org/` co-located | MSA co-location 패턴 (도메인 closure 강화, launch와 동일) |
| `Pick<AuditBus, "emit">` 사용 | emit만 사용, test mock 용이, 명시적 narrowing |
| Audit emit에 TraceContext 추가 | F606 trace propagation 호환성 |
| Migration 0149 (Plan의 0150 정정) | 실제 다음 번호, Design에서 이미 정정됨 |

## §7 다음 사이클 후보

- **F626** core_diff 차단율 측정 코드 (T4, F603 default-deny 활용, Sprint 364)
- F617 Guard-X Integration (T5, F615 ✅)
- F618 Launch-X Integration (T5, F616 ✅)
