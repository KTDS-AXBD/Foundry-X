import Anthropic from '@anthropic-ai/sdk';
import type { PrototypeJob } from './types.js';
import { buildGeneratorPrompt } from './executor.js';

export type FallbackLevel = 'cli' | 'api' | 'ensemble';

export interface FallbackResult {
  level: FallbackLevel;
  output: string;
  success: boolean;
  error?: string;
}

/**
 * CLI 실패 시 Anthropic API를 직접 호출하여 코드 생성
 * 3단계 Fallback: CLI → API → 앙상블 (CLI+API 결합)
 */
export async function fallbackToApi(
  job: PrototypeJob,
  round: number,
  options: { apiKey?: string } = {},
): Promise<FallbackResult> {
  const apiKey = options.apiKey ?? process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    return {
      level: 'api',
      output: '',
      success: false,
      error: 'ANTHROPIC_API_KEY not set',
    };
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildGeneratorPrompt(job, round);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16384,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    return { level: 'api', output: text, success: true };
  } catch (err) {
    return {
      level: 'api',
      output: '',
      success: false,
      error: String(err),
    };
  }
}

/**
 * 3단계 Fallback 전략 실행
 * 1. CLI --bare → 성공하면 반환
 * 2. API 직접 호출 → 성공하면 반환
 * 3. 모두 실패 → error 반환
 */
export async function executeWithFallback(
  job: PrototypeJob,
  round: number,
  cliRunner: (job: PrototypeJob, round: number) => Promise<{ stdout: string; exitCode: number }>,
): Promise<FallbackResult> {
  // Level 1: CLI
  const cliResult = await cliRunner(job, round);
  if (cliResult.exitCode === 0) {
    return { level: 'cli', output: cliResult.stdout, success: true };
  }

  // Level 2: API
  const apiResult = await fallbackToApi(job, round);
  if (apiResult.success) {
    return apiResult;
  }

  // Level 3: 모두 실패
  return {
    level: 'ensemble',
    output: '',
    success: false,
    error: `CLI failed (exit ${cliResult.exitCode}), API failed: ${apiResult.error}`,
  };
}
