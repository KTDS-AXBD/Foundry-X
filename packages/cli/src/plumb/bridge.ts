import { spawn } from 'node:child_process';
import type { PlumbResult, SyncResult } from '@foundry-x/shared';
import {
  PlumbNotInstalledError,
  PlumbTimeoutError,
  PlumbExecutionError,
  PlumbOutputError,
} from './errors.js';
import type { PlumbBridgeConfig } from './types.js';

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_PYTHON = 'python3';

export class PlumbBridge {
  private readonly pythonPath: string;
  private readonly timeout: number;
  private readonly cwd: string;

  constructor(config: PlumbBridgeConfig = {}) {
    this.pythonPath =
      config.pythonPath ??
      process.env['FOUNDRY_X_PYTHON_PATH'] ??
      DEFAULT_PYTHON;
    this.timeout =
      config.timeout ??
      (process.env['FOUNDRY_X_PLUMB_TIMEOUT']
        ? Number(process.env['FOUNDRY_X_PLUMB_TIMEOUT'])
        : DEFAULT_TIMEOUT);
    this.cwd = config.cwd ?? process.cwd();
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.execute('--version');
      return true;
    } catch {
      return false;
    }
  }

  async execute(command: string, args: string[] = []): Promise<PlumbResult> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const spawnArgs = ['-m', 'plumb', command, ...args];
      const child = spawn(this.pythonPath, spawnArgs, {
        cwd: this.cwd,
        env: { ...process.env, PLUMB_OUTPUT_FORMAT: 'json' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new PlumbTimeoutError(this.timeout));
      }, this.timeout);

      child.on('error', (err: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        if (err.code === 'ENOENT') {
          reject(new PlumbNotInstalledError());
        } else {
          reject(new PlumbExecutionError(err.message));
        }
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const exitCode = code ?? 1;
        const duration = Date.now() - startTime;

        if (exitCode === 127) {
          reject(new PlumbNotInstalledError());
          return;
        }

        if (exitCode === 1) {
          reject(new PlumbExecutionError(stderr.trim()));
          return;
        }

        // exit code 0 (success) or 2 (partial with warnings)
        let data: unknown;
        try {
          data = JSON.parse(stdout);
        } catch {
          reject(new PlumbOutputError());
          return;
        }

        resolve({
          success: exitCode === 0,
          exitCode,
          stdout,
          stderr,
          duration,
          data,
        });
      });
    });
  }

  async review(): Promise<SyncResult> {
    const result = await this.execute('review');
    return result.data as SyncResult;
  }

  async getStatus(): Promise<SyncResult> {
    const result = await this.execute('status');
    return result.data as SyncResult;
  }
}
