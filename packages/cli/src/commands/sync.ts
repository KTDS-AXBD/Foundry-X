import { Command } from 'commander';
import { PlumbBridge } from '../plumb/bridge.js';
import { ConfigManager } from '../services/config-manager.js';
import { Logger } from '../services/logger.js';
import { HealthScoreCalculator } from '../services/health-score.js';
import { FoundryXError, NotInitializedError } from '../plumb/errors.js';

interface SyncOptions {
  json: boolean;
  verbose: boolean;
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
          console.warn('Warning: Plumb is not installed.');
          console.warn('  Install: pip install plumb-dev');
          console.warn('  Sync requires Plumb to analyze the SDD Triangle.');
          return;
        }

        // 4. Run review
        const syncResult = await bridge.review();

        // 5. Compute health score
        const calculator = new HealthScoreCalculator();
        const healthScore = calculator.compute(syncResult);

        // 6. Log
        const duration = Date.now() - startTime;
        await logger.record({
          command: 'sync',
          timestamp: new Date().toISOString(),
          duration,
          success: syncResult.success,
          args: { json: options.json, verbose: options.verbose },
          plumbCalled: true,
        });

        // 7. Output
        if (options.json) {
          console.log(JSON.stringify({ syncResult, healthScore }, null, 2));
          return;
        }

        console.log('SDD Triangle Sync\n');

        const { triangle } = syncResult;
        console.log(`  Spec → Code: ${triangle.specToCode.matched}/${triangle.specToCode.total}`);
        console.log(`  Code → Test: ${triangle.codeToTest.matched}/${triangle.codeToTest.total}`);
        console.log(`  Spec → Test: ${triangle.specToTest.matched}/${triangle.specToTest.total}`);

        const allGaps = [
          ...triangle.specToCode.gaps,
          ...triangle.codeToTest.gaps,
          ...triangle.specToTest.gaps,
        ];
        if (allGaps.length > 0) {
          console.log(`\n  Gaps (${allGaps.length}):`);
          allGaps.forEach((gap) => {
            console.log(`    [${gap.type}] ${gap.path}: ${gap.description}`);
          });
        }

        if (syncResult.decisions.length > 0) {
          console.log(`\n  Decisions (${syncResult.decisions.length}):`);
          syncResult.decisions.forEach((d) => {
            console.log(`    [${d.status}] ${d.summary} (${d.source})`);
          });
        }

        console.log(`\n  Health Score: ${healthScore.overall.toFixed(1)} (${healthScore.grade})`);
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
