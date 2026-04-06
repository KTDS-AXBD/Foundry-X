/**
 * ProjectOverviewService — 크로스 프로젝트 건강도 + 요약 집계 (F98)
 */

export interface ProjectSummary {
  id: string;
  name: string;
  healthScore: number;
  grade: string;
  activeAgents: number;
  openTasks: number;
  recentPrCount: number;
  lastActivity: string | null;
}

export interface AgentActivity {
  tasksCompleted: number;
  prsCreated: number;
  messagesSent: number;
}

export interface ProjectOverview {
  totalProjects: number;
  overallHealth: number;
  projects: ProjectSummary[];
  agentActivity: {
    last24h: AgentActivity;
    last7d: AgentActivity;
  };
}

export interface ProjectHealth {
  id: string;
  name: string;
  specScore: number;
  codeScore: number;
  testScore: number;
  overallScore: number;
  grade: string;
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export class ProjectOverviewService {
  constructor(private db: D1Database) {}

  async getOverview(orgId: string): Promise<ProjectOverview> {
    // 1. Projects in org
    const { results: projects } = await this.db
      .prepare("SELECT id, name, created_at FROM projects WHERE org_id = ?")
      .bind(orgId)
      .all();

    const projectSummaries: ProjectSummary[] = [];

    for (const proj of projects ?? []) {
      const p = proj as Record<string, unknown>;
      const projectId = p.id as string;

      // Active agent sessions
      const activeAgents = await this.db
        .prepare("SELECT COUNT(*) as cnt FROM agent_sessions WHERE project_id = ? AND status = 'active'")
        .bind(projectId)
        .first<{ cnt: number }>();

      // Open tasks (non-completed)
      const openTasks = await this.db
        .prepare("SELECT COUNT(*) as cnt FROM agent_tasks WHERE agent_session_id IN (SELECT id FROM agent_sessions WHERE project_id = ?) AND pr_status != 'merged'")
        .bind(projectId)
        .first<{ cnt: number }>();

      // Recent PRs (last 7 days)
      const recentPrs = await this.db
        .prepare("SELECT COUNT(*) as cnt FROM agent_prs WHERE repo LIKE ? AND created_at >= datetime('now', '-7 days')")
        .bind(`%${projectId}%`)
        .first<{ cnt: number }>();

      // Last activity
      const lastTask = await this.db
        .prepare("SELECT created_at FROM agent_tasks WHERE agent_session_id IN (SELECT id FROM agent_sessions WHERE project_id = ?) ORDER BY created_at DESC LIMIT 1")
        .bind(projectId)
        .first<{ created_at: string }>();

      // Simple health score based on available data
      const healthScore = Math.min(100, 70 + (activeAgents?.cnt ?? 0) * 5 + (recentPrs?.cnt ?? 0) * 3);

      projectSummaries.push({
        id: projectId,
        name: p.name as string,
        healthScore,
        grade: scoreToGrade(healthScore),
        activeAgents: activeAgents?.cnt ?? 0,
        openTasks: openTasks?.cnt ?? 0,
        recentPrCount: recentPrs?.cnt ?? 0,
        lastActivity: lastTask?.created_at ?? null,
      });
    }

    const overallHealth =
      projectSummaries.length > 0
        ? projectSummaries.reduce((sum, p) => sum + p.healthScore, 0) / projectSummaries.length
        : 0;

    // Agent activity aggregation
    const activity24h = await this.getAgentActivity(orgId, "-1 day");
    const activity7d = await this.getAgentActivity(orgId, "-7 days");

    return {
      totalProjects: projectSummaries.length,
      overallHealth: Math.round(overallHealth * 10) / 10,
      projects: projectSummaries,
      agentActivity: {
        last24h: activity24h,
        last7d: activity7d,
      },
    };
  }

  async getHealth(orgId: string): Promise<ProjectHealth[]> {
    const { results: projects } = await this.db
      .prepare("SELECT id, name FROM projects WHERE org_id = ?")
      .bind(orgId)
      .all();

    return (projects ?? []).map((p) => {
      const proj = p as Record<string, unknown>;
      // Placeholder scores — real implementation would compute from SDD triangle
      const specScore = 85;
      const codeScore = 90;
      const testScore = 80;
      const overallScore = Math.round((specScore + codeScore + testScore) / 3);
      return {
        id: proj.id as string,
        name: proj.name as string,
        specScore,
        codeScore,
        testScore,
        overallScore,
        grade: scoreToGrade(overallScore),
      };
    });
  }

  async getActivity(orgId: string): Promise<{ last24h: AgentActivity; last7d: AgentActivity }> {
    return {
      last24h: await this.getAgentActivity(orgId, "-1 day"),
      last7d: await this.getAgentActivity(orgId, "-7 days"),
    };
  }

  private async getAgentActivity(orgId: string, interval: string): Promise<AgentActivity> {
    const tasksCompleted = await this.db
      .prepare(
        `SELECT COUNT(*) as cnt FROM agent_tasks
         WHERE created_at >= datetime('now', ?)
         AND agent_session_id IN (
           SELECT id FROM agent_sessions WHERE project_id IN (
             SELECT id FROM projects WHERE org_id = ?
           )
         )`,
      )
      .bind(interval, orgId)
      .first<{ cnt: number }>();

    const prsCreated = await this.db
      .prepare(
        `SELECT COUNT(*) as cnt FROM agent_prs
         WHERE created_at >= datetime('now', ?)
         AND agent_id IN (
           SELECT id FROM agents WHERE org_id = ?
         )`,
      )
      .bind(interval, orgId)
      .first<{ cnt: number }>();

    const messagesSent = await this.db
      .prepare(
        `SELECT COUNT(*) as cnt FROM agent_messages
         WHERE created_at >= datetime('now', ?)`,
      )
      .bind(interval)
      .first<{ cnt: number }>();

    return {
      tasksCompleted: tasksCompleted?.cnt ?? 0,
      prsCreated: prsCreated?.cnt ?? 0,
      messagesSent: messagesSent?.cnt ?? 0,
    };
  }
}
