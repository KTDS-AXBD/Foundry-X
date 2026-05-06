---
code: FX-DESIGN-363
title: Sprint 363 Design — F603 Cross-Org default-deny 골격
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
sprint: 363
f_item: F603
req: FX-REQ-667
---

# Sprint 363 Design — F603 Cross-Org default-deny 골격 (T4)

> Plan: `docs/01-plan/features/sprint-363.plan.md`
> TDD: Red Phase → Green Phase 순서

## §1 아키텍처 결정

- T4 패턴: `core/cross-org/` 신규 도메인, Guard/Launch와 동일한 flat 구조
- Migration 번호: `0149` (0148_launch_artifacts 다음 실제 다음 번호)
- AuditBus: `new AuditBus(env.DB, env.AUDIT_HMAC_KEY)` (Guard/Launch 동일)
- sub-app: `new Hono<{ Bindings: Env }>()` → app.ts에 `/api/cross-org` mount

## §2 테스트 계약 (TDD Red Target)

파일: `packages/api/src/__tests__/cross-org-enforcer.test.ts`

### 시나리오 1: core_differentiator → default-deny
```
assignGroup({ assetId: "asset-1", assetKind: "policy", orgId: "org-1",
              groupType: "core_differentiator" })
→ cross_org_groups INSERT ✅
→ auditBus.emit("cross_org.group_assigned", ...) ✅

checkExport({ assetId: "asset-1" })
→ allowed=false, reason="export_blocked"
→ cross_org_export_blocks INSERT ✅
→ auditBus.emit("cross_org.export_blocked", ...) ✅
```

### 시나리오 2: common_standard → 허용
```
assignGroup({ assetId: "asset-2", ..., groupType: "common_standard" })
checkExport({ assetId: "asset-2" }) → allowed=true
```

### 시나리오 3: 미분류 자산 → 기본 허용
```
checkExport({ assetId: "unknown" }) → allowed=true, groupType=null
```

## §3 파일 매핑 (§5 Design checklist D1)

| 파일 | 작업 | 목적 |
|------|------|------|
| `packages/api/src/db/migrations/0149_cross_org_groups.sql` | 신규 | D1 2 테이블 + 인덱스 + append-only 트리거 |
| `packages/api/src/core/cross-org/types.ts` | 신규 | 5 타입 export |
| `packages/api/src/core/cross-org/schemas/cross-org.ts` | 신규 | zod 4 스키마 |
| `packages/api/src/core/cross-org/services/cross-org-enforcer.service.ts` | 신규 | CrossOrgEnforcer 3 method |
| `packages/api/src/core/cross-org/routes/index.ts` | 신규 | Hono sub-app 3 endpoint |
| `packages/api/src/app.ts` | 수정 | `/api/cross-org` mount 1줄 추가 |
| `packages/api/src/__tests__/cross-org-enforcer.test.ts` | 신규 | TDD 3 시나리오 |

## §4 주입 사이트 전수 (D1 체크리스트)

- `CrossOrgEnforcer.assignGroup`: audit emit `cross_org.group_assigned`
- `CrossOrgEnforcer.checkExport`: core_differentiator → audit emit `cross_org.export_blocked`
- `crossOrgApp`: app.ts에서 단 1곳 mount

## §5 식별자 계약 (D2)

- `asset_id`: 호출자가 제공하는 외부 string ID (no format constraint)
- `group_type`: CHECK 4종 enum — `cross_org_groups.group_type` + `CrossOrgGroup` TS type 동일
- `id` (block record): `crypto.randomUUID()`
- UNIQUE (asset_id, asset_kind): 동일 asset의 중복 분류 시 UPSERT

## §6 Breaking change 영향도 (D3)

- 신규 도메인. 기존 코드 영향 없음.
- app.ts: 1줄 import + 1줄 mount 추가만.
