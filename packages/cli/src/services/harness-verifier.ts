import { verifyHarness } from '../harness/verify.js';
import type { HarnessIntegrity } from '@foundry-x/shared';

export class HarnessVerifier {
  constructor(private readonly cwd: string) {}

  async verify(): Promise<HarnessIntegrity> {
    return verifyHarness(this.cwd);
  }

  async isHealthy(threshold: number = 60): Promise<boolean> {
    const result = await this.verify();
    return result.score >= threshold;
  }
}
