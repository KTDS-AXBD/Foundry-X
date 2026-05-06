---
code: FX-PLAN-363
title: Sprint 363 — F603 Cross-Org default-deny 골격 (T4)
version: 1.0
status: Active
category: PLAN
created: 2026-05-06
updated: 2026-05-06
sprint: 363
f_item: F603
req: FX-REQ-667
priority: P2
---

# Sprint 363 — F603 Cross-Org default-deny 골격 (T4)

> SPEC.md §5 F603 row가 권위 소스. 17 internal dev plan §3 T4 네 번째 sprint.
> **본 sprint = 자체 부분만** (SME 워크샵 결과는 외부, 본 sprint는 default-deny 코드 강제 + assignGroup 인터페이스).

## §1 배경 + 사전 측정

### 4그룹 분류 룰 (12 dev plan §2.3)

| 그룹 | 분류 신호 |
|------|-----------|
| `common_standard` | commonality ≥ 0.8 AND variance < 0.2 |
| `org_specific` | commonality ≥ 0.4 AND variance ≥ 0.5 |
| `tacit_knowledge` | commonality < 0.4 AND documentation_rate < 0.3 |
| `core_differentiator` | commonality < 0.4 AND documentation_rate ≥ 0.7 AND business_impact ≥ "high" |

### default-deny 강제 (§2.4) — BeSir CO2 약속

`core_differentiator` 분류 시 시스템 수준에서 **모두 차단**:
- export 차단
- 라이선스 차단
- 마켓플레이스 차단
- E3 가중치 학습은 익명·집계화 후도 별도 옵트인

### 의존 unlock

| 의존 F# | 상태 |
|---------|------|
| F606 audit-bus | ✅ MERGED |
| F628 BesirEntityType | ✅ MERGED |
| F629 5-Asset Model | ✅ MERGED |
| F631 PolicyEngine | ✅ MERGED |

## §2 인터뷰 4회 패턴 (S336, 42회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T4 네 번째 = F603 default-deny 골격 | F615/F616 평행 후 자연 |
| 2차 위치 | **A core/cross-org/ 신규** | 17 plan + 12 dev plan 명세 |
| 3차 분량 | **Minimal (default-deny 시쒱만)** | 4그룹 자동 분류 LLM은 후속 |
| 4차 시동 | **즉시** | 활성 sprint 0 |

## §3 범위 (a~k)

### (a) 신규 디렉토리
```
packages/api/src/core/cross-org/
├── types.ts
├── schemas/
│   └── cross-org.ts
├── services/
│   └── cross-org-enforcer.service.ts
└── routes/
    └── index.ts
```

### (b) D1 migration `0150_cross_org_groups.sql`

```sql
-- F603: Cross-Org 4그룹 + default-deny (T4)

CREATE TABLE cross_org_groups (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  asset_kind TEXT NOT NULL,            -- policy/ontology/skill/system_knowledge
  org_id TEXT NOT NULL,
  group_type TEXT NOT NULL,            -- common_standard/org_specific/tacit_knowledge/core_differentiator
  commonality REAL,                    -- 0.0~1.0 (signal)
  variance REAL,
  documentation_rate REAL,
  business_impact TEXT,                -- low/medium/high
  assigned_by TEXT NOT NULL,           -- auto/sme/manual
  assigned_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (asset_kind IN ('policy','ontology','skill','system_knowledge')),
  CHECK (group_type IN ('common_standard','org_specific','tacit_knowledge','core_differentiator')),
  CHECK (assigned_by IN ('auto','sme','manual')),
  CHECK (business_impact IN ('low','medium','high') OR business_impact IS NULL),
  UNIQUE (asset_id, asset_kind)
);

CREATE INDEX idx_cross_org_groups_type ON cross_org_groups(org_id, group_type);
CREATE INDEX idx_cross_org_groups_core_diff ON cross_org_groups(group_type) WHERE group_type = 'core_differentiator';

CREATE TABLE cross_org_export_blocks (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  reason TEXT NOT NULL,                -- export_blocked/license_blocked/marketplace_blocked/learning_opt_in_required
  attempted_action TEXT,
  trace_id TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  CHECK (reason IN ('export_blocked','license_blocked','marketplace_blocked','learning_opt_in_required'))
);

CREATE INDEX idx_export_blocks_org ON cross_org_export_blocks(org_id, created_at DESC);
CREATE INDEX idx_export_blocks_asset ON cross_org_export_blocks(asset_id);

-- append-only 보장
CREATE TRIGGER export_blocks_no_update BEFORE UPDATE ON cross_org_export_blocks
BEGIN SELECT RAISE(FAIL, 'cross_org_export_blocks is append-only'); END;
```

### (c) `core/cross-org/types.ts`

```typescript
export const CROSS_ORG_GROUPS = ["common_standard", "org_specific", "tacit_knowledge", "core_differentiator"] as const;
export type CrossOrgGroup = typeof CROSS_ORG_GROUPS[number];

export const ASSET_KINDS = ["policy", "ontology", "skill", "system_knowledge"] as const;
export type AssetKind = typeof ASSET_KINDS[number];

export const EXPORT_BLOCK_REASONS = ["export_blocked", "license_blocked", "marketplace_blocked", "learning_opt_in_required"] as const;
export type ExportBlockReason = typeof EXPORT_BLOCK_REASONS[number];

export interface GroupAssignment {
  id: string;
  assetId: string;
  assetKind: AssetKind;
  orgId: string;
  groupType: CrossOrgGroup;
  commonality: number | null;
  variance: number | null;
  documentationRate: number | null;
  businessImpact: "low" | "medium" | "high" | null;
  assignedBy: "auto" | "sme" | "manual";
  assignedAt: number;
}

export interface ExportCheckResult {
  allowed: boolean;
  groupType: CrossOrgGroup | null;
  reason: ExportBlockReason | null;
  blockId: string | null;
}

export interface GroupStats {
  orgId: string;
  counts: Record<CrossOrgGroup, number>;
  total: number;
}

export { CrossOrgEnforcer } from "./services/cross-org-enforcer.service.js";
export * from "./schemas/cross-org.js";
```

### (d) `core/cross-org/schemas/cross-org.ts`

```typescript
export const CrossOrgGroupSchema = z.enum(CROSS_ORG_GROUPS);
export const AssetKindSchema = z.enum(ASSET_KINDS);

export const AssignGroupSchema = z.object({
  assetId: z.string().min(1),
  assetKind: AssetKindSchema,
  orgId: z.string().min(1),
  groupType: CrossOrgGroupSchema,
  signals: z.object({
    commonality: z.number().min(0).max(1).optional(),
    variance: z.number().min(0).max(1).optional(),
    documentationRate: z.number().min(0).max(1).optional(),
    businessImpact: z.enum(["low","medium","high"]).optional(),
  }).optional(),
  assignedBy: z.enum(["auto","sme","manual"]).default("manual"),
}).openapi("AssignGroup");

export const CheckExportSchema = z.object({
  assetId: z.string().min(1),
  attemptedAction: z.string().optional(),
  traceId: z.string().optional(),
}).openapi("CheckExport");

export const GroupAssignmentResponseSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  assetKind: AssetKindSchema,
  orgId: z.string(),
  groupType: CrossOrgGroupSchema,
  commonality: z.number().nullable(),
  variance: z.number().nullable(),
  documentationRate: z.number().nullable(),
  businessImpact: z.enum(["low","medium","high"]).nullable(),
  assignedBy: z.enum(["auto","sme","manual"]),
  assignedAt: z.number(),
}).openapi("GroupAssignmentResponse");

export const ExportCheckResponseSchema = z.object({
  allowed: z.boolean(),
  groupType: CrossOrgGroupSchema.nullable(),
  reason: z.enum(EXPORT_BLOCK_REASONS).nullable(),
  blockId: z.string().nullable(),
}).openapi("ExportCheckResponse");
```

### (e) `core/cross-org/services/cross-org-enforcer.service.ts`

```typescript
import { AuditBus } from "../../infra/types.js";

export class CrossOrgEnforcer {
  constructor(private db: D1Database, private auditBus: AuditBus) {}

  async assignGroup(input: {
    assetId: string; assetKind: AssetKind; orgId: string;
    groupType: CrossOrgGroup;
    signals?: { commonality?: number; variance?: number; documentationRate?: number; businessImpact?: "low"|"medium"|"high" };
    assignedBy?: "auto"|"sme"|"manual";
  }): Promise<GroupAssignment> {
    const id = crypto.randomUUID();
    await this.db.prepare(`
      INSERT INTO cross_org_groups
        (id, asset_id, asset_kind, org_id, group_type, commonality, variance,
         documentation_rate, business_impact, assigned_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (asset_id, asset_kind) DO UPDATE SET
        group_type = excluded.group_type,
        commonality = excluded.commonality,
        variance = excluded.variance,
        documentation_rate = excluded.documentation_rate,
        business_impact = excluded.business_impact,
        assigned_by = excluded.assigned_by,
        assigned_at = unixepoch('now') * 1000
    `).bind(id, input.assetId, input.assetKind, input.orgId, input.groupType,
            input.signals?.commonality ?? null, input.signals?.variance ?? null,
            input.signals?.documentationRate ?? null, input.signals?.businessImpact ?? null,
            input.assignedBy ?? "manual").run();

    await this.auditBus.emit("cross_org.group_assigned", {
      assetId: input.assetId, assetKind: input.assetKind, orgId: input.orgId,
      groupType: input.groupType, assignedBy: input.assignedBy ?? "manual",
    });

    return await this.fetchAssignment(input.assetId, input.assetKind);
  }

  // BeSir CO2 약속: core_differentiator → default-deny
  async checkExport(input: { assetId: string; attemptedAction?: string; traceId?: string }): Promise<ExportCheckResult> {
    const row = await this.db.prepare(`
      SELECT id, asset_kind, org_id, group_type FROM cross_org_groups WHERE asset_id = ?
    `).bind(input.assetId).first<{ id: string; asset_kind: AssetKind; org_id: string; group_type: CrossOrgGroup }>();

    if (!row) {
      // 분류 없음 = 기본 허용 (org_specific 가정)
      return { allowed: true, groupType: null, reason: null, blockId: null };
    }

    if (row.group_type === "core_differentiator") {
      // default-deny: 차단 + 이력 기록
      const blockId = crypto.randomUUID();
      const reason: ExportBlockReason = "export_blocked";
      await this.db.prepare(`
        INSERT INTO cross_org_export_blocks (id, asset_id, org_id, reason, attempted_action, trace_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(blockId, input.assetId, row.org_id, reason,
              input.attemptedAction ?? null, input.traceId ?? null).run();

      await this.auditBus.emit("cross_org.export_blocked", {
        blockId, assetId: input.assetId, orgId: row.org_id, reason,
      });

      return { allowed: false, groupType: row.group_type, reason, blockId };
    }

    // 다른 그룹은 허용
    return { allowed: true, groupType: row.group_type, reason: null, blockId: null };
  }

  async getGroupStats(orgId: string): Promise<GroupStats> {
    const rows = await this.db.prepare(`
      SELECT group_type, COUNT(*) as cnt FROM cross_org_groups WHERE org_id = ? GROUP BY group_type
    `).bind(orgId).all<{ group_type: CrossOrgGroup; cnt: number }>();

    const counts: Record<CrossOrgGroup, number> = {
      common_standard: 0, org_specific: 0, tacit_knowledge: 0, core_differentiator: 0,
    };
    for (const row of rows.results ?? []) counts[row.group_type] = row.cnt;
    return { orgId, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  }

  private async fetchAssignment(assetId: string, assetKind: AssetKind): Promise<GroupAssignment> { /* SELECT + map */ }
}
```

### (f) `core/cross-org/routes/index.ts`

```typescript
// POST /cross-org/assign-group, /cross-org/check-export
// GET /cross-org/stats?org_id=...
export const crossOrgApp = new OpenAPIHono<{ Bindings: Env }>();
```

### (g) audit-bus 통합 (F606)
- `cross_org.group_assigned` (assignment 시)
- `cross_org.export_blocked` (default-deny 차단 시)

### (h) `app.ts` mount
```typescript
app.route("/api/cross-org", crossOrgApp);
```

### (i) test mock 1건

`__tests__/cross-org-enforcer.test.ts`:
- assignGroup({ groupType: "core_differentiator" }) → cross_org_groups INSERT + audit emit
- checkExport(coreDiffAssetId) → allowed=false + reason=export_blocked + cross_org_export_blocks INSERT + audit emit
- assignGroup({ groupType: "common_standard" }) → checkExport → allowed=true (대조)

### (j) typecheck + tests GREEN
회귀 0 확증.

### (k) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | D1 0150 적용 + 2 테이블 | wrangler PRAGMA | groups + export_blocks |
| P-b | core/cross-org/ 5+ files | find | types/schemas/services/routes |
| P-c | types.ts 5 export | grep | CrossOrgGroup + AssetKind + GroupAssignment + ExportCheckResult + ExportBlockReason |
| P-d | schemas 4 등록 | grep | CrossOrgGroup + AssignGroup + CheckExport + Response |
| P-e | CrossOrgEnforcer class + 3 method | grep | assignGroup + checkExport + getGroupStats |
| P-f | routes 3 endpoints | grep | assign-group + check-export + stats |
| P-g | audit-bus 2 이벤트 mock | mock | 2 emits |
| P-h | app.ts /api/cross-org mount | grep | 1 line |
| P-i | typecheck + 1 test GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-j | dual_ai_reviews sprint 363 자동 INSERT | D1 query | ≥ 1건 (hook 38 sprint 연속) |
| P-k | F606/F614/F627/F628/F629/F631 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-l | API smoke `POST /api/cross-org/check-export` core_diff asset → allowed=false | curl | 200 OK + reason |

## §5 전제

- F606 ✅ + F628 ✅ + F629 ✅ + F631 ✅
- 활성 sprint 0 (Sprint 360/361 ✅ MERGED, 362 plan ready)

## §6 예상 시간

- autopilot **~20분** (Minimal — Hono + D1 2 tables + types + 3 method + 3 endpoints + 1 test)

## §7 다음 사이클 후보 (F603 후속)

- **Sprint 364 — F626** core_diff 차단율 측정 코드 (T4, F603 default-deny 활용)
- Sprint 365 — F617 Guard-X Integration (T5, F615 ✅)
- Sprint 366 — F618 Launch-X Integration (T5, F616 ✅)
- Sprint 362 — F623 /ax:domain-init β (병행 또는 우선)
- 후속: F603 4그룹 자동 분류 LLM (별 sprint, classifyGroup() 신호 계산)
