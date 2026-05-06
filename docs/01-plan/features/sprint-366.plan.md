---
code: FX-PLAN-366
title: Sprint 366 — F618 Launch-X Integration (T5 두 번째)
version: 1.0
status: Active
category: PLAN
created: 2026-05-06
updated: 2026-05-06
sprint: 366
f_item: F618
req: FX-REQ-683
priority: P2
---

# Sprint 366 — F618 Launch-X Integration (T5 두 번째)

> SPEC.md §5 F618 row 권위 소스. 17 internal dev plan §3 T5 Integration 두 번째.
> 10 dev_plan_launch_x_v1.md §3.4 PackagePublisher + §4 Storage 활용.

## §1 배경 + 사전 측정

### F616 Launch-X Solo (✅ MERGED) 자산
- LaunchEngine class (package + publishType1 + deployType2 + recordDecision)
- launch_artifacts_type1, launch_runtimes_type2, launch_decisions D1 테이블

### F618 추가 자산 (Integration)

| 자산 | 용도 |
|------|------|
| **SkillRegistry** | 신규 Skill 등록 (Foundry-X Skill Runtime 차용) |
| **ObjectStore** | Type 1 zip 업로드/다운로드 URL stub |
| **Rollback** | 직전 버전 추적 (launch_rollbacks 테이블) |

### canary + rollback < 30s 게이트

Cloudflare Workers versioned deployment 의존(외부). **본 sprint는 인터페이스 + 이력 stub만**. 실 canary는 후속.

### 의존
- F616 Launch-X Solo ✅ MERGED
- F606 audit-bus ✅
- F613 docs ✅

## §2 인터뷰 4회 패턴 (S336, 45회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T5 두 번째 = F618 | F616 Solo 후 자연 |
| 2차 분량 | **Minimal (SkillRegistry + ObjectStore + rollback + E2E)** | T5 표준 |
| 3차 위치 | core/launch/ 합류 | F616 sub-app 확장 |
| 4차 시동 | **즉시** | 3 sprint 한도 내 |

## §3 범위 (a~k)

### (a) `core/launch/services/skill-registry.service.ts` 신설

```typescript
export interface SkillEntry {
  skillId: string;
  skillVersion: string;
  skillMeta: Record<string, unknown>;
  active: boolean;
  registeredAt: number;
}

export class SkillRegistryService {
  constructor(private db: D1Database, private auditBus: AuditBus) {}

  async register(skill: { skillId: string; skillVersion: string; meta?: Record<string, unknown> }): Promise<SkillEntry> {
    const now = Date.now();
    await this.db.prepare(`
      INSERT INTO skill_registry_entries (skill_id, skill_version, skill_meta, active, registered_at)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT (skill_id) DO UPDATE SET
        skill_version = excluded.skill_version, skill_meta = excluded.skill_meta, active = 1, registered_at = ?
    `).bind(skill.skillId, skill.skillVersion, JSON.stringify(skill.meta ?? {}), now, now).run();

    await this.auditBus.emit("launch.skill_registered", { skillId: skill.skillId, skillVersion: skill.skillVersion });
    return { skillId: skill.skillId, skillVersion: skill.skillVersion, skillMeta: skill.meta ?? {}, active: true, registeredAt: now };
  }

  async lookup(skillId: string): Promise<SkillEntry | null> { /* SELECT */ }
  async listActive(): Promise<SkillEntry[]> { /* SELECT WHERE active=1 */ }
}
```

### (b) `core/launch/services/object-store.service.ts` 신설

```typescript
export interface ObjectUploadResult {
  releaseId: string;
  downloadUrl: string;
  expiresAt: number;
  size: number | null;
}

export class ObjectStoreService {
  constructor(private auditBus: AuditBus) {}

  async uploadZip(releaseId: string, content: Uint8Array | string): Promise<ObjectUploadResult> {
    // Stub: 실 구현은 R2 또는 외부 storage. 본 sprint는 stub URL 발급
    const downloadUrl = `https://artifacts.example.com/${releaseId}.zip`;
    const expiresAt = Date.now() + 7 * 86400 * 1000;
    const size = typeof content === "string" ? content.length : content.byteLength;

    await this.auditBus.emit("launch.object_store.uploaded", { releaseId, size, expiresAt });
    return { releaseId, downloadUrl, expiresAt, size };
  }

  async getDownloadUrl(releaseId: string, expiresIn: number = 3600): Promise<string> {
    // Stub: signed URL with expiry
    return `https://artifacts.example.com/${releaseId}.zip?expires=${Date.now() + expiresIn * 1000}`;
  }

  async cleanupExpired(): Promise<number> {
    // Stub: cleanup expired entries (실 구현은 후속)
    return 0;
  }
}
```

### (c) `core/launch/services/rollback.service.ts` 신설

```typescript
export interface RollbackRecord {
  rollbackId: string;
  releaseId: string;
  fromVersion: string;
  toVersion: string;
  reason: string;
  executedAt: number;
  requester: string;
}

export class RollbackService {
  constructor(private db: D1Database, private auditBus: AuditBus) {}

  async executeRollback(input: {
    releaseId: string; fromVersion: string; toVersion: string; reason: string; requester: string;
  }): Promise<RollbackRecord> {
    const rollbackId = crypto.randomUUID();
    const executedAt = Date.now();

    await this.db.prepare(`
      INSERT INTO launch_rollbacks (rollback_id, release_id, from_version, to_version, reason, requester, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(rollbackId, input.releaseId, input.fromVersion, input.toVersion, input.reason, input.requester, executedAt).run();

    await this.auditBus.emit("launch.rollback.completed", {
      rollbackId, releaseId: input.releaseId,
      fromVersion: input.fromVersion, toVersion: input.toVersion, requester: input.requester,
    });

    return { rollbackId, releaseId: input.releaseId, fromVersion: input.fromVersion,
             toVersion: input.toVersion, reason: input.reason, executedAt, requester: input.requester };
  }

  async getRollbackHistory(releaseId: string): Promise<RollbackRecord[]> { /* SELECT */ }
}
```

### (d) D1 migration `0152_launch_rollbacks.sql`

```sql
-- F618: Launch-X Integration (T5)

CREATE TABLE launch_rollbacks (
  rollback_id TEXT PRIMARY KEY,
  release_id TEXT NOT NULL,
  from_version TEXT NOT NULL,
  to_version TEXT NOT NULL,
  reason TEXT NOT NULL,
  requester TEXT NOT NULL,
  executed_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX idx_launch_rollbacks_release ON launch_rollbacks(release_id, executed_at DESC);

-- append-only
CREATE TRIGGER launch_rollbacks_no_update BEFORE UPDATE ON launch_rollbacks
BEGIN SELECT RAISE(FAIL, 'launch_rollbacks is append-only'); END;

CREATE TABLE skill_registry_entries (
  skill_id TEXT PRIMARY KEY,
  skill_version TEXT NOT NULL,
  skill_meta TEXT,                          -- JSON
  active INTEGER NOT NULL DEFAULT 1,
  registered_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  CHECK (active IN (0, 1))
);

CREATE INDEX idx_skill_registry_active ON skill_registry_entries(active) WHERE active = 1;
```

### (e) types.ts + (f) schemas + (g) routes

(기존 plan과 동일 패턴, 5 endpoints: skill-registry/register, rollback, rollback/history/:releaseId, object-store/upload, object-store/download/:releaseId)

### (h) audit-bus 3 이벤트
- `launch.skill_registered`
- `launch.rollback.completed`
- `launch.object_store.uploaded`

### (i) E2E test 1건

`__tests__/launch-integration.test.ts`:
- Type 1 path: package → publishType1 (zip stub) → object-store.uploadZip → downloadUrl 발급 → rollback (이전 version 복귀)
- Type 2 path: package → deployType2 → skill-registry.register → rollback (blue/green stub)
- 양 path 모두 audit emit 검증

### (j) typecheck + tests GREEN
회귀 0 확증.

### (k) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | D1 0152 적용 + 2 테이블 | wrangler PRAGMA | rollbacks + skill_registry_entries |
| P-b | core/launch/services/ 3 신규 | find | skill-registry + object-store + rollback |
| P-c | types.ts 3 신규 export | grep | SkillEntry + RollbackRecord + ObjectUploadResult |
| P-d | schemas 3 추가 | grep | RegisterSkill + RollbackRequest + RollbackResponse |
| P-e | 3 service class + 각 3 method | grep | 9 method (register/lookup/listActive + uploadZip/getDownloadUrl/cleanupExpired + executeRollback/getRollbackHistory) |
| P-f | routes 5 endpoints | grep | skill-registry/register + rollback + rollback/history + object-store/upload + object-store/download |
| P-g | audit-bus 3 이벤트 mock | mock | 3 emits |
| P-h | app.ts /api/launch mount 회귀 0 | grep | 1 line (F616에서 이미) |
| P-i | typecheck + 1 E2E test GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-j | dual_ai_reviews sprint 366 자동 INSERT | D1 query | ≥ 1건 (hook 41 sprint 연속) |
| P-k | F606/F614/F627/F628/F629/F631/F615/F616 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-l | API smoke `POST /api/launch/rollback` | curl | 200 OK + audit emit |

## §5 전제

- F616 Launch-X Solo ✅ MERGED (Sprint 361)
- F606 audit-bus ✅ + F613 docs ✅
- 활성 sprint 362/365 — 366 시동 시 3 sprint 한도

## §6 예상 시간

- autopilot **~25분** (Minimal — 3 service + D1 2 tables + 5 endpoints + 1 E2E test)

## §7 다음 사이클 후보 (F618 후속)

- **Sprint 367 — F620** Cross-Org Integration (T5, F603 ✅ + F618 ✅ 후, LLM 임베딩 + Expert HITL)
- Sprint 368 — F619 4대 진단 Multi-Evidence (T6, Decode-X 외부 의존)
- Sprint 369 — F621 KPI 통합 (T6, F604+F605 외부 의존)
- F600 5-Layer 통합 (T7, 5 repo orchestration 외부)
