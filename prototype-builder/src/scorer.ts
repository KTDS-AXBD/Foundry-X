/**
 * F385: 5차원 품질 스코어러 PoC
 *
 * 평가 차원 (Design §3.1):
 * 1. build  (20%) — vite build 성공 + warning 감점
 * 2. ui     (25%) — DOM 구조 분석 (태그 다양성 + 시맨틱 + 접근성)
 * 3. functional (20%) — 정적 분석 (핸들러 + 상태관리 + 라우팅)
 * 4. prd    (25%) — LLM 비교 (PRD Must Have vs 구현 코드)
 * 5. code   (10%) — ESLint + TypeScript 에러 수
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import type {
  PrototypeJob,
  QualityScore,
  DimensionScore,
  ScoreDimension,
  TargetFeedback,
  LlmDimensionResult,
  LlmIntegratedEvaluation,
} from './types.js';
import { DIMENSION_WEIGHTS } from './types.js';

const execFileAsync = promisify(execFile);

// ─────────────────────────────────────────────
// 차원별 평가 함수
// ─────────────────────────────────────────────

/**
 * buildScore (20%) — vite build 성공 여부 + warning 감점
 */
export async function buildScore(workDir: string): Promise<DimensionScore> {
  const weight = DIMENSION_WEIGHTS.build;
  try {
    const { stdout, stderr } = await execFileAsync(
      'npx', ['vite', 'build'],
      { cwd: workDir, timeout: 2 * 60 * 1000 },
    );
    const output = stdout + stderr;
    // warning 수 카운트
    const warnings = (output.match(/warning/gi) ?? []).length;
    // 5개당 -0.1, 최소 0.5
    const deduction = Math.min(warnings * 0.02, 0.5);
    const score = Math.max(1.0 - deduction, 0.5);

    return {
      dimension: 'build',
      score,
      weight,
      weighted: score * weight,
      details: `Build success, ${warnings} warnings`,
    };
  } catch (err) {
    return {
      dimension: 'build',
      score: 0,
      weight,
      weighted: 0,
      details: `Build failed: ${String(err).slice(0, 200)}`,
    };
  }
}

/**
 * uiScore (25%) — DOM 구조 분석
 * dist/index.html 파싱 (정규식 기반, cheerio 의존성 없이)
 */
export async function uiScore(workDir: string): Promise<DimensionScore> {
  const weight = DIMENSION_WEIGHTS.ui;

  try {
    // 빌드된 HTML 읽기 (dist/ 또는 index.html)
    let html: string;
    const distIndex = path.join(workDir, 'dist', 'index.html');
    const srcIndex = path.join(workDir, 'index.html');

    try {
      html = await fs.readFile(distIndex, 'utf-8');
    } catch {
      try {
        html = await fs.readFile(srcIndex, 'utf-8');
      } catch {
        return {
          dimension: 'ui',
          score: 0,
          weight,
          weighted: 0,
          details: 'No index.html found in dist/ or root',
        };
      }
    }

    // src/ 파일도 분석 (JSX 구조 포함)
    const srcFiles = await collectSourceFiles(workDir);
    const allContent = html + '\n' + srcFiles.join('\n');

    // a. 컴포넌트 다양성: 고유 태그/클래스 수
    const tags = new Set(allContent.match(/<([a-z][a-z0-9]*)/gi)?.map(t => t.slice(1).toLowerCase()) ?? []);
    const tagDiversity = Math.min(tags.size / 15, 1.0); // 15종+ → 1.0

    // b. Tailwind/CSS 활용도
    const classNames = allContent.match(/className=["'][^"']*["']/g) ?? [];
    const tailwindClasses = classNames.filter(c => /\b(flex|grid|p-|m-|text-|bg-|w-|h-|rounded|shadow|border)\b/.test(c));
    const tailwindRatio = classNames.length > 0
      ? tailwindClasses.length / classNames.length
      : 0;

    // c. 시맨틱 구조
    const semanticTags = ['header', 'nav', 'main', 'section', 'footer', 'article', 'aside'];
    const semanticCount = semanticTags.filter(tag =>
      new RegExp(`<${tag}[\\s>]`, 'i').test(allContent),
    ).length;
    const semanticScore = Math.min(semanticCount / 4, 1.0); // 4개+ → 1.0

    // d. 접근성
    const a11yPatterns = ['alt=', 'aria-label', 'aria-', 'role='];
    const a11yCount = a11yPatterns.filter(p => allContent.includes(p)).length;
    const a11yScore = Math.min(a11yCount / 3, 1.0); // 3개+ → 1.0

    // 4항목 균등 평균
    const score = (tagDiversity + tailwindRatio + semanticScore + a11yScore) / 4;

    return {
      dimension: 'ui',
      score: Math.round(score * 100) / 100,
      weight,
      weighted: Math.round(score * weight * 100) / 100,
      details: `Tags: ${tags.size}, Tailwind: ${Math.round(tailwindRatio * 100)}%, Semantic: ${semanticCount}/${semanticTags.length}, A11y: ${a11yCount}/${a11yPatterns.length}`,
    };
  } catch (err) {
    return {
      dimension: 'ui',
      score: 0,
      weight,
      weighted: 0,
      details: `UI analysis error: ${String(err).slice(0, 200)}`,
    };
  }
}

/**
 * functionalScore (20%) — 정적 분석
 * 핸들러 수, 상태관리, 라우팅 등
 */
export async function functionalScore(workDir: string): Promise<DimensionScore> {
  const weight = DIMENSION_WEIGHTS.functional;

  try {
    const srcFiles = await collectSourceFiles(workDir);
    const allCode = srcFiles.join('\n');

    // a. onClick/onChange 핸들러 수
    const handlers = (allCode.match(/on(?:Click|Change|Submit|Focus|Blur|KeyDown|KeyUp|MouseEnter|MouseLeave)\s*[={]/g) ?? []).length;

    // b. useState/useEffect/useCallback 사용 수
    const hooks = (allCode.match(/use(?:State|Effect|Callback|Memo|Ref|Context)\s*[(<]/g) ?? []).length;

    // c. 라우트 수 (react-router)
    const routes = (allCode.match(/<(?:Route|Link|NavLink|Navigate)\s/g) ?? []).length;

    // d. 에러 핸들링 (try-catch, ErrorBoundary)
    const errorHandling = (allCode.match(/(?:try\s*\{|ErrorBoundary|catch\s*\()/g) ?? []).length;

    // 기준: 핸들러 0 → 0.2, 1~3 → 0.5, 4~7 → 0.7, 8+ → 0.9
    let handlerScore: number;
    if (handlers === 0) handlerScore = 0.2;
    else if (handlers <= 3) handlerScore = 0.5;
    else if (handlers <= 7) handlerScore = 0.7;
    else handlerScore = 0.9;

    // 보너스: hooks + routing + error handling
    const hookBonus = hooks > 0 ? 0.05 : 0;
    const routeBonus = routes > 0 ? 0.05 : 0;
    const errorBonus = errorHandling > 0 ? 0.03 : 0;

    const score = Math.min(handlerScore + hookBonus + routeBonus + errorBonus, 1.0);

    return {
      dimension: 'functional',
      score: Math.round(score * 100) / 100,
      weight,
      weighted: Math.round(score * weight * 100) / 100,
      details: `Handlers: ${handlers}, Hooks: ${hooks}, Routes: ${routes}, ErrorHandling: ${errorHandling}`,
    };
  } catch (err) {
    return {
      dimension: 'functional',
      score: 0,
      weight,
      weighted: 0,
      details: `Functional analysis error: ${String(err).slice(0, 200)}`,
    };
  }
}

/**
 * prdScore (25%) — LLM 비교
 * PRD Must Have vs 생성 코드 매칭 (temperature 0, 구조화 JSON)
 *
 * PoC 모드: LLM 없이 키워드 매칭 기반 간이 평가
 * 본구현(M1): Claude Sonnet API 호출
 */
export async function prdScore(
  job: PrototypeJob,
  workDir: string,
  options: { useLlm?: boolean } = {},
): Promise<DimensionScore> {
  const weight = DIMENSION_WEIGHTS.prd;

  try {
    const srcFiles = await collectSourceFiles(workDir);
    const allCode = srcFiles.join('\n').toLowerCase();
    const prd = job.prdContent.toLowerCase();

    if (options.useLlm) {
      // M1 본구현: LLM 호출 (여기서는 placeholder)
      return await prdScoreWithLlm(job, allCode, weight);
    }

    // PoC 모드: 키워드 기반 간이 매칭
    return prdScoreKeyword(prd, allCode, weight);
  } catch (err) {
    return {
      dimension: 'prd',
      score: 0,
      weight,
      weighted: 0,
      details: `PRD analysis error: ${String(err).slice(0, 200)}`,
    };
  }
}

/**
 * PRD 키워드 기반 간이 매칭 (PoC용)
 */
function prdScoreKeyword(
  prd: string,
  code: string,
  weight: number,
): DimensionScore {
  // PRD에서 기능 키워드 추출 (한글/영문)
  const featurePatterns = [
    // 동사+명사 패턴
    /(?:구현|생성|표시|제공|추가|관리|검색|필터|정렬|업로드|다운로드|로그인|회원가입|대시보드|차트|테이블|폼|모달|알림|설정)\w*/g,
    // 영문 기능 키워드
    /(?:dashboard|chart|table|form|modal|login|signup|search|filter|sort|upload|download|notification|settings|profile|list|detail|create|edit|delete)\w*/gi,
  ];

  const prdKeywords = new Set<string>();
  for (const pattern of featurePatterns) {
    const matches = prd.match(pattern) ?? [];
    for (const m of matches) prdKeywords.add(m);
  }

  if (prdKeywords.size === 0) {
    return {
      dimension: 'prd',
      score: 0.5,
      weight,
      weighted: 0.5 * weight,
      details: 'No feature keywords extracted from PRD (default 0.5)',
    };
  }

  // 코드에서 매칭되는 키워드 수
  let matched = 0;
  const missing: string[] = [];
  for (const keyword of prdKeywords) {
    if (code.includes(keyword)) {
      matched++;
    } else {
      missing.push(keyword);
    }
  }

  const score = prdKeywords.size > 0 ? matched / prdKeywords.size : 0;

  return {
    dimension: 'prd',
    score: Math.round(score * 100) / 100,
    weight,
    weighted: Math.round(score * weight * 100) / 100,
    details: `Matched ${matched}/${prdKeywords.size} keywords. Missing: ${missing.slice(0, 5).join(', ')}`,
  };
}

/**
 * PRD → 생성코드 LLM 비교 응답 타입 (F425 개선)
 */
interface PrdRequirement {
  id: number;
  text: string;
  implemented: boolean;
  evidence: string | null;
  fix?: string;
}

interface PrdLlmResponse {
  requirements: PrdRequirement[];
  summary: { implemented: number; total: number; score: number };
}

/**
 * PRD LLM 의미론적 비교 (F425 본구현)
 * - PRD에서 Must Have 요구사항을 구조화된 목록으로 추출
 * - 각 요구사항의 코드 내 구현 여부를 의미적으로 판단
 * - 미구현 항목에 구체적 수정 지시 포함
 */
async function prdScoreWithLlm(
  job: PrototypeJob,
  code: string,
  weight: number,
): Promise<DimensionScore> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    return prdScoreKeyword(job.prdContent.toLowerCase(), code, weight);
  }

  const client = new Anthropic({ apiKey });

  const prompt = [
    '당신은 PRD 요구사항과 생성된 프로토타입 코드를 비교하는 전문가입니다.',
    '',
    '## PRD 문서',
    job.prdContent.slice(0, 6000),
    '',
    '## 생성된 코드',
    code.slice(0, 10000),
    '',
    '## 지시사항',
    '1. PRD에서 Must Have / 핵심 기능 항목을 추출하세요 (최대 15개)',
    '2. 각 요구사항이 코드에 의미적으로 구현되었는지 판단하세요',
    '   - 단순 키워드 존재가 아니라 실제 기능 구현 여부를 확인하세요',
    '3. 미구현 항목에는 구체적인 수정 지시를 작성하세요',
    '4. 아래 JSON 형식으로만 응답하세요 (마크다운 블록 없이 순수 JSON):',
    '',
    JSON.stringify({
      requirements: [
        { id: 1, text: '사용자 로그인 기능', implemented: true, evidence: 'LoginForm 컴포넌트 존재', fix: null },
        { id: 2, text: '대시보드 차트 표시', implemented: false, evidence: null, fix: 'Chart.tsx 컴포넌트 추가 필요' },
      ],
      summary: { implemented: 1, total: 2, score: 0.5 },
    }),
  ].join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();

    const jsonStr = text.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
    const parsed = JSON.parse(jsonStr) as PrdLlmResponse;

    const { implemented, total } = parsed.summary;
    const score = Math.min(implemented / Math.max(total, 1), 1.0);

    const missing = parsed.requirements
      .filter(r => !r.implemented)
      .slice(0, 5)
      .map(r => r.text);

    return {
      dimension: 'prd',
      score: Math.round(score * 100) / 100,
      weight,
      weighted: Math.round(score * weight * 100) / 100,
      details: `LLM: ${implemented}/${total} implemented. Missing: ${missing.join(', ') || 'none'}`,
    };
  } catch (err) {
    console.log(`[Scorer] prdScore LLM failed, falling back to keyword: ${String(err).slice(0, 100)}`);
    return prdScoreKeyword(job.prdContent.toLowerCase(), code, weight);
  }
}

// ─────────────────────────────────────────────
// F426: 5차원 LLM 통합 판별
// ─────────────────────────────────────────────

/**
 * LLM 통합 판별 응답 타입 (F426)
 */
interface LlmIntegratedResponse {
  build: { score: number; rationale: string; fix: string | null };
  ui: { score: number; rationale: string; fix: string | null };
  functional: { score: number; rationale: string; fix: string | null };
  prd: { score: number; rationale: string; fix: string | null };
  code: { score: number; rationale: string; fix: string | null };
}

/**
 * 5차원 LLM 통합 판별 (F426)
 * - 정적 분석 결과를 컨텍스트로 단일 LLM 호출
 * - LLM이 5차원 전체를 재평가하고 구체적 개선 지시 반환
 * - 최종 점수 = LLM 판정 (정적 분석은 보조 데이터)
 */
export async function evaluateQualityWithLlm(
  job: PrototypeJob,
  workDir: string,
): Promise<QualityScore> {
  // Step 1: 정적 분석 실행 (보조 데이터)
  const [buildResult, uiResult, funcResult, codeResult] = await Promise.all([
    buildScore(workDir),
    uiScore(workDir),
    functionalScore(workDir),
    codeScore(workDir),
  ]);
  const staticDimensions = [buildResult, uiResult, funcResult, codeResult];

  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    // API 키 없으면 prdScore 포함해 정적 분석 전체로 fallback
    const prdResult = await prdScore(job, workDir, { useLlm: false });
    const allDimensions = [...staticDimensions, prdResult];
    const total = Math.round(allDimensions.reduce((s, d) => s + d.weighted, 0) * 100);
    return {
      total,
      dimensions: allDimensions,
      evaluatedAt: new Date().toISOString(),
      round: job.round,
      jobId: job.id,
      staticAnalysis: allDimensions,
    };
  }

  // Step 2: 소스 코드 요약 수집
  const srcFiles = await collectSourceFiles(workDir);
  const codeSummary = srcFiles.join('\n').slice(0, 8000);

  // Step 3: 정적 분석 요약 문자열
  const staticSummary = staticDimensions
    .map(d => `${d.dimension}: ${Math.round(d.score * 100)} (${d.details})`)
    .join('\n');

  const client = new Anthropic({ apiKey });

  const prompt = [
    '당신은 React/TypeScript 프로토타입의 품질을 평가하는 시니어 엔지니어입니다.',
    '',
    '## 정적 분석 결과 (참고용)',
    staticSummary,
    '',
    '## 소스 코드',
    codeSummary || '(소스 파일 없음)',
    '',
    '## PRD 요구사항',
    job.prdContent.slice(0, 3000),
    '',
    '## 평가 지시사항',
    '정적 분석 결과를 참고하되, 코드를 직접 읽고 5개 차원을 0~100점으로 재평가하세요.',
    '각 차원에 점수 근거와 (필요 시) 구체적 개선 지시를 작성하세요.',
    '',
    '차원 정의:',
    '- build (20%): 빌드 안정성, 경고/에러 수',
    '- ui (25%): 레이아웃 품질, 시맨틱 구조, 접근성, 디자인 완성도',
    '- functional (20%): 인터랙티브 기능, 핸들러, 상태 관리',
    '- prd (25%): PRD Must Have 요구사항 구현 완성도',
    '- code (10%): 코드 품질, ESLint/TypeScript 준수',
    '',
    '순수 JSON으로만 응답하세요:',
    JSON.stringify({
      build: { score: 90, rationale: '빌드 성공, 경고 2건', fix: null },
      ui: { score: 70, rationale: '시맨틱 구조 미흡', fix: 'header/main/footer 추가' },
      functional: { score: 65, rationale: '핸들러 부족', fix: 'onClick 핸들러 추가' },
      prd: { score: 80, rationale: '8/10 요구사항 구현', fix: '차트 컴포넌트 미구현' },
      code: { score: 85, rationale: 'TS 에러 1건', fix: 'any 타입 제거' },
    }),
  ].join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();

    const jsonStr = text.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
    const llmResult = JSON.parse(jsonStr) as LlmIntegratedResponse;

    // LLM 점수를 DimensionScore 배열로 변환
    const dimensions: DimensionScore[] = (
      ['build', 'ui', 'functional', 'prd', 'code'] as const
    ).map(dim => {
      const llm = llmResult[dim];
      const score = Math.min(Math.max(llm.score / 100, 0), 1.0);
      const weight = DIMENSION_WEIGHTS[dim];
      return {
        dimension: dim,
        score: Math.round(score * 100) / 100,
        weight,
        weighted: Math.round(score * weight * 100) / 100,
        details: `LLM: ${llm.score}/100 — ${llm.rationale}${llm.fix ? ` | Fix: ${llm.fix}` : ''}`,
      };
    });

    const total = Math.round(dimensions.reduce((s, d) => s + d.weighted, 0) * 100);

    const llmEvaluation: LlmIntegratedEvaluation = {
      build: { score: llmResult.build.score, rationale: llmResult.build.rationale, fix: llmResult.build.fix },
      ui: { score: llmResult.ui.score, rationale: llmResult.ui.rationale, fix: llmResult.ui.fix },
      functional: { score: llmResult.functional.score, rationale: llmResult.functional.rationale, fix: llmResult.functional.fix },
      prd: { score: llmResult.prd.score, rationale: llmResult.prd.rationale, fix: llmResult.prd.fix },
      code: { score: llmResult.code.score, rationale: llmResult.code.rationale, fix: llmResult.code.fix },
    };

    return {
      total,
      dimensions,
      evaluatedAt: new Date().toISOString(),
      round: job.round,
      jobId: job.id,
      llmEvaluation,
      staticAnalysis: staticDimensions,
    };
  } catch (err) {
    console.log(`[Scorer] evaluateQualityWithLlm failed, falling back to static: ${String(err).slice(0, 100)}`);
    // fallback: 정적 분석 전체
    const prdResult = await prdScore(job, workDir, { useLlm: false });
    const allDimensions = [...staticDimensions, prdResult];
    const total = Math.round(allDimensions.reduce((s, d) => s + d.weighted, 0) * 100);
    return {
      total,
      dimensions: allDimensions,
      evaluatedAt: new Date().toISOString(),
      round: job.round,
      jobId: job.id,
      staticAnalysis: allDimensions,
    };
  }
}

/**
 * codeScore (10%) — ESLint + TypeScript 에러
 */
export async function codeScore(workDir: string): Promise<DimensionScore> {
  const weight = DIMENSION_WEIGHTS.code;

  let eslintErrors = 0;
  let tsErrors = 0;

  // ESLint 실행
  try {
    await execFileAsync(
      'npx', ['eslint', 'src/', '--format', 'json', '--no-error-on-unmatched-pattern'],
      { cwd: workDir, timeout: 30_000 },
    );
    // 성공 = 에러 0
  } catch (err) {
    const error = err as { stdout?: string };
    if (error.stdout) {
      try {
        const results = JSON.parse(error.stdout) as Array<{ errorCount: number }>;
        eslintErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
      } catch {
        eslintErrors = 5; // 파싱 실패 시 보수적
      }
    }
  }

  // TypeScript 체크
  try {
    await execFileAsync(
      'npx', ['tsc', '--noEmit'],
      { cwd: workDir, timeout: 30_000 },
    );
  } catch (err) {
    const error = err as { stdout?: string };
    const output = error.stdout ?? String(err);
    tsErrors = (output.match(/error TS\d+/g) ?? []).length;
  }

  // 점수 계산
  const eslintScore = eslintErrors === 0 ? 1.0
    : eslintErrors <= 3 ? 0.7
    : eslintErrors <= 10 ? 0.4
    : 0.2;

  const tsScore = tsErrors === 0 ? 1.0
    : tsErrors <= 3 ? 0.7
    : tsErrors <= 10 ? 0.4
    : 0.2;

  const score = (eslintScore + tsScore) / 2;

  return {
    dimension: 'code',
    score: Math.round(score * 100) / 100,
    weight,
    weighted: Math.round(score * weight * 100) / 100,
    details: `ESLint errors: ${eslintErrors}, TS errors: ${tsErrors}`,
  };
}

// ─────────────────────────────────────────────
// 통합 평가
// ─────────────────────────────────────────────

/**
 * 5차원 품질 평가 — 전체 통합
 * useLlmIntegrated: F426 5차원 LLM 통합 판별 활성화 (evaluateQualityWithLlm 호출)
 */
export async function evaluateQuality(
  job: PrototypeJob,
  workDir: string,
  options: { useLlm?: boolean; skipBuild?: boolean; useLlmIntegrated?: boolean } = {},
): Promise<QualityScore> {
  if (options.useLlmIntegrated) {
    return evaluateQualityWithLlm(job, workDir);
  }

  const dimensions: DimensionScore[] = [];

  // 병렬로 독립적인 평가 실행
  const [buildResult, uiResult, funcResult, prdResult, codeResult] = await Promise.all([
    options.skipBuild
      ? Promise.resolve<DimensionScore>({ dimension: 'build', score: 1, weight: 0.2, weighted: 0.2, details: 'Skipped (pre-built)' })
      : buildScore(workDir),
    uiScore(workDir),
    functionalScore(workDir),
    prdScore(job, workDir, { useLlm: options.useLlm }),
    codeScore(workDir),
  ]);

  dimensions.push(buildResult, uiResult, funcResult, prdResult, codeResult);

  const total = Math.round(
    dimensions.reduce((sum, d) => sum + d.weighted, 0) * 100,
  );

  return {
    total,
    dimensions,
    evaluatedAt: new Date().toISOString(),
    round: job.round,
    jobId: job.id,
  };
}

// ─────────────────────────────────────────────
// 타겟 피드백 생성
// ─────────────────────────────────────────────

const IMPROVEMENT_PROMPTS: Record<ScoreDimension, string> = {
  build: '빌드 에러를 수정하세요. 누락된 import, 타입 에러, 모듈 해결 실패를 확인하세요.',
  ui: '레이아웃을 개선하세요. Tailwind CSS 유틸리티로 일관된 간격/색상을 적용하고, header/nav/main/footer 시맨틱 구조를 사용하세요.',
  functional: '인터랙티브 기능을 추가하세요. 모든 버튼에 onClick 핸들러를 연결하고, useState로 상태 관리를 추가하세요.',
  prd: 'PRD의 Must Have 기능 중 미구현 항목을 추가하세요: {missing}',
  code: 'ESLint 에러와 TypeScript 타입 에러를 수정하세요. any 타입을 제거하세요.',
};

/**
 * 가장 약한 차원을 식별하고 타겟 피드백 생성
 */
export function generateTargetFeedback(score: QualityScore): TargetFeedback {
  const sorted = [...score.dimensions].sort((a, b) => a.score - b.score);
  const weakest = sorted[0]!;

  const prompt = IMPROVEMENT_PROMPTS[weakest.dimension]
    .replace('{missing}', weakest.details);

  return {
    weakestDimension: weakest.dimension,
    score: weakest.score,
    prompt,
  };
}

// ─────────────────────────────────────────────
// 재현성 측정 (PoC 전용)
// ─────────────────────────────────────────────

export interface ReproducibilityResult {
  scores: number[];
  mean: number;
  stdDev: number;
  maxDeviation: number;
  pass: boolean; // ±10점 이내
}

/**
 * 동일 코드에 대해 N회 평가 → 편차 측정
 */
export async function measureReproducibility(
  job: PrototypeJob,
  workDir: string,
  runs: number = 3,
): Promise<ReproducibilityResult> {
  const scores: number[] = [];

  for (let i = 0; i < runs; i++) {
    const result = await evaluateQuality(job, workDir, { skipBuild: true });
    scores.push(result.total);
  }

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const maxDeviation = Math.max(...scores.map(s => Math.abs(s - mean)));

  return {
    scores,
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    maxDeviation: Math.round(maxDeviation * 100) / 100,
    pass: maxDeviation <= 10,
  };
}

/**
 * PoC 결과를 마크다운 문서로 변환
 */
export function formatScorerPocReport(
  score: QualityScore,
  reproducibility: ReproducibilityResult,
): string {
  const lines = [
    '# 5차원 평가 재현성 PoC 결과 (F385)',
    '',
    `> 측정 시각: ${score.evaluatedAt}`,
    `> 대상 Job: ${score.jobId}`,
    '',
    '---',
    '',
    '## 1. 단일 평가 결과',
    '',
    `**총점: ${score.total}/100**`,
    '',
    '| 차원 | 점수 | 가중치 | 가중 점수 | 상세 |',
    '|------|:----:|:------:|:--------:|------|',
  ];

  for (const d of score.dimensions) {
    lines.push(
      `| ${d.dimension} | ${(d.score * 100).toFixed(0)} | ${(d.weight * 100).toFixed(0)}% | ${(d.weighted * 100).toFixed(1)} | ${d.details} |`,
    );
  }

  lines.push(
    '',
    '---',
    '',
    '## 2. 재현성 측정 결과',
    '',
    `| 항목 | 값 |`,
    `|------|-----|`,
    `| 실행 횟수 | ${reproducibility.scores.length} |`,
    `| 점수 | ${reproducibility.scores.join(', ')} |`,
    `| 평균 | ${reproducibility.mean} |`,
    `| 표준편차 | ${reproducibility.stdDev} |`,
    `| 최대 편차 | ${reproducibility.maxDeviation} |`,
    `| **판정** | **${reproducibility.pass ? 'PASS' : 'FAIL'}** (±10점 기준) |`,
    '',
    '---',
    '',
    '## 3. PoC 통과 기준',
    '',
    '| 기준 | 목표 | 결과 | 판정 |',
    '|------|------|------|:----:|',
    `| 재현성 | ±10점 이내 | ±${reproducibility.maxDeviation}점 | ${reproducibility.pass ? 'PASS' : 'FAIL'} |`,
    `| 5차원 분리 | 차원별 독립 점수 | ${score.dimensions.length}개 차원 | PASS |`,
    '',
    '---',
    '',
    '## 4. 다음 단계',
    '',
  );

  if (reproducibility.pass) {
    lines.push('- M1(Sprint 176)에서 prdScore LLM 통합 + D1 저장 본구현 진행');
    lines.push('- LLM prdScore 재현성 추가 검증 (temperature 0)');
  } else {
    lines.push('- prdScore를 키워드 매칭으로 고정 (LLM 재현성 부족 대비)');
    lines.push('- 빌드+정적분석 기반 3차원으로 축소 검토');
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────

/**
 * src/ 디렉토리의 .tsx/.ts/.jsx 파일 내용 수집
 */
async function collectSourceFiles(workDir: string): Promise<string[]> {
  const srcDir = path.join(workDir, 'src');
  try {
    await fs.access(srcDir);
  } catch {
    return [];
  }

  const files = await walkDir(srcDir);
  const contents: string[] = [];

  for (const file of files) {
    if (/\.(tsx?|jsx?)$/.test(file)) {
      const content = await fs.readFile(file, 'utf-8');
      contents.push(content);
    }
  }

  return contents;
}

async function walkDir(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}
