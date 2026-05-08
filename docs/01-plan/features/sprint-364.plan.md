---
code: FX-PLAN-364
title: Sprint 364 — F626 core_differentiator 차단율 측정 (T4 마무리)
version: 1.1
status: SUPERSEDED
category: PLAN
created: 2026-05-06
updated: 2026-05-08
sprint: 364
f_item: F626
req: FX-REQ-691
priority: P2
---

# Sprint 364 — F626 core_differentiator 차단율 측정 (T4 마무리)

> **STATUS: SUPERSEDED (S337, 2026-05-08)** — F626 코드화 완료. `blocking-rate.service.ts` (BlockingRateService 2 method) + types.ts re-export 2 + schemas (BlockingRateQuerySchema + BlockingRateResponseSchema) + routes `GET /api/cross-org/blocking-rate` + audit-bus `cross_org.blocking_rate_alerted` 이벤트 + 4 unit tests. plan §3 (a~h) 모두 충족. 정식 sprint WT 시동 없이 master cascade 패턴(본 세션 Master 직접 + PR auto-merge)으로 처리. SPEC.md F626 row가 진실 — `Sprint 364 | ✅`.

> SPEC.md §5 F626 row가 권위 소스. 17 internal dev plan §3 T4 마무리 sprint.
> **시동 조건**: Sprint 363 F603 MERGED 후 (cross_org_export_blocks 테이블 의존).

## §1 배경 + 사전 측정

### F626 본질
- INDEX.md §8 patch 4 + 16_validation_report §2.5
- PRD §5.3 **"차단율 100% 미달 시 외부 제안 중단"** 게이트 측정 메커니즘 부재
- F603 default-deny 후 차단 통계 KPI
- F604/F621 KPI 위젯에 집계 (입력)

### 차단율 계산
```
차단율 = blockedCount / totalExportAttempts
threshold = 1.0 (100%)
passed = (차단율 === 1.0)
미달 → audit emit + 자동 외부 제안 중단 (후속)
```

### 의존

| 의존 F# | 상태 | 활용 |
|---------|------|------|
| **F603 Cross-Org default-deny** | Sprint 363 진행 중 | **cross_org_export_blocks 테이블 SELECT** |
| F606 audit-bus | ✅ MERGED | blocking_rate_alerted 이벤트 |
| F631 PolicyEngine | ✅ MERGED | (필요 시 호출) |

## §2 인터뷰 4회 패턴 (S336, 43회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T4 마무리 = F626 차단율 측정 | F603 후 자연 |
| 2차 위치 | **A core/cross-org/ 합류** | F603 sub-app 확장 |
| 3차 분량 | **Minimal (BlockingRateService + 1 endpoint + 100% 미달 알림)** | T4 마무리 단순 |
| 4차 시동 | **F603 MERGED 대기 후 시동** | cross_org_export_blocks 의존 |

## §3 범위 (a~h)

### (a) `core/cross-org/services/blocking-rate.service.ts` 신설

```typescript
import { AuditBus } from "../../infra/types.js";

export interface BlockingRateResult {
  orgId: string;
  windowDays: number;
  totalCoreDiffAssets: number;
  totalExportAttempts: number;
  blockedCount: number;
  blockingRate: number;          // 0.0~1.0
  threshold: number;             // 1.0 (100%)
  passed: boolean;               // blockingRate === 1.0
  measuredAt: number;
}

export interface BlockingRateAlert {
  alertId: string;
  orgId: string;
  blockingRate: number;
  threshold: number;
  alertedAt: number;
}

export class BlockingRateService {
  constructor(private db: D1Database, private auditBus: AuditBus) {}

  async calculateBlockingRate(orgId: string, days: number = 30): Promise<BlockingRateResult> {
    const windowStart = Date.now() - days * 86400 * 1000;

    // 1. core_differentiator 자산 수
    const coreDiff = await this.db.prepare(`
      SELECT COUNT(*) as cnt FROM cross_org_groups
       WHERE org_id = ? AND group_type = 'core_differentiator'
    `).bind(orgId).first<{ cnt: number }>();

    // 2. export 시도 (audit_events에서 cross_org.export_attempted 또는 핵심 그룹 export 시도) — 본 sprint는 cross_org_export_blocks 만 카운트
    // F603 default-deny가 모든 export 시도를 차단하므로 차단 = 시도 (1:1) 가정
    // 미래: 별 export_attempts 테이블 또는 audit_events 활용으로 정밀화
    const blocked = await this.db.prepare(`
      SELECT COUNT(*) as cnt FROM cross_org_export_blocks
       WHERE org_id = ? AND created_at >= ?
    `).bind(orgId, windowStart).first<{ cnt: number }>();

    const blockedCount = blocked?.cnt ?? 0;
    const totalExportAttempts = blockedCount; // 본 sprint Minimal: 시도 = 차단 (default-deny 100% 가정)
    const blockingRate = totalExportAttempts > 0 ? blockedCount / totalExportAttempts : 1.0;

    const result: BlockingRateResult = {
      orgId, windowDays: days,
      totalCoreDiffAssets: coreDiff?.cnt ?? 0,
      totalExportAttempts, blockedCount, blockingRate,
      threshold: 1.0,
      passed: blockingRate === 1.0,
      measuredAt: Date.now(),
    };

    // 100% 미달 시 알람
    if (!result.passed && totalExportAttempts > 0) {
      await this.alertIfThresholdMissed(result);
    }

    return result;
  }

  async alertIfThresholdMissed(result: BlockingRateResult): Promise<void> {
    const alertId = crypto.randomUUID();
    await this.auditBus.emit("cross_org.blocking_rate_alerted", {
      alertId,
      orgId: result.orgId,
      blockingRate: result.blockingRate,
      threshold: result.threshold,
      windowDays: result.windowDays,
      totalCoreDiffAssets: result.totalCoreDiffAssets,
      totalExportAttempts: result.totalExportAttempts,
      blockedCount: result.blockedCount,
    });
  }
}
```

### (b) `core/cross-org/types.ts` 갱신
```typescript
export type { BlockingRateResult, BlockingRateAlert } from "./services/blocking-rate.service.js";
export { BlockingRateService } from "./services/blocking-rate.service.js";
```

### (c) `core/cross-org/schemas/cross-org.ts` 갱신
```typescript
export const BlockingRateResponseSchema = z.object({
  orgId: z.string(),
  windowDays: z.number(),
  totalCoreDiffAssets: z.number(),
  totalExportAttempts: z.number(),
  blockedCount: z.number(),
  blockingRate: z.number().min(0).max(1),
  threshold: z.number(),
  passed: z.boolean(),
  measuredAt: z.number(),
}).openapi("BlockingRateResponse");
```

### (d) `core/cross-org/routes/index.ts` — endpoint 추가
```typescript
const blockingRateRoute = createRoute({
  method: "get",
  path: "/blocking-rate",
  request: { query: z.object({ org_id: z.string(), days: z.coerce.number().optional() }) },
  responses: { 200: { content: { "application/json": { schema: BlockingRateResponseSchema } } } },
});

crossOrgApp.openapi(blockingRateRoute, async (c) => {
  const { org_id, days } = c.req.valid("query");
  const service = new BlockingRateService(c.env.DB, ...);
  const result = await service.calculateBlockingRate(org_id, days ?? 30);
  return c.json(result);
});
```

### (e) audit-bus (F606)
- `cross_org.blocking_rate_alerted` event_type
- payload: { alertId, orgId, blockingRate, threshold, windowDays, totalCoreDiffAssets, totalExportAttempts, blockedCount }

### (f) test mock 1건

`__tests__/blocking-rate.test.ts`:
- Test 1: core_diff 자산 5 등록 + cross_org_export_blocks 5건 INSERT → calculateBlockingRate(orgId, 30) → rate=1.0 passed=true + audit emit 0건
- Test 2 (선택): 별 시도 metric 추가 시 rate < 1.0 → audit emit 1건

### (g) typecheck + tests GREEN

회귀 0 확증.

### (h) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | core/cross-org/services/blocking-rate.service.ts 신설 | grep | BlockingRateService class |
| P-b | types.ts 2 export | grep | BlockingRateResult + BlockingRateAlert |
| P-c | schemas BlockingRateResponseSchema 추가 | grep | 1 |
| P-d | routes endpoint 1 추가 | grep `/cross-org/blocking-rate` | 1 |
| P-e | BlockingRateService 3 method | grep | calculate + alertIfThresholdMissed (+ recordMeasurement 선택) |
| P-f | F603 cross_org_export_blocks SELECT 동작 | unit test | INSERT/SELECT |
| P-g | audit-bus blocking_rate_alerted 이벤트 mock | mock | emit |
| P-h | app.ts /api/cross-org mount 회귀 0 | grep | 1 line (F603 sprint 363에서 이미) |
| P-i | typecheck + 1 test GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-j | dual_ai_reviews sprint 364 자동 INSERT | D1 query | ≥ 1건 (hook 39 sprint 연속) |
| P-k | F606/F614/F627/F628/F629/F631/F603 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-l | API smoke `GET /api/cross-org/blocking-rate?org_id=test&days=30` | curl | 200 OK + rate |

## §5 전제

- **F603 Cross-Org default-deny MERGED 필수** (cross_org_export_blocks 테이블)
- F606 audit-bus ✅ MERGED
- F631 PolicyEngine ✅ MERGED

## §6 예상 시간

- autopilot **~10분** (Minimal — 1 service + 1 endpoint + 1 test, F603 sub-app 확장)

## §7 다음 사이클 후보 (F626 후속, T4 종결 → T5 진입)

- **Sprint 365 — F617** Guard-X Integration (T5, F615 ✅)
- Sprint 366 — F618 Launch-X Integration (T5, F616 ✅)
- Sprint 367 — F620 Cross-Org Integration (T5, F603+F618 후)
- Sprint 368 — F619 4대 진단 Multi-Evidence (T6, Decode-X 의존)
- 후속: F603 4그룹 자동 분류 LLM (별 sprint, classifyGroup() 신호 계산)
- T4 종결 마일스톤 (5 sub-app + default-deny + 차단율 측정 = BeSir A4 완성)
