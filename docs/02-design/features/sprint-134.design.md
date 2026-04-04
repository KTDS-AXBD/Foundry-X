---
code: FX-DSGN-S134
title: "Sprint 134 — F315 상태 모니터링 + 알림 + 권한 제어 Design"
version: "1.0"
status: Active
category: DSGN
feature: F315
sprint: 134
created: 2026-04-05
updated: 2026-04-05
author: Claude (autopilot)
---

# FX-DSGN-S134: F315 Design

## 1. 개요

파이프라인 진행 대시보드 + 이벤트→알림 자동 발행 + HITL 승인 권한 제어.

기존 인프라(`NotificationService`, `roleGuard`, `PipelineTimeline`)를 최대한 활용하여 연결 + 확장.

## 2. D1 마이그레이션 — `0092_pipeline_monitoring.sql`

```sql
-- 1. pipeline_permissions — 파이프라인별 승인 가능 역할/사용자
CREATE TABLE IF NOT EXISTS pipeline_permissions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  pipeline_run_id TEXT NOT NULL,
  user_id TEXT,
  min_role TEXT NOT NULL DEFAULT 'member'
    CHECK(min_role IN ('viewer', 'member', 'admin', 'owner')),
  can_approve INTEGER NOT NULL DEFAULT 1,
  can_abort INTEGER NOT NULL DEFAULT 0,
  granted_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_pp_run ON pipeline_permissions(pipeline_run_id);
CREATE INDEX idx_pp_user ON pipeline_permissions(user_id);

-- 2. pipeline_checkpoints 확장 — 승인자 역할 기록
ALTER TABLE pipeline_checkpoints ADD COLUMN approver_role TEXT;
```

## 3. Zod 스키마 — `pipeline-monitoring.schema.ts`

```typescript
import { z } from "zod";

// 대시보드 조회 쿼리
export const dashboardQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// 권한 설정 입력
export const setPermissionSchema = z.object({
  userId: z.string().optional(),
  minRole: z.enum(["viewer", "member", "admin", "owner"]).default("member"),
  canApprove: z.boolean().default(true),
  canAbort: z.boolean().default(false),
});

// 파이프라인 알림 타입 확장
export const PIPELINE_NOTIFICATION_TYPES = [
  "pipeline_checkpoint_pending",
  "pipeline_step_failed",
  "pipeline_completed",
  "pipeline_aborted",
] as const;
export type PipelineNotificationType = (typeof PIPELINE_NOTIFICATION_TYPES)[number];
```

## 4. 서비스

### 4.1 `PipelineNotificationService`

파이프라인 이벤트 발생 시 인앱 알림을 자동 발행.

```
메서드:
- notifyCheckpointPending(runId, stepId, orgId) → 승인 권한자들에게 알림
- notifyStepFailed(runId, stepId, errorMsg, orgId) → 파이프라인 생성자에게 알림
- notifyCompleted(runId, orgId) → 관련자 전체 알림
- notifyAborted(runId, orgId) → 생성자 + 승인자들에게 알림
- getApproverIds(runId, orgId) → 승인 가능 사용자 ID 목록
```

**중복 방지**: 같은 (runId, stepId, type) 조합으로 5분 내 재발행 차단.

### 4.2 `PipelinePermissionService`

파이프라인별 승인 권한 관리.

```
메서드:
- setPermission(runId, input, grantedBy) → 권한 설정
- listPermissions(runId) → 권한 목록
- canApprove(runId, userId, userRole) → boolean — 해당 사용자가 승인 가능한지
- canAbort(runId, userId, userRole) → boolean — 해당 사용자가 중단 가능한지
```

**기본 정책**: `pipeline_permissions`에 명시적 설정이 없으면, `admin`+ 역할은 항상 승인 가능.

### 4.3 기존 서비스 수정

**`PipelineCheckpointService.approve()`**: 승인 시 `approver_role` 기록.

**`DiscoveryPipelineService`**: 이벤트 발생 시 `PipelineNotificationService` 호출 hook 추가.

## 5. API 엔드포인트

### 5.1 신규 라우트 — `pipeline-monitoring.ts`

| # | Method | Path | 설명 | 권한 |
|---|--------|------|------|------|
| 1 | GET | `/discovery-pipeline/dashboard` | 상태별 집계 + 최근 실행 목록 | auth+tenant |
| 2 | GET | `/discovery-pipeline/runs/:id/permissions` | 승인 권한 목록 | auth+tenant |
| 3 | PUT | `/discovery-pipeline/runs/:id/permissions` | 승인 권한 설정 | admin+ |
| 4 | GET | `/discovery-pipeline/runs/:id/audit-log` | 승인/거부 이력 | auth+tenant |

### 5.2 기존 라우트 수정

| # | 기존 EP | 변경 |
|---|---------|------|
| 1 | POST `../checkpoints/:cpId/approve` | `PipelinePermissionService.canApprove()` 검증 추가 |
| 2 | POST `../checkpoints/:cpId/reject` | `PipelinePermissionService.canApprove()` 검증 추가 |
| 3 | POST `../runs/:id/step-complete` | `PipelineNotificationService` 호출 추가 |
| 4 | POST `../runs/:id/step-failed` | `PipelineNotificationService` 호출 추가 |
| 5 | POST `../runs/:id/action` (abort) | abort 시 `canAbort()` 검증 + 알림 |

## 6. Web 컴포넌트

### 6.1 `PipelineMonitorDashboard.tsx`

파이프라인 전체 현황 대시보드:
- 상단: 상태별 카드 (idle/running/paused/failed/completed 각 개수)
- 하단: 최근 실행 목록 (테이블: 아이템명, 상태, 현재 단계, 시작일, 소요시간)
- 클릭 시 상세 페이지 이동

### 6.2 `PipelinePermissionEditor.tsx`

특정 파이프라인 실행의 승인 권한 설정:
- 현재 권한 목록 표시
- 역할 기반 최소 권한 설정 (드롭다운)
- 특정 사용자 추가/제거

### 6.3 `CheckpointApproverInfo.tsx`

체크포인트 카드에 승인자 정보 표시:
- 승인/거부자 이름 + 역할 + 시각
- 대기 중일 때 "승인 대기 중" + 남은 시간

### 6.4 Web 라우트 통합

- `/discovery/pipeline` 기존 라우트에 `PipelineMonitorDashboard` 탭 추가
- 기존 `CheckpointReviewPanel`에 권한 체크 로직 추가 (승인 불가 시 버튼 비활성)

## 7. 테스트

### 7.1 API 테스트 — `pipeline-monitoring.test.ts`

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | 대시보드 집계 | 상태별 count 정확성 |
| 2 | 권한 설정/조회 | CRUD 동작 |
| 3 | 승인 권한 검증 | admin=승인가능, viewer=403 |
| 4 | 알림 발행 | 체크포인트 생성 시 알림 1건 |
| 5 | 중복 알림 방지 | 5분 내 재발행 차단 |
| 6 | 승인 이력 조회 | audit-log에 승인자 역할 포함 |
| 7 | 실패 알림 | step-failed 시 생성자에게 알림 |
| 8 | 완료 알림 | 파이프라인 완료 시 관련자 알림 |
| 9 | abort 권한 | canAbort=false면 403 |
| 10 | 기본 정책 | 권한 미설정 시 admin 승인 가능 |

### 7.2 Web 테스트 — `pipeline-monitor-dashboard.test.tsx`

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | 대시보드 렌더링 | 상태별 카드 5개 표시 |
| 2 | 실행 목록 | 테이블 행 렌더링 |
| 3 | 권한 에디터 | 역할 선택 + 저장 동작 |
| 4 | 승인자 정보 | approved 상태에서 승인자 표시 |
| 5 | 비활성 버튼 | 권한 없으면 승인 버튼 disabled |

## 8. 파일 매핑

| 파일 | 유형 | 설명 |
|------|------|------|
| `packages/api/src/db/migrations/0092_pipeline_monitoring.sql` | D1 | 스키마 확장 |
| `packages/api/src/schemas/pipeline-monitoring.schema.ts` | Schema | Zod 스키마 |
| `packages/api/src/services/pipeline-notification-service.ts` | Service | 알림 자동 발행 |
| `packages/api/src/services/pipeline-permission-service.ts` | Service | 승인 권한 관리 |
| `packages/api/src/routes/pipeline-monitoring.ts` | Route | 4 EP |
| `packages/api/src/routes/discovery-pipeline.ts` | Route | 기존 EP 수정 (권한+알림 hook) |
| `packages/api/src/services/pipeline-checkpoint-service.ts` | Service | approve에 approver_role 추가 |
| `packages/api/src/schemas/notification.schema.ts` | Schema | 알림 타입 확장 |
| `packages/web/src/components/feature/discovery/PipelineMonitorDashboard.tsx` | Web | 대시보드 |
| `packages/web/src/components/feature/discovery/PipelinePermissionEditor.tsx` | Web | 권한 설정 |
| `packages/web/src/components/feature/discovery/CheckpointApproverInfo.tsx` | Web | 승인자 정보 |
| `packages/api/src/__tests__/pipeline-monitoring.test.ts` | Test | API 테스트 10건 |
| `packages/web/src/__tests__/pipeline-monitor-dashboard.test.tsx` | Test | Web 테스트 5건 |
