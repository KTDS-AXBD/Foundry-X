import type { Env } from "./env.js";
import { GitHubService } from "./modules/portal/services/github.js";
import { ReconciliationService } from "./modules/portal/services/reconciliation.js";
import { KpiLogger } from "./modules/portal/services/kpi-logger.js";
import { parseSpecRequirements } from "./core/spec/services/spec-parser.js";
import { BackupRestoreService } from "./core/harness/services/backup-restore-service.js";
import { processDomainEvents } from './core/events/event-cron.js';

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
  ctx.waitUntil(processDomainEvents(env));

  // F317: 자동 백업 — UTC 18시 (KST 03시)에만 실행
  const now = new Date();
  if (now.getUTCHours() === 18) {
    const backupService = new BackupRestoreService(env.DB);
    const backupTasks = orgs.map((org) => backupService.autoBackup(org.id));
    ctx.waitUntil(Promise.allSettled(backupTasks));
  }
}
