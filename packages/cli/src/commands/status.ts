import { Command } from 'commander';
import { PlumbBridge } from '../plumb/bridge.js';
import { ConfigManager } from '../services/config-manager.js';
import { Logger } from '../services/logger.js';
import { HealthScoreCalculator } from '../services/health-score.js';
import { verifyHarness } from '../harness/verify.js';
import { checkHarnessFreshness } from '../services/harness-freshness.js';
import { FoundryXError, NotInitializedError } from '../plumb/errors.js';
import { renderOutput } from '../ui/render.js';
import type { HealthScore } from '@foundry-x/shared';
import type { StatusData } from '../ui/types.js';

interface StatusOptions {
  json: boolean;
  short: boolean;
  watch: boolean;
  interval: string;
}

/** 비즈니스 로직: 상태 정보 수집 후 구조화된 객체 반환 */
export async function runStatus(cwd: string): Promise<StatusData> {
  // 1. Check initialized
  const configManager = new ConfigManager(cwd);
  if (!(await configManager.exists())) {
    throw new NotInitializedError();
  }

  // 2. Read config
  const config = await configManager.read();
  if (!config) {
    throw new NotInitializedError();
  }

  // 3. PlumbBridge status (with fallback)
  const bridge = new PlumbBridge({
    cwd,
    timeout: config.plumb.timeout,
    pythonPath: config.plumb.pythonPath,
  });

  let healthScore: HealthScore | null = null;
  let plumbAvailable = false;

  try {
    if (await bridge.isAvailable()) {
      plumbAvailable = true;
      const syncResult = await bridge.getStatus();
      const calculator = new HealthScoreCalculator();
      healthScore = calculator.compute(syncResult);
    }
  } catch {
    // Plumb failed — continue without SDD data
  }

  // 4. Verify harness integrity
  const integrity = await verifyHarness(cwd);

  // 5. Check harness freshness
  let harnessFreshness;
  try {
    harnessFreshness = await checkHarnessFreshness(cwd);
  } catch {
    // Freshness check failed — continue without it
  }

  return {
    config: {
      mode: config.mode,
      template: config.template,
      initialized: config.initialized,
    },
    healthScore,
    integrity,
    plumbAvailable,
    harnessFreshness,
  };
}

export function statusCommand(): Command {
  const cmd = new Command('status');

  cmd
    .description('Show Triangle Health Score and harness integrity')
    .option('--json', 'output as JSON', false)
    .option('--short', 'show compact output', false)
    .option('--watch', 'watch mode', false)
    .option('--interval <ms>', 'debounce ms', '500')
    .action(async (options: StatusOptions) => {
      const startTime = Date.now();
      const cwd = process.cwd();
      const logger = new Logger(cwd);

      try {
        const result = await runStatus(cwd);

        // Log
        const duration = Date.now() - startTime;
        await logger.record({
          command: 'status',
          timestamp: new Date().toISOString(),
          duration,
          success: true,
          args: { json: options.json, short: options.short },
          plumbCalled: result.plumbAvailable,
          harnessIntegrity: result.integrity.score,
        });

        // Watch mode: render StatusWatchView with live fs.watch
        if (options.watch) {
          if (!process.stdout.isTTY) {
            console.error('Error: --watch requires a TTY terminal');
            process.exit(1);
          }
          const { render: inkRender } = await import('ink');
          const React = await import('react');
          const { StatusWatchView } = await import('../ui/views/StatusWatchView.js');
          const { waitUntilExit } = inkRender(
            React.createElement(StatusWatchView, {
              initialData: result,
              cwd,
              refreshFn: runStatus,
              interval: parseInt(options.interval, 10),
            }),
          );
          await waitUntilExit();
          return;
        }

        // Output via renderOutput (TTY → Ink, non-TTY → plain text)
        await renderOutput('status', result, { json: options.json, short: options.short });
      } catch (err) {
        const duration = Date.now() - startTime;
        if (err instanceof FoundryXError) {
          await logger.record({
            command: 'status',
            timestamp: new Date().toISOString(),
            duration,
            success: false,
            args: { json: options.json, short: options.short },
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
