import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { PrototypeJob } from './types.js';

const execFileAsync = promisify(execFile);

/**
 * Generator 프롬프트 생성 — PRD + 체크리스트 + 이전 피드백 결합
 */
export function buildGeneratorPrompt(job: PrototypeJob, round: number): string {
  const parts = [
    '# Prototype Generator',
    '',
    '아래 PRD를 기반으로 인터랙티브 React SPA Prototype을 생성하세요.',
    'src/ 디렉토리에 컴포넌트를 작성하고, App.tsx에서 조합하세요.',
    'TailwindCSS + shadcn/ui를 사용하세요.',
    '',
    '## PRD',
    job.prdContent,
  ];

  if (job.feedbackContent) {
    parts.push('', '## 이전 피드백 (반드시 반영)', job.feedbackContent);
  }

  if (round > 0) {
    parts.push('', `## Round ${round + 1}`, '이전 라운드의 피드백을 반영하여 품질을 개선하세요.');
  }

  return parts.join('\n');
}

/**
 * CLI --bare 실행 인자 생성
 */
export function buildCliArgs(job: PrototypeJob, round: number): string[] {
  return [
    '--bare',
    '-p', buildGeneratorPrompt(job, round),
    '--allowedTools', 'Bash,Read,Edit,Write',
    '--model', round < 2 ? 'haiku' : 'sonnet',
    '--max-turns', '15',
    '--output-format', 'json',
  ];
}

/**
 * 템플릿을 작업 디렉토리에 복사
 */
export async function copyTemplate(
  templateDir: string,
  workDir: string,
): Promise<void> {
  await fs.cp(templateDir, workDir, { recursive: true });
}

/**
 * Claude Code CLI --bare 모드로 코드 생성 실행
 */
export async function runCliGenerator(
  job: PrototypeJob,
  round: number,
  options: { cliPath?: string; timeoutMs?: number } = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const cliPath = options.cliPath ?? 'claude';
  const timeoutMs = options.timeoutMs ?? 30 * 1000; // 30초 (Docker에서 CLI hang 방지)

  const args = buildCliArgs(job, round);

  try {
    const { stdout, stderr } = await execFileAsync(cliPath, args, {
      cwd: job.workDir,
      timeout: timeoutMs,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'],
      },
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? String(err),
      exitCode: error.code ?? 1,
    };
  }
}

/**
 * 작업 디렉토리에서 vite build 실행
 */
export async function runBuild(
  workDir: string,
  options: { timeoutMs?: number } = {},
): Promise<{ success: boolean; output: string }> {
  const timeoutMs = options.timeoutMs ?? 2 * 60 * 1000; // 2분

  try {
    const { stdout, stderr } = await execFileAsync(
      'npx',
      ['vite', 'build'],
      { cwd: workDir, timeout: timeoutMs },
    );
    return { success: true, output: stdout + stderr };
  } catch (err) {
    return {
      success: false,
      output: String(err),
    };
  }
}

/**
 * 빌드 산출물 디렉토리 존재 확인
 */
export async function verifyBuildOutput(workDir: string): Promise<boolean> {
  const distDir = path.join(workDir, 'dist');
  try {
    const stat = await fs.stat(distDir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
