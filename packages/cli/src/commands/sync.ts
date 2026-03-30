import { Command } from 'commander';
import { PlumbBridge } from '../plumb/bridge.js';
import { ConfigManager } from '../services/config-manager.js';
import { Logger } from '../services/logger.js';
import { HealthScoreCalculator } from '../services/health-score.js';
import { FoundryXError, NotInitializedError } from '../plumb/errors.js';
import { renderOutput } from '../ui/render.js';
import type { ChangeEntry, SyncResult, HealthScore } from '@foundry-x/shared';
import { scanChanges } from '../harness/changes-scanner.js';

interface SyncOptions {
  json: boolean;
  verbose: boolean;
}

export interface SyncRunResult {
  triangle: SyncResult['triangle'];
  decisions: SyncResult['decisions'];
  healthScore: HealthScore;
  syncResult: SyncResult;
  /** F222: 변경 디렉토리 스캔 결과 */
  changes?: ChangeEntry[];
}

/** 비즈니스 로직: Plumb review 실행 후 결과 반환. Plumb 미설치 시 null 반환. */
export async function runSync(cwd: string): Promise<SyncRunResult | null> {
  // 1. Check initialized
  const configManager = new ConfigManager(cwd);
  if (!(await configManager.exists())) {
    throw new NotInitializedError();
  }

  // 2. Create PlumbBridge with config
  const config = await configManager.read();
  const bridge = new PlumbBridge({
    cwd,
    timeout: config?.plumb.timeout,
    pythonPath: config?.plumb.pythonPath,
  });

  // 3. Check Plumb availability
  if (!(await bridge.isAvailable())) {
    return null;
  }

  // 4. Run review
  const syncResult = await bridge.review();

  // 5. Scan changes directory (F222)
  const changes = await scanChanges(cwd);

  // 6. Compute health score (with changes awareness)
  const calculator = new HealthScoreCalculator();
  const healthScore = calculator.compute(syncResult, changes);

  return {
    triangle: syncResult.triangle,
    decisions: syncResult.decisions,
    healthScore,
    syncResult,
    changes,
  };
}

export function syncCommand(): Command {
  const cmd = new Command('sync');

  cmd
    .description('Run SDD Triangle sync via Plumb')
    .option('--json', 'output as JSON', false)
    .option('--verbose', 'show detailed output', false)
    .action(async (options: SyncOptions) => {
      const startTime = Date.now();
      const cwd = process.cwd();
      const logger = new Logger(cwd);

      try {
        const result = await runSync(cwd);

        // Plumb not available
        if (!result) {
          console.warn('Warning: Plumb is not installed.');
          console.warn('  Install: pip install plumb-dev');
          console.warn('  Sync requires Plumb to analyze the SDD Triangle.');
          return;
        }

        // Log
        const duration = Date.now() - startTime;
        await logger.record({
          command: 'sync',
          timestamp: new Date().toISOString(),
          duration,
          success: result.syncResult.success,
          args: { json: options.json, verbose: options.verbose },
          plumbCalled: true,
        });

        // Output via renderOutput (TTY → Ink, non-TTY → plain text)
        await renderOutput('sync', {
          triangle: result.triangle,
          decisions: result.decisions,
          healthScore: result.healthScore,
        }, { json: options.json, verbose: options.verbose });
      } catch (err) {
        const duration = Date.now() - startTime;
        if (err instanceof FoundryXError) {
          await logger.record({
            command: 'sync',
            timestamp: new Date().toISOString(),
            duration,
            success: false,
            args: { json: options.json, verbose: options.verbose },
            plumbCalled: false,
            error: err.message,
          }).catch(() => {});
          console.error(`Error: ${err.message}`);
          process.exit(err.exitCode);
        }
        throw err;
      }
    });

  return cmd;
}
