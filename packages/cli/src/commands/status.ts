import { Command } from 'commander';
import { PlumbBridge } from '../plumb/bridge.js';
import { ConfigManager } from '../services/config-manager.js';
import { Logger } from '../services/logger.js';
import { HealthScoreCalculator } from '../services/health-score.js';
import { verifyHarness } from '../harness/verify.js';
import { FoundryXError, NotInitializedError } from '../plumb/errors.js';
import type { SyncResult, HealthScore } from '@foundry-x/shared';

interface StatusOptions {
  json: boolean;
  short: boolean;
}

export function statusCommand(): Command {
  const cmd = new Command('status');

  cmd
    .description('Show Triangle Health Score and harness integrity')
    .option('--json', 'output as JSON', false)
    .option('--short', 'show compact output', false)
    .action(async (options: StatusOptions) => {
      const startTime = Date.now();
      const cwd = process.cwd();
      const logger = new Logger(cwd);

      try {
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

        let syncResult: SyncResult | null = null;
        let healthScore: HealthScore | null = null;
        let plumbAvailable = false;

        try {
          if (await bridge.isAvailable()) {
            plumbAvailable = true;
            syncResult = await bridge.getStatus();
            const calculator = new HealthScoreCalculator();
            healthScore = calculator.compute(syncResult);
          }
        } catch {
          // Plumb failed — continue without SDD data
        }

        // 4. Verify harness integrity
        const integrity = await verifyHarness(cwd);

        // 5. Log
        const duration = Date.now() - startTime;
        await logger.record({
          command: 'status',
          timestamp: new Date().toISOString(),
          duration,
          success: true,
          args: { json: options.json, short: options.short },
          plumbCalled: plumbAvailable,
          harnessIntegrity: integrity.score,
        });

        // 6. Output
        if (options.json) {
          console.log(JSON.stringify({
            config: {
              mode: config.mode,
              template: config.template,
              initialized: config.initialized,
            },
            healthScore,
            integrity,
            plumbAvailable,
          }, null, 2));
          return;
        }

        if (options.short) {
          const hs = healthScore ? `${healthScore.overall.toFixed(0)}(${healthScore.grade})` : 'N/A';
          console.log(`[${config.mode}] health=${hs} integrity=${integrity.score}/100`);
          return;
        }

        // Full output
        console.log('Foundry-X Status\n');
        console.log('  Project');
        console.log(`    Mode:      ${config.mode}`);
        console.log(`    Template:  ${config.template}`);
        console.log(`    Init:      ${config.initialized}`);

        if (healthScore) {
          console.log('\n  Health Score');
          console.log(`    Overall:     ${healthScore.overall.toFixed(1)} (${healthScore.grade})`);
          console.log(`    Spec→Code:   ${healthScore.specToCode.toFixed(1)}`);
          console.log(`    Code→Test:   ${healthScore.codeToTest.toFixed(1)}`);
          console.log(`    Spec→Test:   ${healthScore.specToTest.toFixed(1)}`);
        } else {
          console.log('\n  Health Score: unavailable (Plumb not installed)');
        }

        console.log('\n  Harness Integrity');
        console.log(`    Score: ${integrity.score}/100 (${integrity.passed ? 'PASS' : 'FAIL'})`);
        integrity.checks.forEach((c) => {
          const icon = c.level === 'PASS' ? '+' : c.level === 'WARN' ? '!' : 'x';
          console.log(`    [${icon}] ${c.name}: ${c.message}`);
        });
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
