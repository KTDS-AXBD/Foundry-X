// F526: autopilot Verify E2E 통합
// Design 문서 → E2E 생성 → Playwright 실행 → Composite Score 산출 파이프라인

import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { parseDesignDocument, generateE2ESpec } from './e2e-extractor.js';
import { computeCompositeScore, type E2EResult, type CompositeScore } from './gap-scorer.js';

export interface VerifyInput {
  sprintNum: number;
  gapRate: number;
  projectRoot: string;
}

export interface VerifyResult {
  sprintNum: number;
  designDocPath: string;
  generatedSpecPath: string;
  scenarioCount: number;
  e2eResult: E2EResult | null;
  gapRate: number;
  compositeScore: CompositeScore;
  error?: string;
}

function resolveDesignDocPath(projectRoot: string, sprintNum: number): string {
  return path.join(projectRoot, 'docs', '02-design', 'features', `sprint-${sprintNum}.design.md`);
}

function parsePlaywrightJson(stdout: Buffer | null): E2EResult | null {
  if (!stdout) return null;
  const raw = stdout.toString('utf8').trim();
  if (!raw) return null;

  try {
    const json = JSON.parse(raw) as {
      stats?: { expected?: number; unexpected?: number; skipped?: number };
    };
    const stats = json.stats ?? {};
    const pass = stats.expected ?? 0;
    const fail = stats.unexpected ?? 0;
    const skip = stats.skipped ?? 0;
    return { specFile: '', total: pass + fail + skip, pass, fail, skip };
  } catch {
    return null;
  }
}

function runPlaywright(specFilePath: string, webPackageDir: string): E2EResult | null {
  const relativeSpec = path.relative(webPackageDir, specFilePath);
  const result = cp.spawnSync(
    'npx',
    ['playwright', 'test', relativeSpec, '--reporter=json'],
    {
      cwd: webPackageDir,
      encoding: 'buffer',
      timeout: 120_000,
    }
  );

  // status=null은 시그널로 종료된 경우 (playwright 미설치 등)
  // stdout이 없거나 비어있으면 E2E 실행 불가로 처리
  if (result.status === null && (!result.stdout || result.stdout.length === 0)) return null;

  return parsePlaywrightJson(result.stdout);
}

export async function runE2EVerify(input: VerifyInput): Promise<VerifyResult> {
  const { sprintNum, gapRate, projectRoot } = input;
  const designDocPath = resolveDesignDocPath(projectRoot, sprintNum);

  const failResult = (error: string): VerifyResult => ({
    sprintNum,
    designDocPath,
    generatedSpecPath: '',
    scenarioCount: 0,
    e2eResult: null,
    gapRate,
    compositeScore: {
      gapRate,
      e2ePassRate: null,
      compositeRate: 0,
      formula: `Error: ${error}`,
      status: 'FAIL',
    },
    error,
  });

  // 1. Design 문서 존재 확인
  if (!fs.existsSync(designDocPath)) {
    return failResult(`Design doc not found: ${designDocPath}`);
  }

  // 2. Design 문서 파싱 → E2E 시나리오 추출
  const docContent = fs.readFileSync(designDocPath, 'utf8');
  const { scenarios } = parseDesignDocument(docContent);
  const { filePath: relativeSpecPath, scenarioCount, content } = generateE2ESpec(scenarios, sprintNum);

  // 3. spec 파일 작성
  const generatedSpecPath = path.join(projectRoot, relativeSpecPath);
  const specDir = path.dirname(generatedSpecPath);
  fs.mkdirSync(specDir, { recursive: true });
  fs.writeFileSync(generatedSpecPath, content, 'utf8');

  // 4. Playwright 실행
  const webPackageDir = path.join(projectRoot, 'packages', 'web');
  const e2eResult = runPlaywright(generatedSpecPath, webPackageDir);

  // 5. Composite Score 계산
  const compositeScore = computeCompositeScore({
    gapRate,
    e2eResults: e2eResult ? [{ ...e2eResult, specFile: relativeSpecPath }] : [],
  });

  return {
    sprintNum,
    designDocPath,
    generatedSpecPath,
    scenarioCount,
    e2eResult,
    gapRate,
    compositeScore,
  };
}
