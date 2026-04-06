import http from 'node:http';
import type { BuilderConfig, PrototypeJob } from './types.js';
import { pollForJobs, pollForFeedbackJobs, updatePrototypeStatus, startPollingLoop, type PolledJob } from './poller.js';
import { copyTemplate, runBuild, verifyBuildOutput } from './executor.js';
import { runOgdLoop } from './orchestrator.js';
import { transition, checkTimeout, canDeadLetter } from './state-machine.js';
import { deployToPages, toProjectName } from './deployer.js';
import { buildCompletionMessage, sendSlackNotification } from './notifier.js';
import { CostTracker } from './cost-tracker.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

function loadConfig(): BuilderConfig {
  return {
    apiBaseUrl: process.env['FOUNDRY_API_URL'] ?? 'http://localhost:8787',
    apiToken: process.env['BUILDER_API_TOKEN'] ?? '',
    anthropicApiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
    cloudflareApiToken: process.env['CLOUDFLARE_API_TOKEN'] ?? '',
    cloudflareAccountId: process.env['CLOUDFLARE_ACCOUNT_ID'] ?? '',
    pollIntervalMs: Number(process.env['POLL_INTERVAL_MS'] ?? 30_000),
    maxOgdRounds: Number(process.env['MAX_OGD_ROUNDS'] ?? 3),
    qualityThreshold: Number(process.env['QUALITY_THRESHOLD'] ?? 0.85),
    monthlyBudgetUsd: Number(process.env['MONTHLY_BUDGET_USD'] ?? 20),
    slackWebhookUrl: process.env['SLACK_WEBHOOK_URL'] ?? null,
  };
}

const TEMPLATE_DIR = path.resolve(import.meta.dirname, '../templates/react-spa');

async function processJob(
  proto: PolledJob,
  config: BuilderConfig,
  costTracker: CostTracker,
): Promise<void> {
  const workDir = path.join(os.tmpdir(), `proto-${proto.id}`);

  try {
    // 1. building 상태 전환
    const t = transition('queued', 'building');
    if (!t.success) return;
    await updatePrototypeStatus(proto.id, { status: 'building' }, config);

    // 2. 템플릿 복사
    await copyTemplate(TEMPLATE_DIR, workDir);

    // 3. O-G-D 루프 실행
    const job: PrototypeJob = {
      id: proto.id,
      projectId: proto.projectId,
      name: proto.name,
      prdContent: proto.prdContent,
      feedbackContent: proto.feedbackContent,
      workDir,
      round: 0,
    };

    const result = await runOgdLoop(job, {
      maxRounds: config.maxOgdRounds,
      qualityThreshold: config.qualityThreshold,
      costTracker,
    });

    // 4. 빌드
    const buildResult = await runBuild(workDir);
    if (!buildResult.success || !(await verifyBuildOutput(workDir))) {
      await updatePrototypeStatus(proto.id, {
        status: 'failed',
        errorMessage: `Build failed: ${buildResult.output.slice(0, 500)}`,
        buildLog: buildResult.output,
      }, config);
      return;
    }

    // 5. deploying 상태 전환
    await updatePrototypeStatus(proto.id, { status: 'deploying' }, config);

    // 6. Pages 배포
    const projectName = toProjectName(proto.name);
    const deploy = await deployToPages(workDir, projectName, config);

    // 7. live 상태 전환 + 결과 기록
    await updatePrototypeStatus(proto.id, {
      status: 'live',
      pagesProject: deploy.projectName,
      pagesUrl: deploy.url,
      costUsd: result.totalCost,
      buildLog: buildResult.output,
    }, config);

    // 8. Slack 알림
    const message = buildCompletionMessage({
      name: proto.name,
      status: 'live',
      deployUrl: deploy.url,
      qualityScore: result.score,
      rounds: result.rounds,
      cost: result.totalCost,
    });
    await sendSlackNotification(message, config);

  } catch (err) {
    await updatePrototypeStatus(proto.id, {
      status: 'failed',
      errorMessage: String(err),
    }, config).catch(() => {});
  } finally {
    // 작업 디렉토리 정리
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const costTracker = new CostTracker({ monthlyBudgetUsd: config.monthlyBudgetUsd });

  console.log('[Builder] Starting Prototype Builder Server');
  console.log(`[Builder] API: ${config.apiBaseUrl}`);
  console.log(`[Builder] Poll interval: ${config.pollIntervalMs}ms`);
  console.log(`[Builder] Budget: $${config.monthlyBudgetUsd}/month`);

  // Health check 엔드포인트
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        budget: {
          used: costTracker.getMonthlyTotal().toFixed(2),
          limit: config.monthlyBudgetUsd,
          usage: (costTracker.getBudgetUsage() * 100).toFixed(1) + '%',
        },
      }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(3001, () => {
    console.log('[Builder] Health check on :3001/health');
  });

  // 폴링 루프 시작
  const poller = startPollingLoop(async () => {
    if (costTracker.isOverBudget()) {
      console.warn('[Builder] Monthly budget exceeded — pausing');
      return;
    }

    const jobs = await pollForJobs(config);
    const feedbackJobs = await pollForFeedbackJobs(config);

    for (const job of [...jobs, ...feedbackJobs]) {
      console.log(`[Builder] Processing: ${job.name} (${job.id})`);
      await processJob(job, config, costTracker);
    }
  }, config.pollIntervalMs);

  // Graceful shutdown
  const shutdown = () => {
    console.log('[Builder] Shutting down...');
    poller.stop();
    server.close();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => {
  console.error('[Builder] Fatal:', err);
  process.exit(1);
});
