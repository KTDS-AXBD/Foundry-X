/**
 * F384: CLI --bare Rate Limit / 안정성 PoC
 *
 * Claude Max CLI subprocess 통합 검증:
 * 1. 기본 실행 테스트 (hello world)
 * 2. 코드 생성 실행 테스트 (React component)
 * 3. 반복 실행 rate limit 측정 (10회)
 * 4. 장시간 안정성 테스트 (연속 실행)
 */

import { execFile } from 'node:child_process';

function execFileAsync(
  cmd: string,
  args: string[],
  options: { timeout?: number; cwd?: string; env?: NodeJS.ProcessEnv },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, options, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

export interface CliPocResult {
  testName: string;
  success: boolean;
  durationMs: number;
  output: string;
  error?: string;
}

export interface CliPocReport {
  cliPath: string;
  cliVersion: string | null;
  tests: CliPocResult[];
  rateLimit: RateLimitResult | null;
  summary: CliPocSummary;
  timestamp: string;
}

export interface RateLimitResult {
  totalCalls: number;
  successCount: number;
  failCount: number;
  avgDurationMs: number;
  minIntervalMs: number;
  maxDurationMs: number;
  rateLimitHit: boolean;
  rateLimitAfterN: number | null;
}

export interface CliPocSummary {
  cliAvailable: boolean;
  codeGenWorks: boolean;
  rateLimitPerHour: number | null;
  avgResponseMs: number | null;
  recommendation: 'go' | 'conditional' | 'no-go';
  reason: string;
}

/**
 * CLI 존재 여부 확인
 */
export async function checkCliAvailability(
  cliPath: string,
): Promise<{ available: boolean; version: string | null }> {
  try {
    const { stdout } = await execFileAsync(cliPath, ['--version'], {
      timeout: 10_000,
    });
    return { available: true, version: stdout.trim() };
  } catch {
    return { available: false, version: null };
  }
}

/**
 * 단일 CLI --bare 호출 실행 + 결과 측정
 */
export async function runCliCall(
  cliPath: string,
  prompt: string,
  options: {
    maxTurns?: number;
    timeoutMs?: number;
    workDir?: string;
  } = {},
): Promise<CliPocResult> {
  const maxTurns = options.maxTurns ?? 1;
  const timeoutMs = options.timeoutMs ?? 60_000;
  const testName = prompt.slice(0, 50);

  const args = [
    '--bare',
    '-p', prompt,
    '--max-turns', String(maxTurns),
    '--output-format', 'json',
  ];

  const start = Date.now();
  try {
    const { stdout } = await execFileAsync(cliPath, args, {
      timeout: timeoutMs,
      cwd: options.workDir ?? process.cwd(),
      env: { ...process.env },
    });
    const durationMs = Date.now() - start;
    return {
      testName,
      success: true,
      durationMs,
      output: stdout.slice(0, 2000),
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    return {
      testName,
      success: false,
      durationMs,
      output: '',
      error: String(err).slice(0, 500),
    };
  }
}

/**
 * Rate limit 측정 — N회 연속 호출
 */
export async function measureRateLimit(
  cliPath: string,
  totalCalls: number = 10,
  delayBetweenMs: number = 1000,
): Promise<RateLimitResult> {
  const results: CliPocResult[] = [];
  let rateLimitHit = false;
  let rateLimitAfterN: number | null = null;

  for (let i = 0; i < totalCalls; i++) {
    const result = await runCliCall(cliPath, `Say "test ${i + 1}" and nothing else.`, {
      timeoutMs: 30_000,
    });
    results.push(result);

    if (!result.success && result.error?.includes('rate')) {
      rateLimitHit = true;
      rateLimitAfterN = i + 1;
      break;
    }

    // 호출 간 딜레이
    if (i < totalCalls - 1 && delayBetweenMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenMs));
    }
  }

  const successResults = results.filter(r => r.success);
  const durations = successResults.map(r => r.durationMs);

  return {
    totalCalls: results.length,
    successCount: successResults.length,
    failCount: results.length - successResults.length,
    avgDurationMs: durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0,
    minIntervalMs: durations.length > 1
      ? Math.min(...durations)
      : 0,
    maxDurationMs: durations.length > 0 ? Math.max(...durations) : 0,
    rateLimitHit,
    rateLimitAfterN,
  };
}

/**
 * 코드 생성 능력 테스트 — React 컴포넌트 생성 요청
 */
export async function testCodeGeneration(
  cliPath: string,
  workDir: string,
): Promise<CliPocResult> {
  const prompt = [
    'Create a simple React component in TypeScript.',
    'The component should be a counter with increment and decrement buttons.',
    'Output the code in a tsx code block with the filepath comment.',
    'Only output the code, no explanations.',
  ].join(' ');

  return runCliCall(cliPath, prompt, {
    maxTurns: 5,
    timeoutMs: 5 * 60 * 1000, // 5분
    workDir,
  });
}

/**
 * 전체 PoC 실행 + 리포트 생성
 */
export async function runCliPoc(
  cliPath: string = 'claude',
  options: {
    workDir?: string;
    rateLimitCalls?: number;
    skipLongTest?: boolean;
  } = {},
): Promise<CliPocReport> {
  const tests: CliPocResult[] = [];

  // 1. CLI 존재 확인
  const availability = await checkCliAvailability(cliPath);
  if (!availability.available) {
    return {
      cliPath,
      cliVersion: null,
      tests: [],
      rateLimit: null,
      summary: {
        cliAvailable: false,
        codeGenWorks: false,
        rateLimitPerHour: null,
        avgResponseMs: null,
        recommendation: 'no-go',
        reason: `CLI not found at '${cliPath}'`,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // 2. 기본 실행 테스트
  const helloTest = await runCliCall(cliPath, 'Say "hello" and nothing else.');
  tests.push({ ...helloTest, testName: 'basic-hello' });

  // 3. 코드 생성 테스트
  const codeGenTest = await testCodeGeneration(
    cliPath,
    options.workDir ?? process.cwd(),
  );
  tests.push({ ...codeGenTest, testName: 'code-generation' });

  // 4. Rate limit 측정
  const rateLimit = await measureRateLimit(
    cliPath,
    options.rateLimitCalls ?? 10,
  );

  // 5. 요약 생성
  const codeGenWorks = codeGenTest.success;
  const avgResponseMs = rateLimit.avgDurationMs || null;

  // Rate limit per hour 추정 (성공률 기반)
  const rateLimitPerHour = rateLimit.rateLimitHit
    ? rateLimit.rateLimitAfterN
      ? Math.floor((rateLimit.rateLimitAfterN / rateLimit.totalCalls) * 60)
      : null
    : rateLimit.successCount > 0
      ? Math.floor(3600_000 / (rateLimit.avgDurationMs + 1000)) // avg + 1초 간격 기준
      : null;

  let recommendation: 'go' | 'conditional' | 'no-go';
  let reason: string;

  if (!codeGenWorks) {
    recommendation = 'no-go';
    reason = 'Code generation failed — CLI cannot produce code in --bare mode';
  } else if (rateLimit.rateLimitHit && (rateLimit.rateLimitAfterN ?? 0) < 5) {
    recommendation = 'no-go';
    reason = `Rate limit hit after ${rateLimit.rateLimitAfterN} calls — too restrictive for O-G-D loop`;
  } else if (rateLimit.rateLimitHit) {
    recommendation = 'conditional';
    reason = `Rate limit hit after ${rateLimit.rateLimitAfterN} calls — may work with delays`;
  } else if ((rateLimitPerHour ?? 0) >= 10) {
    recommendation = 'go';
    reason = `CLI works, ~${rateLimitPerHour}/hr capacity, code generation verified`;
  } else {
    recommendation = 'conditional';
    reason = `CLI works but capacity uncertain (${rateLimitPerHour}/hr estimated)`;
  }

  return {
    cliPath,
    cliVersion: availability.version,
    tests,
    rateLimit,
    summary: {
      cliAvailable: true,
      codeGenWorks,
      rateLimitPerHour,
      avgResponseMs,
      recommendation,
      reason,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * PoC 리포트를 마크다운 문서로 변환
 */
export function formatPocReport(report: CliPocReport): string {
  const lines: string[] = [
    '# CLI `--bare` PoC 결과 (F384)',
    '',
    `> 측정 시각: ${report.timestamp}`,
    `> CLI 경로: \`${report.cliPath}\``,
    `> CLI 버전: ${report.cliVersion ?? 'N/A'}`,
    '',
    '---',
    '',
    '## 1. 요약',
    '',
    `| 항목 | 결과 |`,
    `|------|------|`,
    `| CLI 가용 | ${report.summary.cliAvailable ? 'Yes' : 'No'} |`,
    `| 코드 생성 | ${report.summary.codeGenWorks ? 'Yes' : 'No'} |`,
    `| 시간당 호출 가능 | ${report.summary.rateLimitPerHour ?? 'N/A'} |`,
    `| 평균 응답 시간 | ${report.summary.avgResponseMs ? `${report.summary.avgResponseMs}ms` : 'N/A'} |`,
    `| **판정** | **${report.summary.recommendation.toUpperCase()}** |`,
    `| 사유 | ${report.summary.reason} |`,
    '',
    '---',
    '',
    '## 2. 개별 테스트 결과',
    '',
    '| 테스트 | 성공 | 소요시간 | 비고 |',
    '|--------|:----:|---------|------|',
  ];

  for (const test of report.tests) {
    lines.push(
      `| ${test.testName} | ${test.success ? 'Pass' : 'Fail'} | ${test.durationMs}ms | ${test.error ?? test.output.slice(0, 100)} |`,
    );
  }

  if (report.rateLimit) {
    const rl = report.rateLimit;
    lines.push(
      '',
      '---',
      '',
      '## 3. Rate Limit 측정',
      '',
      `| 항목 | 값 |`,
      `|------|-----|`,
      `| 총 호출 | ${rl.totalCalls} |`,
      `| 성공 | ${rl.successCount} |`,
      `| 실패 | ${rl.failCount} |`,
      `| 평균 소요 시간 | ${rl.avgDurationMs}ms |`,
      `| 최대 소요 시간 | ${rl.maxDurationMs}ms |`,
      `| Rate Limit 히트 | ${rl.rateLimitHit ? `Yes (${rl.rateLimitAfterN}번째 이후)` : 'No'} |`,
    );
  }

  lines.push(
    '',
    '---',
    '',
    '## 4. PoC 통과 기준',
    '',
    '| 기준 | 목표 | 결과 | 판정 |',
    '|------|------|------|:----:|',
    `| CLI 코드 생성 | 동작 | ${report.summary.codeGenWorks ? 'Pass' : 'Fail'} | ${report.summary.codeGenWorks ? 'PASS' : 'FAIL'} |`,
    `| 시간당 호출 | 10회+ | ${report.summary.rateLimitPerHour ?? 'N/A'} | ${(report.summary.rateLimitPerHour ?? 0) >= 10 ? 'PASS' : 'FAIL'} |`,
    '',
    '---',
    '',
    '## 5. 다음 단계',
    '',
  );

  if (report.summary.recommendation === 'go') {
    lines.push('- M2(Sprint 177)에서 CLI primary / API fallback 듀얼 모드 구현 진행');
    lines.push('- `executor.ts` timeout을 5분으로 확장');
  } else if (report.summary.recommendation === 'conditional') {
    lines.push('- 호출 간 딜레이를 늘려 추가 테스트 필요');
    lines.push('- API primary + CLI secondary 대안 검토');
  } else {
    lines.push('- CLI 모드 제거, API only + haiku 비용 최적화로 전환');
    lines.push('- M2(F388) 스코프를 API 비용 최적화로 변경');
  }

  return lines.join('\n');
}
