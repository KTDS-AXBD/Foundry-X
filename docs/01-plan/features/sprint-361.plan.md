---
code: FX-PLAN-361
title: Sprint 361 — F616 Launch-X Solo (T4 두 번째)
version: 1.1
status: SUPERSEDED
category: PLAN
created: 2026-05-06
updated: 2026-05-08
sprint: 361
f_item: F616
req: FX-REQ-681
priority: P2
---

# Sprint 361 — F616 Launch-X Solo (T4 두 번째)

> **STATUS: SUPERSEDED (S337, 2026-05-08)** — F616는 S335 17 sprint 시동 신기록 세션에서 코드화 완료. 본 sprint 번호로 정식 WT 시동된 적 없음. S337 batch SPEC sync PR이 row를 ✅로 마킹 + plan SUPERSEDED. plan §3 항목들은 모두 코드 측에 정착 (자세한 위치는 SPEC.md row 또는 core/{도메인}/ 디렉토리 참조). SPEC.md F616 row가 진실 — `Sprint 361 | ✅`.

> SPEC.md §5 F616 row가 권위 소스. 본 plan은 17 internal dev plan §3 T4 Sub-app Solo 두 번째 sprint.
> 10 dev_plan_launch_x_v1.md §7.1 LX-S01~S09 중 **LX-S01~S04 + test (Minimal)** 적용.

## §1 배경 + 사전 측정

INDEX.md §6 5 sub-app 중 두 번째 누락 등록.

### Type 1 vs Type 2 (10 dev plan §3 + sprint-plan F266)

| 모드 | 본질 | 신설 자산 |
|------|------|----------|
| **Type 1 Delivery** | 정적 zip 패키지 export + 다운로드 URL | PackagePublisher + ManifestGenerator + sha256 |
| **Type 2 Delivery** | Foundry-X Runtime 인스턴스 배포 | RuntimeDeployer + invoke_endpoint |
| **공통** | DecisionLogger (release_id 추적) + Manifest | 두 모드가 같은 input contract 공유 |

### 의존 unlock

| 의존 F# | 상태 |
|---------|------|
| F606 audit-bus | ✅ MERGED |
| F627 llm wrapper | ✅ MERGED |
| F613 docs sub-app | ✅ MERGED (OpenAPI 통합) |
| F628 BesirEntityType | ✅ MERGED |
| F615 Guard-X (Sprint 360) | 의존 X (별 sub-app) |

## §2 인터뷰 4회 패턴 (S336, 40회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T4 두 번째 = F616 Launch-X Solo | F615 Guard-X 평행 진행 |
| 2차 분량 | **Minimal (LX-S01~S04 + test)** | T4 표준 분량 |
| 3차 mount | **`/api/launch`** | Foundry-X 패턴 일치 |
| 4차 시동 | **즉시** | 354 hotfix watch + 360 IN_PROGRESS, 한도 내 |

## §3 범위 (a~k)

### (a) 신규 디렉토리
```
packages/api/src/core/launch/
├── types.ts
├── schemas/
│   └── launch.ts
├── services/
│   └── launch-engine.service.ts
└── routes/
    └── index.ts
```

### (b) D1 migration `0148_launch_artifacts.sql`

```sql
-- F616: Launch-X Solo (T4 두 번째)

-- Type 1: 정적 패키지
CREATE TABLE launch_artifacts_type1 (
  release_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  download_url TEXT NOT NULL,
  manifest_path TEXT NOT NULL,
  zip_size INTEGER,
  sha256 TEXT NOT NULL,
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);
CREATE INDEX idx_launch_t1_org ON launch_artifacts_type1(org_id);

-- Type 2: 런타임 인스턴스
CREATE TABLE launch_runtimes_type2 (
  release_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  invoke_endpoint TEXT NOT NULL,
  runtime_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending/active/retired
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  CHECK (status IN ('pending','active','retired'))
);
CREATE INDEX idx_launch_t2_org ON launch_runtimes_type2(org_id);

-- 공통: Decision Log
CREATE TABLE launch_decisions (
  id TEXT PRIMARY KEY,
  release_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  launch_type INTEGER NOT NULL,             -- 1 or 2
  manifest_json TEXT NOT NULL,
  audit_event_id INTEGER,                   -- F606 ref
  decided_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  CHECK (launch_type IN (1, 2))
);
CREATE INDEX idx_launch_decisions_release ON launch_decisions(release_id);
CREATE INDEX idx_launch_decisions_org ON launch_decisions(org_id, decided_at DESC);
```

### (c) `core/launch/types.ts`

```typescript
export type LaunchType = 1 | 2;

export interface LaunchManifest {
  releaseId: string;
  orgId: string;
  launchType: LaunchType;
  artifactRef: string;          // zip path or runtime endpoint
  sha256: string;
  metadata: Record<string, unknown>;
  generatedAt: number;
}

export interface LaunchArtifactType1 {
  releaseId: string;
  orgId: string;
  downloadUrl: string;
  manifestPath: string;
  zipSize: number | null;
  sha256: string;
  expiresAt: number | null;
  createdAt: number;
}

export interface LaunchRuntimeType2 {
  releaseId: string;
  orgId: string;
  invokeEndpoint: string;
  runtimeVersion: string;
  status: "pending" | "active" | "retired";
  createdAt: number;
}

export interface LaunchDecisionRecord {
  id: string;
  releaseId: string;
  orgId: string;
  launchType: LaunchType;
  manifest: LaunchManifest;
  auditEventId: number | null;
  decidedAt: number;
}

export { LaunchEngine } from "./services/launch-engine.service.js";
export * from "./schemas/launch.js";
```

### (d) `core/launch/schemas/launch.ts`

```typescript
export const LaunchTypeSchema = z.union([z.literal(1), z.literal(2)]);

export const PackageRequestSchema = z.object({
  orgId: z.string().min(1),
  artifactRef: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
}).openapi("PackageRequest");

export const DeployRequestSchema = z.object({
  releaseId: z.string().min(1),
  launchType: LaunchTypeSchema,
}).openapi("DeployRequest");

export const LaunchResponseSchema = z.object({
  releaseId: z.string(),
  launchType: LaunchTypeSchema,
  manifest: z.any(),
  status: z.string(),
}).openapi("LaunchResponse");
```

### (e) `core/launch/services/launch-engine.service.ts`

```typescript
import { AuditBus } from "../../infra/types.js";

export class LaunchEngine {
  constructor(private db: D1Database, private auditBus: AuditBus) {}

  // LX-S03 ManifestGenerator
  async package(input: { orgId: string; artifactRef: string; metadata?: any }): Promise<LaunchManifest> {
    const releaseId = crypto.randomUUID();
    const sha256 = await computeSha256(input.artifactRef + JSON.stringify(input.metadata ?? {}));
    return {
      releaseId, orgId: input.orgId, launchType: 1, // 기본 Type 1, deployType2 호출 시 변경
      artifactRef: input.artifactRef, sha256,
      metadata: input.metadata ?? {},
      generatedAt: Date.now(),
    };
  }

  // LX-S04 PackagePublisher (Type 1)
  async publishType1(manifest: LaunchManifest): Promise<LaunchArtifactType1> {
    const downloadUrl = `https://artifacts.example.com/${manifest.releaseId}.zip`; // stub
    const expiresAt = Date.now() + 7 * 86400 * 1000; // 7일
    await this.db.prepare(`
      INSERT INTO launch_artifacts_type1 (release_id, org_id, download_url, manifest_path, sha256, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(manifest.releaseId, manifest.orgId, downloadUrl, `/manifests/${manifest.releaseId}.json`,
            manifest.sha256, expiresAt).run();
    await this.recordDecision(manifest, 1);
    return { releaseId: manifest.releaseId, orgId: manifest.orgId, downloadUrl,
             manifestPath: `/manifests/${manifest.releaseId}.json`,
             zipSize: null, sha256: manifest.sha256, expiresAt, createdAt: Date.now() };
  }

  // LX-S04 RuntimeDeployer (Type 2)
  async deployType2(manifest: LaunchManifest): Promise<LaunchRuntimeType2> {
    const invokeEndpoint = `/api/launch/runtime/${manifest.releaseId}/invoke`;
    await this.db.prepare(`
      INSERT INTO launch_runtimes_type2 (release_id, org_id, invoke_endpoint, runtime_version, status)
      VALUES (?, ?, ?, ?, 'active')
    `).bind(manifest.releaseId, manifest.orgId, invokeEndpoint, "v1.0.0").run();
    await this.recordDecision({ ...manifest, launchType: 2 }, 2);
    return { releaseId: manifest.releaseId, orgId: manifest.orgId,
             invokeEndpoint, runtimeVersion: "v1.0.0", status: "active", createdAt: Date.now() };
  }

  // LX-S05 (부분) DecisionLogger
  private async recordDecision(manifest: LaunchManifest, launchType: LaunchType): Promise<void> {
    const id = crypto.randomUUID();
    await this.db.prepare(`
      INSERT INTO launch_decisions (id, release_id, org_id, launch_type, manifest_json)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, manifest.releaseId, manifest.orgId, launchType, JSON.stringify(manifest)).run();
    await this.auditBus.emit("launch.completed", {
      releaseId: manifest.releaseId, orgId: manifest.orgId,
      launchType, sha256: manifest.sha256,
    });
  }
}

async function computeSha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
```

### (f) `core/launch/routes/index.ts`

```typescript
// POST /launch/package, POST /launch/deploy, GET /launch/status/:release_id
export const launchApp = new OpenAPIHono<{ Bindings: Env }>();
```

### (g) audit-bus 통합 (F606)
- `launch.completed` event_type
- payload: `{ releaseId, orgId, launchType, sha256 }`

### (h) `app.ts` mount
```typescript
app.route("/api/launch", launchApp);
```

### (i) test mock 1건

`__tests__/launch-engine.test.ts`:
- Mock D1 + Mock AuditBus
- Test 1: package(input) → manifest sha256 정상 + publishType1 → launch_artifacts_type1 INSERT + DecisionLogger → launch_decisions INSERT + audit emit "launch.completed"

### (j) typecheck + tests GREEN
회귀 0 확증.

### (k) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | D1 0148 적용 + 3 테이블 | wrangler PRAGMA | type1 + type2 + decisions |
| P-b | core/launch/ 5+ files | find | types/schemas/services/routes |
| P-c | types.ts 4 export | grep | LaunchType/Manifest/ArtifactType1/RuntimeType2/DecisionRecord |
| P-d | schemas 4 등록 | grep | LaunchType + Package + Deploy + Response |
| P-e | LaunchEngine class + 4 method | grep | package/publishType1/deployType2/recordDecision |
| P-f | routes 3 endpoints | grep | package + deploy + status |
| P-g | audit-bus launch.completed 이벤트 | mock | emit |
| P-h | app.ts /api/launch mount | grep | 1 line |
| P-i | typecheck + 1 test GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-j | dual_ai_reviews sprint 361 자동 INSERT | D1 query | ≥ 1건 (hook 36 sprint 연속) |
| P-k | F606/F614/F627/F628/F629/F631 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-l | API smoke `POST /api/launch/package` | curl | 200 OK + sha256 + manifest |

## §5 전제

- F606/F627/F613/F628 ✅ MERGED
- F615 Guard-X (Sprint 360) 의존 X
- ⚠️ D1 0144 충돌 (357/358/359 머지 시 모두 0144 사용) — 별 hotfix 트랙

## §6 예상 시간

- autopilot **~20분** (Minimal LX-S01~S04 + test)

## §7 다음 사이클 후보 (F616 후속, T4 진행)

- **Sprint 362 — F623** /ax:domain-init β (T4, F628+F629 ✅)
- Sprint 363 — F603 default-deny 골격 (T4, 자체)
- Sprint 364 — F617 Guard-X Integration (T5, F615 ✅ 후)
- Sprint 365 — F618 Launch-X Integration (T5, F616 ✅ 후)
- D1 0144 hotfix (별 트랙)
