/**
 * F315: PipelinePermissionService — 파이프라인 승인 권한 관리
 */
import type { SetPermissionInput } from "../schemas/pipeline-monitoring.schema.js";

interface PermissionRow {
  id: string;
  pipeline_run_id: string;
  user_id: string | null;
  min_role: string;
  can_approve: number;
  can_abort: number;
  granted_by: string;
  created_at: string;
}

export interface PipelinePermission {
  id: string;
  pipelineRunId: string;
  userId: string | null;
  minRole: string;
  canApprove: boolean;
  canAbort: boolean;
  grantedBy: string;
  createdAt: string;
}

const ROLE_LEVEL: Record<string, number> & { admin: 3; member: 2 } = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

function mapRow(row: PermissionRow): PipelinePermission {
  return {
    id: row.id,
    pipelineRunId: row.pipeline_run_id,
    userId: row.user_id,
    minRole: row.min_role,
    canApprove: row.can_approve === 1,
    canAbort: row.can_abort === 1,
    grantedBy: row.granted_by,
    createdAt: row.created_at,
  };
}

export class PipelinePermissionService {
  constructor(private db: D1Database) {}

  async setPermission(
    runId: string,
    input: SetPermissionInput,
    grantedBy: string,
  ): Promise<PipelinePermission> {
    const id = crypto.randomUUID();

    await this.db
      .prepare(
        `INSERT INTO pipeline_permissions (id, pipeline_run_id, user_id, min_role, can_approve, can_abort, granted_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        runId,
        input.userId ?? null,
        input.minRole,
        input.canApprove ? 1 : 0,
        input.canAbort ? 1 : 0,
        grantedBy,
      )
      .run();

    const row = await this.db
      .prepare("SELECT * FROM pipeline_permissions WHERE id = ?")
      .bind(id)
      .first<PermissionRow>();

    return mapRow(row!);
  }

  async listPermissions(runId: string): Promise<PipelinePermission[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM pipeline_permissions WHERE pipeline_run_id = ? ORDER BY created_at ASC")
      .bind(runId)
      .all<PermissionRow>();

    return (results ?? []).map(mapRow);
  }

  /**
   * 해당 사용자가 승인 가능한지 확인.
   * 기본 정책: admin+ 역할은 명시적 설정 없어도 항상 승인 가능.
   */
  async canApprove(runId: string, userId: string, userRole: string): Promise<boolean> {
    // admin 이상은 항상 승인 가능 (기본 정책)
    if ((ROLE_LEVEL[userRole] ?? 0) >= ROLE_LEVEL.admin) {
      return true;
    }

    // 명시적 사용자 권한 확인
    const userPerm = await this.db
      .prepare(
        "SELECT can_approve FROM pipeline_permissions WHERE pipeline_run_id = ? AND user_id = ? AND can_approve = 1",
      )
      .bind(runId, userId)
      .first<{ can_approve: number }>();

    if (userPerm) return true;

    // 역할 기반 권한 확인
    const rolePerm = await this.db
      .prepare(
        "SELECT min_role FROM pipeline_permissions WHERE pipeline_run_id = ? AND user_id IS NULL AND can_approve = 1 ORDER BY created_at DESC LIMIT 1",
      )
      .bind(runId)
      .first<{ min_role: string }>();

    if (rolePerm) {
      return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[rolePerm.min_role] ?? 0);
    }

    // 기본: member 이상 가능
    return (ROLE_LEVEL[userRole] ?? 0) >= ROLE_LEVEL.member;
  }

  /**
   * 해당 사용자가 중단 가능한지 확인.
   * 기본 정책: admin+ 또는 파이프라인 생성자만 중단 가능.
   */
  async canAbort(runId: string, userId: string, userRole: string): Promise<boolean> {
    // admin 이상은 항상 중단 가능
    if ((ROLE_LEVEL[userRole] ?? 0) >= ROLE_LEVEL.admin) {
      return true;
    }

    // 파이프라인 생성자 확인
    const run = await this.db
      .prepare("SELECT created_by FROM discovery_pipeline_runs WHERE id = ?")
      .bind(runId)
      .first<{ created_by: string }>();

    if (run?.created_by === userId) return true;

    // 명시적 사용자 권한 확인
    const perm = await this.db
      .prepare(
        "SELECT can_abort FROM pipeline_permissions WHERE pipeline_run_id = ? AND user_id = ? AND can_abort = 1",
      )
      .bind(runId, userId)
      .first<{ can_abort: number }>();

    return !!perm;
  }
}
