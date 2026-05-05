// F611: agent domain D1 API — cross-domain callers use these functions instead of direct SQL

export interface AgentSessionRow {
  id: string;
  name: string;
  status: string;
  profile: string;
  worktree: string | null;
  branch: string | null;
  windows: number;
  last_activity: string | null;
  collected_at: string;
}

export async function queryAllAgentSessions(db: D1Database): Promise<AgentSessionRow[]> {
  const result = await db
    .prepare(
      `SELECT id, name, status, profile, worktree, branch, windows, last_activity, collected_at
       FROM agent_sessions
       ORDER BY CASE status WHEN 'busy' THEN 0 WHEN 'idle' THEN 1 WHEN 'done' THEN 2 ELSE 3 END,
                last_activity DESC`,
    )
    .all<AgentSessionRow>();
  return result.results ?? [];
}

export async function queryDistinctAgentWorktrees(
  db: D1Database,
): Promise<Array<{ path: string; branch: string }>> {
  const result = await db
    .prepare(`SELECT DISTINCT worktree AS path, branch FROM agent_sessions WHERE worktree IS NOT NULL`)
    .all<{ path: string; branch: string }>();
  return result.results ?? [];
}

export interface SyncAgentSessionsInput {
  sessions: Array<{
    name: string;
    status: string;
    profile: string;
    windows: number;
    last_activity: number;
  }>;
  worktrees: Array<{ path: string; branch: string }>;
  collected_at: string;
}

export async function syncAgentSessionsData(
  db: D1Database,
  input: SyncAgentSessionsInput,
): Promise<{ synced: number; removed: number }> {
  const now = new Date().toISOString();

  const stmts = input.sessions.map((s) => {
    const lastActivityIso = s.last_activity
      ? new Date(s.last_activity * 1000).toISOString()
      : null;
    let profile = s.profile;
    if (!["coder", "reviewer", "tester"].includes(profile)) profile = "unknown";
    let status = s.status;
    if (!["busy", "idle", "done"].includes(status)) status = "idle";

    return db
      .prepare(
        `INSERT INTO agent_sessions (id, name, status, profile, windows, last_activity, collected_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status       = excluded.status,
           profile      = excluded.profile,
           windows      = excluded.windows,
           last_activity= excluded.last_activity,
           collected_at = excluded.collected_at,
           updated_at   = excluded.updated_at`,
      )
      .bind(s.name, s.name, status, profile, s.windows, lastActivityIso, input.collected_at, now, now);
  });

  if (stmts.length > 0) {
    await db.batch(stmts);
  }

  const names = input.sessions.map((s) => s.name);
  let removed = 0;
  if (names.length > 0) {
    const placeholders = names.map(() => "?").join(",");
    const del = await db
      .prepare(`DELETE FROM agent_sessions WHERE id NOT IN (${placeholders})`)
      .bind(...names)
      .run();
    removed = del.meta.changes ?? 0;
  } else {
    const del = await db.prepare(`DELETE FROM agent_sessions`).run();
    removed = del.meta.changes ?? 0;
  }

  for (const wt of input.worktrees) {
    const branch = wt.branch.replace(/^refs\/heads\//, "");
    await db
      .prepare(
        `UPDATE agent_sessions SET worktree = ?, branch = ? WHERE name LIKE ? AND worktree IS NULL`,
      )
      .bind(wt.path, branch, `%${branch.split("/").pop() ?? ""}%`)
      .run();
  }

  return { synced: input.sessions.length, removed };
}

export async function countActiveSessionsByProject(
  db: D1Database,
  projectId: string,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM agent_sessions WHERE project_id = ? AND status = 'active'`,
    )
    .bind(projectId)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

export async function countTasksByProjectSessions(
  db: D1Database,
  projectId: string,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM agent_tasks WHERE agent_session_id IN (SELECT id FROM agent_sessions WHERE project_id = ?)`,
    )
    .bind(projectId)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

export async function countAgentsByOrg(db: D1Database, orgId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) as cnt FROM agents WHERE org_id = ?`)
    .bind(orgId)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

export async function countRecentAgentTasks(db: D1Database): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM agent_tasks WHERE created_at >= datetime('now', '-1 hour')`,
    )
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

export interface InsertAgentMessageParams {
  id: string;
  taskId: string;
  role: string;
  content: string;
  messageType: string;
  createdAt: string;
}

export async function insertAgentMessage(
  db: D1Database,
  params: InsertAgentMessageParams,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO agent_messages (id, task_id, role, content, message_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(params.id, params.taskId, params.role, params.content, params.messageType, params.createdAt)
    .run();
}

export interface UpdateAgentTaskHookStatusParams {
  taskId: string;
  hookStatus: string;
  attempts: number;
  log: string;
}

export async function updateAgentTaskHookStatus(
  db: D1Database,
  params: UpdateAgentTaskHookStatusParams,
): Promise<void> {
  await db
    .prepare(
      `UPDATE agent_tasks
       SET hook_status = ?, auto_fix_attempts = ?, auto_fix_log = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(params.hookStatus, params.attempts, params.log, params.taskId)
    .run();
}

export interface InsertAgentWorktreeParams {
  id: string;
  agentId: string;
  branchName: string;
  worktreePath: string;
  baseBranch: string;
  createdAt: string;
}

export async function insertAgentWorktree(
  db: D1Database,
  params: InsertAgentWorktreeParams,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO agent_worktrees
       (id, agent_id, branch_name, worktree_path, base_branch, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`,
    )
    .bind(
      params.id,
      params.agentId,
      params.branchName,
      params.worktreePath,
      params.baseBranch,
      params.createdAt,
    )
    .run();
}

export async function cleanAgentWorktree(
  db: D1Database,
  agentId: string,
  cleanedAt: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE agent_worktrees SET status = 'cleaned', cleaned_at = ?
       WHERE agent_id = ? AND status = 'active'`,
    )
    .bind(cleanedAt, agentId)
    .run();
}

export interface FeedbackDateRangeParams {
  from: string;
  to: string;
  taskType?: string;
}

export async function queryAgentFeedbackTopReasons(
  db: D1Database,
  params: { taskType: string; from: string; to: string },
): Promise<Array<{ failure_reason: string; cnt: number }>> {
  const result = await db
    .prepare(
      `SELECT failure_reason, COUNT(*) as cnt
       FROM agent_feedback
       WHERE task_type = ?
         AND failure_reason IS NOT NULL
         AND date(created_at) >= ?
         AND date(created_at) <= ?
       GROUP BY failure_reason
       ORDER BY cnt DESC
       LIMIT 3`,
    )
    .bind(params.taskType, params.from, params.to)
    .all<{ failure_reason: string; cnt: number }>();
  return result.results ?? [];
}

export async function countAgentFeedbackPending(
  db: D1Database,
  params: { taskType: string; from: string; to: string },
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as cnt
       FROM agent_feedback
       WHERE task_type = ?
         AND status = 'pending'
         AND date(created_at) >= ?
         AND date(created_at) <= ?`,
    )
    .bind(params.taskType, params.from, params.to)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

export async function getTopAgentFeedbackReason(
  db: D1Database,
  params: { date: string; taskType?: string },
): Promise<{ failure_reason: string; cnt: number } | null> {
  const taskFilter = params.taskType ? "AND task_type = ?" : "";
  const binds = params.taskType ? [params.date, params.taskType] : [params.date];
  return db
    .prepare(
      `SELECT failure_reason, COUNT(*) as cnt
       FROM agent_feedback
       WHERE failure_reason IS NOT NULL
         AND date(created_at) = ?
         ${taskFilter}
       GROUP BY failure_reason
       ORDER BY cnt DESC
       LIMIT 1`,
    )
    .bind(...binds)
    .first<{ failure_reason: string; cnt: number }>();
}

export async function aggregateAgentFeedbackStatus(
  db: D1Database,
  params: FeedbackDateRangeParams,
): Promise<{ pending: number; reviewed: number; applied: number }> {
  const taskFilter = params.taskType ? "AND task_type = ?" : "";
  const binds = params.taskType
    ? [params.from, params.to, params.taskType]
    : [params.from, params.to];
  const row = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) as reviewed,
         SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied
       FROM agent_feedback
       WHERE date(created_at) >= ? AND date(created_at) <= ?
         ${taskFilter}`,
    )
    .bind(...binds)
    .first<{ pending: number; reviewed: number; applied: number }>();
  return { pending: row?.pending ?? 0, reviewed: row?.reviewed ?? 0, applied: row?.applied ?? 0 };
}

export async function countAcceptedProposals(db: D1Database): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM agent_improvement_proposals WHERE status = 'accepted'`,
    )
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}
