---
code: FX-DSGN-S136
title: "Sprint 136 — F317 데이터 백업/복구 + 운영 계획 Design"
version: "1.0"
status: Active
category: DSGN
feature: F317
sprint: 136
created: 2026-04-05
updated: 2026-04-05
author: Claude (autopilot)
---

# FX-DSGN-S136: F317 Design

## 1. 개요

Discovery 파이프라인 산출물/체크포인트/실행이력의 JSON Export/Import API + 자동 백업 Cron + 운영 가이드.

**대상 테이블**: bd_artifacts, pipeline_checkpoints, discovery_pipeline_runs, pipeline_events

## 2. D1 마이그레이션 — `0093_backup_metadata.sql`

```sql
-- F317: 백업 메타데이터 테이블
CREATE TABLE IF NOT EXISTS backup_metadata (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  backup_type TEXT NOT NULL DEFAULT 'manual'
    CHECK(backup_type IN ('manual', 'auto', 'pre_deploy')),
  scope TEXT NOT NULL DEFAULT 'full'
    CHECK(scope IN ('full', 'item')),
  biz_item_id TEXT,
  tables_included TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_bm_tenant ON backup_metadata(tenant_id, created_at);
CREATE INDEX idx_bm_type ON backup_metadata(backup_type);
```

**설계 결정**: payload를 D1 TEXT 컬럼에 JSON 직렬화. D1은 row 1MB 제한이 있으므로, 아이템 단위(scope='item')로 분할 백업이 기본 전략. full은 전체 org 스냅샷(소규모 데이터 기준).

## 3. Zod 스키마 — `backup-restore.ts`

```typescript
import { z } from "zod";

// 백업 생성 요청
export const backupCreateSchema = z.object({
  backupType: z.enum(["manual", "auto", "pre_deploy"]).default("manual"),
  scope: z.enum(["full", "item"]).default("full"),
  bizItemId: z.string().optional(),
});

// 백업 Import 요청
export const backupImportSchema = z.object({
  backupId: z.string(),
  strategy: z.enum(["replace", "merge"]).default("merge"),
});

// 백업 목록 조회
export const backupListQuerySchema = z.object({
  backupType: z.enum(["manual", "auto", "pre_deploy"]).optional(),
  scope: z.enum(["full", "item"]).optional(),
  bizItemId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
```

## 4. 서비스 — `backup-restore-service.ts`

```typescript
export class BackupRestoreService {
  constructor(private db: D1Database) {}

  /** Export — 지정 범위의 데이터를 JSON으로 직렬화하고 backup_metadata에 저장 */
  async exportBackup(input: {
    tenantId: string;
    backupType: "manual" | "auto" | "pre_deploy";
    scope: "full" | "item";
    bizItemId?: string;
    createdBy: string;
  }): Promise<BackupMeta>

  /** Import — backup_metadata에서 payload를 읽어 테이블에 복원 */
  async importBackup(input: {
    tenantId: string;
    backupId: string;
    strategy: "replace" | "merge";
  }): Promise<ImportResult>

  /** 백업 목록 조회 */
  async list(tenantId: string, query: BackupListQuery): Promise<{ items: BackupMeta[]; total: number }>

  /** 백업 상세 (payload 포함) */
  async getById(tenantId: string, backupId: string): Promise<BackupMeta | null>

  /** 백업 삭제 */
  async delete(tenantId: string, backupId: string): Promise<boolean>

  /** 자동 백업 — Cron에서 호출. 각 org별 전체 백업 + 7일 이전 auto 백업 자동 삭제 */
  async autoBackup(tenantId: string): Promise<BackupMeta>
}
```

### Export 흐름
1. scope에 따라 대상 row 수집 (full: tenant 전체, item: biz_item_id 기준)
2. 4개 테이블에서 SELECT → JSON.stringify
3. backup_metadata에 INSERT (payload 포함)
4. item_count + size_bytes 계산하여 저장

### Import 흐름 (strategy별)
- **merge**: INSERT OR IGNORE — 이미 존재하는 row는 건너뜀
- **replace**: 기존 데이터 DELETE 후 INSERT (scope 범위 내에서만)

### 자동 정리
- autoBackup 실행 시 7일 이전 `backup_type='auto'` 레코드 자동 삭제 (retention)

## 5. 라우트 — `backup-restore.ts`

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| POST | `/backup/export` | 백업 생성 (Export) | admin |
| POST | `/backup/import` | 백업 복원 (Import) | admin |
| GET | `/backup/list` | 백업 목록 조회 | member |
| GET | `/backup/:id` | 백업 상세 | member |
| DELETE | `/backup/:id` | 백업 삭제 | admin |

**roleGuard**: admin 전용 엔드포인트에 `roleGuard("admin")` 적용.

## 6. Cron 확장 — `scheduled.ts`

기존 `handleScheduled`에 자동 백업 로직 추가:

```typescript
// 기존: reconciliation + KPI 정리 (6시간마다)
// 추가: 자동 백업 (매일 — wrangler.toml에 cron 추가 또는 기존 cron에서 시간 필터)

// 시간 기반 분기: UTC 18시(KST 03시)에만 자동 백업 실행
const now = new Date();
if (now.getUTCHours() === 18) {
  const backupService = new BackupRestoreService(env.DB);
  const backupTasks = orgs.map(org => backupService.autoBackup(org.id));
  ctx.waitUntil(Promise.allSettled(backupTasks));
}
```

**설계 결정**: 별도 cron trigger 추가 대신, 기존 6시간 cron(`0 */6 * * *`)에서 UTC 18시 실행 분에만 백업 수행. wrangler.toml 변경 불필요.

## 7. Web UI — `dashboard.backup.tsx`

### 7.1 페이지 구조
```
/dashboard/backup
├─ 헤더: "백업 관리" + Export 버튼 + Import 버튼
├─ 필터: backupType 드롭다운 + scope 드롭다운
├─ 테이블: id | type | scope | item_count | size | created_by | created_at | 삭제
└─ 페이지네이션
```

### 7.2 API Client 추가 (`api-client.ts`)
```typescript
export async function exportBackup(params: BackupCreateParams): Promise<BackupMeta>
export async function importBackup(params: BackupImportParams): Promise<ImportResult>
export async function listBackups(params?: BackupListQuery): Promise<PaginatedList<BackupMeta>>
export async function getBackup(id: string): Promise<BackupMeta>
export async function deleteBackup(id: string): Promise<void>
```

### 7.3 사이드바 메뉴 (`AppLayout.tsx`)
- "설정" 그룹 하위에 "백업 관리" 메뉴 추가 (admin 전용, `Shield` 아이콘)

## 8. 운영 가이드 — `ops-guide.md`

### 구조
1. **백업 정책**: 자동 백업(매일 KST 03:00, 7일 보관) + 수동 백업(배포 전)
2. **복구 절차**: Import 단계별 가이드 + strategy 선택 기준
3. **모니터링**: F315 notification-service 연동 — 자동 백업 실패 시 알림
4. **Hotfix 체계**: 긴급 수정 → sprint 브랜치 → PR → squash merge → CI/CD 자동 배포
5. **담당자 매핑**: admin 역할자 = 서민원/김기욱/김정원 (project_team_members.md 기반)
6. **장애 대응**: 에스컬레이션 매트릭스 (L1: 자동 재시도 → L2: 수동 개입 → L3: 데이터 복구)

## 9. 테스트 — `backup-restore.test.ts`

| # | 테스트 | 설명 |
|---|--------|------|
| 1 | Export full — 전체 org 데이터 직렬화 | bd_artifacts + pipeline_runs + checkpoints + events 포함 확인 |
| 2 | Export item — 특정 biz_item_id 범위 | 해당 아이템 관련 row만 포함 |
| 3 | Import merge — 기존 데이터 보존 | 중복 ID 건너뜀, 신규만 추가 |
| 4 | Import replace — scope 내 데이터 교체 | 기존 삭제 후 복원 |
| 5 | Export-Import 라운드트립 | Export → Import → 데이터 일치 검증 |
| 6 | 빈 데이터 Export | item_count=0, size_bytes 최소 |
| 7 | 존재하지 않는 backup Import | 404 에러 |
| 8 | 권한 체크 — member가 export 시도 | 403 에러 |
| 9 | autoBackup + 7일 자동 삭제 | retention 정책 검증 |
| 10 | 백업 목록 + 페이지네이션 | limit/offset 동작 |

## 10. 파일 매핑 (구현 순서)

| # | 파일 | 동작 | 의존성 |
|---|------|------|--------|
| 1 | `api/src/db/migrations/0093_backup_metadata.sql` | 신규 | — |
| 2 | `api/src/schemas/backup-restore.ts` | 신규 | — |
| 3 | `api/src/services/backup-restore-service.ts` | 신규 | 1, 2 |
| 4 | `api/src/routes/backup-restore.ts` | 신규 | 3 |
| 5 | `api/src/app.ts` | 수정 — import + route 등록 | 4 |
| 6 | `api/src/scheduled.ts` | 수정 — autoBackup 추가 | 3 |
| 7 | `web/src/lib/api-client.ts` | 수정 — backup API 함수 | — |
| 8 | `web/src/routes/dashboard.backup.tsx` | 신규 — 백업 관리 페이지 | 7 |
| 9 | `web/src/layouts/AppLayout.tsx` | 수정 — 사이드바 메뉴 | 8 |
| 10 | `docs/specs/fx-discovery-v2/ops-guide.md` | 신규 — 운영 가이드 | — |
| 11 | `api/src/__tests__/backup-restore.test.ts` | 신규 — 테스트 10건 | 3, 4 |
