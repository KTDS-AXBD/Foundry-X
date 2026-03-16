import { resolve } from 'node:path';
import { access } from 'node:fs/promises';
import { Command } from 'commander';
import { simpleGit } from 'simple-git';
import { detectRepoMode } from '../harness/detect.js';
import { discoverStack } from '../harness/discover.js';
import { analyzeArchitecture } from '../harness/analyze.js';
import { generateHarness } from '../harness/generate.js';
import { verifyHarness } from '../harness/verify.js';
import { ConfigManager } from '../services/config-manager.js';
import { Logger } from '../services/logger.js';
import { FoundryXError, NotGitRepoError } from '../plumb/errors.js';
import type { RepoMode } from '@foundry-x/shared';

interface InitOptions {
  mode?: string;
  template: string;
  force: boolean;
}

export function initCommand(): Command {
  const cmd = new Command('init');

  cmd
    .description('Initialize Foundry-X harness in the current repository')
    .option('--mode <mode>', 'brownfield or greenfield (default: auto-detect)')
    .option('--template <name>', 'template name', 'default')
    .option('--force', 'reinitialize existing .foundry-x/', false)
    .action(async (options: InitOptions) => {
      const startTime = Date.now();
      const cwd = process.cwd();
      const logger = new Logger(cwd);

      try {
        // 1. Git repo check
        const git = simpleGit(cwd);
        const isRepo = await git.checkIsRepo();
        if (!isRepo) throw new NotGitRepoError();

        // 2. Already initialized check
        const configManager = new ConfigManager(cwd);
        if ((await configManager.exists()) && !options.force) {
          throw new FoundryXInitError();
        }

        // 3. Detect repo mode
        const mode = await detectRepoMode(cwd, options.mode as RepoMode | undefined);
        console.log(`  Mode: ${mode}`);

        // 4. Discover stack
        const profile = await discoverStack(cwd, mode);
        console.log(`  Languages: ${profile.languages.join(', ')}`);
        console.log(`  Frameworks: ${profile.frameworks.join(', ') || '(none)'}`);

        // 5. Analyze architecture
        const enrichedProfile = await analyzeArchitecture(cwd, profile);
        console.log(`  Architecture: ${enrichedProfile.architecturePattern}`);

        // 6. Resolve template directory
        const templateDir = resolve(__dirname, '../../templates', options.template);
        try {
          await access(templateDir);
        } catch {
          throw new TemplateNotFoundError(options.template);
        }

        // 7. Generate harness
        const result = await generateHarness(cwd, enrichedProfile, templateDir, {
          force: options.force,
        });

        // 8. Verify harness
        const integrity = await verifyHarness(cwd);

        // 9. Save config
        await configManager.init(mode, enrichedProfile, options.template);

        // 10. Log
        const duration = Date.now() - startTime;
        await logger.record({
          command: 'init',
          timestamp: new Date().toISOString(),
          duration,
          success: true,
          args: { mode: options.mode, template: options.template, force: options.force },
          plumbCalled: false,
          harnessIntegrity: integrity.score,
        });

        // 11. Output results
        console.log('\nFoundry-X initialized successfully!\n');
        if (result.created.length > 0) {
          console.log('  Created:');
          result.created.forEach((f) => console.log(`    + ${f}`));
        }
        if (result.merged.length > 0) {
          console.log('  Merged:');
          result.merged.forEach((f) => console.log(`    ~ ${f}`));
        }
        if (result.skipped.length > 0) {
          console.log('  Skipped:');
          result.skipped.forEach((f) => console.log(`    - ${f}`));
        }
        console.log(`\n  Harness Integrity: ${integrity.score}/100`);
      } catch (err) {
        const duration = Date.now() - startTime;
        if (err instanceof FoundryXError) {
          await logger.record({
            command: 'init',
            timestamp: new Date().toISOString(),
            duration,
            success: false,
            args: { mode: options.mode, template: options.template, force: options.force },
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

// ── Local error classes ──

class FoundryXInitError extends FoundryXError {
  readonly code = 'ALREADY_INITIALIZED' as const;
  readonly exitCode = 1;

  constructor() {
    super("Foundry-X is already initialized. Use '--force' to reinitialize.");
  }
}

class TemplateNotFoundError extends FoundryXError {
  readonly code = 'TEMPLATE_NOT_FOUND' as const;
  readonly exitCode = 1;

  constructor(name: string) {
    super(`Template not found: ${name}`);
  }
}
