import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
import { renderOutput } from '../ui/render.js';
import type { RepoMode } from '@foundry-x/shared';
import type { InitData } from '../ui/types.js';

interface InitOptions {
  mode?: string;
  template: string;
  force: boolean;
}

export interface InitStep {
  step: string;
  label: string;
  status: 'ok' | 'skip' | 'fail';
  detail: string;
}

export interface InitResult {
  steps: InitStep[];
  result: { created: string[]; merged: string[]; skipped: string[] };
  integrity: { score: number };
}

/** 비즈니스 로직: 하네스 초기화 파이프라인 실행 후 구조화된 결과 반환 */
export async function runInit(
  cwd: string,
  options: { mode?: string; template: string; force: boolean },
): Promise<InitResult> {
  const steps: InitStep[] = [];

  // 1. Git repo check
  const git = simpleGit(cwd);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) throw new NotGitRepoError();
  steps.push({ step: 'git-check', label: 'Git repository', status: 'ok', detail: 'valid git repo' });

  // 2. Already initialized check
  const configManager = new ConfigManager(cwd);
  if ((await configManager.exists()) && !options.force) {
    throw new FoundryXInitError();
  }

  // 3. Detect repo mode
  const mode = await detectRepoMode(cwd, options.mode as RepoMode | undefined);
  steps.push({ step: 'detect-mode', label: 'Detect mode', status: 'ok', detail: mode });

  // 4. Discover stack
  const profile = await discoverStack(cwd, mode);
  steps.push({
    step: 'discover-stack',
    label: 'Discover stack',
    status: 'ok',
    detail: `${profile.languages.join(', ')} / ${profile.frameworks.join(', ') || '(none)'}`,
  });

  // 5. Analyze architecture
  const enrichedProfile = await analyzeArchitecture(cwd, profile);
  steps.push({
    step: 'analyze-arch',
    label: 'Analyze architecture',
    status: 'ok',
    detail: enrichedProfile.architecturePattern,
  });

  // 6. Resolve template directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const templateDir = resolve(__dirname, '../../templates', options.template);
  try {
    await access(templateDir);
    steps.push({ step: 'resolve-template', label: 'Resolve template', status: 'ok', detail: options.template });
  } catch {
    throw new TemplateNotFoundError(options.template);
  }

  // 7. Generate harness
  const result = await generateHarness(cwd, enrichedProfile, templateDir, {
    force: options.force,
  });
  steps.push({
    step: 'generate-harness',
    label: 'Generate harness',
    status: 'ok',
    detail: `created=${result.created.length} merged=${result.merged.length} skipped=${result.skipped.length}`,
  });

  // 8. Verify harness
  const integrity = await verifyHarness(cwd);
  steps.push({
    step: 'verify-integrity',
    label: 'Verify integrity',
    status: integrity.passed ? 'ok' : 'fail',
    detail: `${integrity.score}/100`,
  });

  // 9. Save config
  await configManager.init(mode, enrichedProfile, options.template);
  steps.push({ step: 'save-config', label: 'Save config', status: 'ok', detail: '.foundry-x/config.json' });

  return {
    steps,
    result: { created: result.created, merged: result.merged, skipped: result.skipped },
    integrity: { score: integrity.score },
  };
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
        const initResult = await runInit(cwd, options);

        // Log
        const duration = Date.now() - startTime;
        await logger.record({
          command: 'init',
          timestamp: new Date().toISOString(),
          duration,
          success: true,
          args: { mode: options.mode, template: options.template, force: options.force },
          plumbCalled: false,
          harnessIntegrity: initResult.integrity.score,
        });

        // Map to InitData for renderOutput
        const viewData: InitData = {
          steps: initResult.steps.map((s) => ({
            step: s.step as InitData['steps'][number]['step'],
            label: s.label,
            status: s.status === 'ok' ? 'done' as const : s.status === 'fail' ? 'error' as const : 'done' as const,
            detail: s.detail,
          })),
          result: initResult.result,
          integrity: initResult.integrity,
        };

        // Output via renderOutput (TTY → Ink, non-TTY → plain text)
        await renderOutput('init', viewData, { json: false });
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
