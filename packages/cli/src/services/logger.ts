import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { CommandLog } from '@foundry-x/shared';

const LOG_DIR = '.foundry-x/logs';

export class Logger {
  private readonly logDir: string;

  constructor(basePath: string = process.cwd()) {
    this.logDir = join(basePath, LOG_DIR);
  }

  async record(log: CommandLog): Promise<void> {
    await mkdir(this.logDir, { recursive: true });
    const date = log.timestamp.slice(0, 10); // YYYY-MM-DD
    const filePath = join(this.logDir, `${date}.jsonl`);
    await appendFile(filePath, JSON.stringify(log) + '\n', 'utf-8');
  }
}
