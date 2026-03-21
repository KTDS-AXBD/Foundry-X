import type { Env } from "./env.js";
import { GitHubService } from "./services/github.js";
import { ReconciliationService } from "./services/reconciliation.js";
import { KpiLogger } from "./services/kpi-logger.js";
import { parseSpecRequirements } from "./services/spec-parser.js";

// ─── Cloudflare Workers Cron Trigger Handler ───

export async function handleScheduled(
  _event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  const github = new GitHubService(env.GITHUB_TOKEN, env.GITHUB_REPO);
  const specParser = { parseContent: parseSpecRequirements };
  const kpiLogger = new KpiLogger(env.DB);

  // 모든 org에 대해 reconciliation + KPI 정리 실행
  const { results: orgs } = await env.DB
    .prepare("SELECT id FROM organizations")
    .all<{ id: string }>();

  const tasks = orgs.map(async (org) => {
    const service = new ReconciliationService(env.DB, github, specParser);
    await service.run(org.id, "cron", "git-wins");
    await kpiLogger.pruneOldEvents(org.id, 30);
  });

  ctx.waitUntil(Promise.allSettled(tasks));
}
