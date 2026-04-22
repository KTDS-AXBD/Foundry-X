import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { FoundryXConfig, RepoProfile, RepoMode } from '@foundry-x/shared';

const FOUNDRY_X_DIR = '.foundry-x';
const CONFIG_FILE = 'config.json';

const DEFAULT_PLUMB_TIMEOUT = 30_000;
const DEFAULT_PYTHON_PATH = 'python3';
const DEFAULT_API_URL = 'https://fx-gateway.ktds-axbd.workers.dev';

export class ConfigManager {
  private readonly dirPath: string;
  private readonly filePath: string;

  constructor(private readonly basePath: string = process.cwd()) {
    this.dirPath = join(this.basePath, FOUNDRY_X_DIR);
    this.filePath = join(this.dirPath, CONFIG_FILE);
  }

  async exists(): Promise<boolean> {
    try {
      await access(this.dirPath);
      return true;
    } catch {
      return false;
    }
  }

  async read(): Promise<FoundryXConfig | null> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      return JSON.parse(raw) as FoundryXConfig;
    } catch {
      return null;
    }
  }

  async write(config: FoundryXConfig): Promise<void> {
    await mkdir(this.dirPath, { recursive: true });
    await writeFile(this.filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  }

  async init(
    mode: RepoMode,
    repoProfile: RepoProfile,
    template: string,
  ): Promise<FoundryXConfig> {
    const config: FoundryXConfig = {
      version: '0.1.0',
      initialized: new Date().toISOString(),
      template,
      mode,
      repoProfile,
      apiUrl: DEFAULT_API_URL,
      plumb: {
        timeout: DEFAULT_PLUMB_TIMEOUT,
        pythonPath: DEFAULT_PYTHON_PATH,
      },
      git: {
        provider: 'github',
      },
    };
    await this.write(config);
    return config;
  }
}
