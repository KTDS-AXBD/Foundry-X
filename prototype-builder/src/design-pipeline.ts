/**
 * F430: DesignPipeline — /audit→/normalize→/polish 3단계 커맨드 파이프라인
 *
 * 기존 runOgdLoop가 "범용 품질 반복 루프"라면,
 * DesignPipeline은 impeccable 기준의 "단계별 특화 체인":
 *
 * 1. /audit   — 현재 상태 진단 (impeccable 7도메인 위반 목록)
 * 2. /normalize — critical + major 위반 수정 (Generator 1회 실행)
 * 3. /polish  — 최종 마감 (점수 80 미달 시 Generator 추가 실행)
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  PrototypeJob,
  AuditReport,
  ImpeccableViolation,
  PipelineResult,
  PipelineStepResult,
} from './types.js';
import { executeWithFallback } from './fallback.js';
import { evaluateQuality } from './scorer.js';
import { CostTracker } from './cost-tracker.js';

// impeccable 7도메인 요약 (주입용 — 전체 텍스트는 packages/api/src/data/impeccable-reference.ts)
const IMPECCABLE_AUDIT_GUIDE = `
## impeccable 감사 기준 (7도메인)

### typography
- Body font-size: 최소 16px (1rem)
- Line-height: body 1.5~1.7, heading 1.1~1.3
- Line-length: 55~75자 (45ch~65ch)
- 폰트 패밀리: 최대 2종. Arial/Inter/system-ui는 "AI 기본값" 신호

### colorContrast
- pure #000000/#ffffff 금지 → tinted neutrals 사용
- Body text 대비: 최소 4.5:1 (WCAG AA)
- Medium gray (#999) on white: 2.8:1로 기준 미달

### spatialDesign
- 간격 단위: 4px 또는 8px의 배수만 허용
- 섹션 패딩: 최소 64px vertical
- 카드 내부 padding: 최소 24px

### motionDesign
- 마이크로 인터랙션: 100~200ms
- 전환: 200~350ms
- 600ms 초과 전환 금지

### componentDesign
- Button tap target: 최소 44px
- Form field height: 44~48px
- 비어있는 상태(empty state) 필수

### darkMode
- prefers-color-scheme 미디어 쿼리 또는 CSS 변수 기반 테마 필요
- 다크모드에서 순수 검정 배경(#000) 금지 → #0f172a 같은 tinted dark

### accessibility
- 이미지에 alt 속성 필수
- 인터랙티브 요소에 aria-label 필수
- Focus visible 스타일 필수
`.trim();

export interface DesignPipelineOptions {
  costTracker?: CostTracker;
  /** polish 단계 품질 목표 점수 (기본: 80) */
  qualityThreshold?: number;
  /** API 키 없을 때 정적 fallback 사용 여부 (기본: true) */
  staticFallback?: boolean;
}

/**
 * /audit 단계: LLM 기반 impeccable 위반 진단
 *
 * API 키 없거나 호출 실패 시 빈 violations로 fallback
 */
export async function audit(
  job: PrototypeJob,
  workDir: string,
  apiKey?: string,
): Promise<AuditReport> {
  const startedAt = new Date().toISOString();

  // 소스 코드 수집 (CSS + JSX/TSX, 최대 6000자)
  const sourceCode = await collectSourceCode(workDir);

  // API 키 없으면 정적 fallback
  const resolvedApiKey = apiKey ?? process.env['ANTHROPIC_API_KEY'];
  if (!resolvedApiKey) {
    console.log('[DesignPipeline] /audit: API key not found — using empty violations fallback');
    return buildEmptyAuditReport(job.id, startedAt, 'No API key available');
  }

  const prompt = buildAuditPrompt(job.prdContent, sourceCode);

  try {
    const client = new Anthropic({ apiKey: resolvedApiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawAnalysis = (response.content as Array<{ type: string; text?: string }>)
      .filter(b => b.type === 'text')
      .map(b => b.text ?? '')
      .join('');

    const violations = parseViolations(rawAnalysis);
    return buildAuditReport(job.id, violations, startedAt, rawAnalysis);

  } catch (err) {
    console.warn('[DesignPipeline] /audit LLM call failed:', err);
    return buildEmptyAuditReport(job.id, startedAt, String(err));
  }
}

/**
 * /normalize 단계: critical + major 위반 수정
 *
 * 위반 목록을 프롬프트에 주입하고 Generator 1회 실행
 */
export async function normalize(
  job: PrototypeJob,
  workDir: string,
  report: AuditReport,
): Promise<{ success: boolean; output: string }> {
  const criticalAndMajor = report.violations.filter(
    v => v.severity === 'critical' || v.severity === 'major',
  );

  if (criticalAndMajor.length === 0) {
    console.log('[DesignPipeline] /normalize: no critical/major violations — skipping');
    return { success: true, output: '' };
  }

  // 위반 목록을 피드백으로 변환
  const fixList = criticalAndMajor
    .map((v, i) => `${i + 1}. [${v.severity.toUpperCase()}] ${v.domain}: ${v.fix}`)
    .join('\n');

  const normalizeJob: PrototypeJob = {
    ...job,
    workDir,
    feedbackContent: `## impeccable 디자인 수정 지시\n\n${fixList}`,
    round: 0,
  };

  console.log(`[DesignPipeline] /normalize: applying ${criticalAndMajor.length} fixes`);
  const result = await executeWithFallback(normalizeJob, 0);
  return { success: result.success, output: result.output };
}

/**
 * /polish 단계: 최종 마감 (점수 80 미달 시 Generator 추가)
 *
 * 1. evaluateQuality 실행
 * 2. 점수 < threshold → Generator 1회 추가 실행
 * 3. 최종 PipelineResult 반환
 */
export async function polish(
  job: PrototypeJob,
  workDir: string,
  report: AuditReport,
  opts: DesignPipelineOptions = {},
): Promise<{ score: number; converged: boolean; totalCost: number }> {
  const threshold = opts.qualityThreshold ?? 80;

  // 1차 품질 평가
  const score1 = await evaluateQuality({ ...job, workDir }, workDir);
  console.log(`[DesignPipeline] /polish: initial score ${score1.total}/100 (target: ${threshold})`);

  if (score1.total >= threshold) {
    return { score: score1.total, converged: true, totalCost: 0 };
  }

  // minor 위반을 피드백으로 추가
  const minorViolations = report.violations.filter(v => v.severity === 'minor');
  const feedback = minorViolations.length > 0
    ? minorViolations.map(v => `- ${v.domain}: ${v.fix}`).join('\n')
    : '전반적인 시각 완성도와 일관성을 높여주세요.';

  const polishJob: PrototypeJob = {
    ...job,
    workDir,
    feedbackContent: `## 마감 개선 지시 (현재 점수: ${score1.total}/100)\n\n${feedback}`,
    round: 1,
  };

  console.log(`[DesignPipeline] /polish: applying polish pass`);
  await executeWithFallback(polishJob, 1);

  // 2차 품질 평가
  const score2 = await evaluateQuality({ ...job, workDir }, workDir);
  console.log(`[DesignPipeline] /polish: final score ${score2.total}/100`);

  return {
    score: score2.total,
    converged: score2.total >= threshold,
    totalCost: 0,
  };
}

/**
 * 전체 파이프라인 실행: /audit → /normalize → /polish
 */
export async function runDesignPipeline(
  job: PrototypeJob,
  opts: DesignPipelineOptions = {},
): Promise<PipelineResult> {
  const steps: PipelineStepResult[] = [];

  // Step 1: /audit
  const auditStart = Date.now();
  let auditReport: AuditReport;
  try {
    auditReport = await audit(job, job.workDir);
    steps.push({ step: 'audit', success: true, durationMs: Date.now() - auditStart });
    console.log(`[DesignPipeline] /audit done: ${auditReport.criticalCount} critical, ${auditReport.majorCount} major, ${auditReport.minorCount} minor`);
  } catch (err) {
    steps.push({ step: 'audit', success: false, durationMs: Date.now() - auditStart, error: String(err) });
    // audit 실패해도 빈 report로 계속 진행
    auditReport = buildEmptyAuditReport(job.id, new Date().toISOString(), String(err));
  }

  // Step 2: /normalize
  const normalizeStart = Date.now();
  try {
    await normalize(job, job.workDir, auditReport);
    steps.push({ step: 'normalize', success: true, durationMs: Date.now() - normalizeStart });
  } catch (err) {
    steps.push({ step: 'normalize', success: false, durationMs: Date.now() - normalizeStart, error: String(err) });
    // normalize 실패해도 polish 단계 진행
  }

  // Step 3: /polish
  const polishStart = Date.now();
  let polishResult: { score: number; converged: boolean; totalCost: number };
  try {
    polishResult = await polish(job, job.workDir, auditReport, opts);
    steps.push({ step: 'polish', success: true, durationMs: Date.now() - polishStart });
  } catch (err) {
    steps.push({ step: 'polish', success: false, durationMs: Date.now() - polishStart, error: String(err) });
    polishResult = { score: 0, converged: false, totalCost: 0 };
  }

  return {
    jobId: job.id,
    auditReport,
    score: polishResult.score,
    totalCost: polishResult.totalCost,
    steps,
    converged: polishResult.converged,
  };
}

// ─────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────

async function collectSourceCode(workDir: string): Promise<string> {
  const srcDir = path.join(workDir, 'src');
  const chunks: string[] = [];
  const MAX_CHARS = 6_000;

  try {
    const files = await fs.readdir(srcDir, { recursive: true });
    for (const file of files) {
      if (typeof file !== 'string') continue;
      if (!file.match(/\.(tsx?|css|scss)$/)) continue;

      const fullPath = path.join(srcDir, file);
      const content = await fs.readFile(fullPath, 'utf-8').catch(() => '');
      if (content) {
        chunks.push(`\n// === ${file} ===\n${content}`);
      }
      if (chunks.join('').length >= MAX_CHARS) break;
    }
  } catch {
    // srcDir 없으면 빈 문자열 반환
  }

  return chunks.join('').slice(0, MAX_CHARS);
}

function buildAuditPrompt(prdContent: string, sourceCode: string): string {
  return [
    '당신은 웹 UI 디자인 품질 감사 전문가입니다.',
    'impeccable 기준으로 위반을 분류하여 JSON으로 반환하세요.',
    '',
    IMPECCABLE_AUDIT_GUIDE,
    '',
    '## 감사 대상 소스 코드',
    '```',
    sourceCode || '(소스 코드 없음)',
    '```',
    '',
    '## PRD 요구사항',
    prdContent.slice(0, 2000),
    '',
    '## 출력 형식 (JSON만 반환, 다른 텍스트 없음)',
    '```json',
    '{',
    '  "violations": [',
    '    {',
    '      "domain": "typography",',
    '      "severity": "critical",',
    '      "rule": "Body font-size < 16px",',
    '      "evidence": "font-size: 14px found in .body-text",',
    '      "fix": "Change .body-text font-size to 16px"',
    '    }',
    '  ]',
    '}',
    '```',
  ].join('\n');
}

function parseViolations(rawText: string): ImpeccableViolation[] {
  // JSON 코드 블록 또는 raw JSON 추출
  const jsonMatch =
    rawText.match(/```json\s*([\s\S]*?)```/) ??
    rawText.match(/\{[\s\S]*"violations"[\s\S]*\}/);

  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0]) as {
      violations?: unknown[];
    };

    if (!Array.isArray(parsed.violations)) return [];

    return parsed.violations.filter(isValidViolation);
  } catch {
    return [];
  }
}

function isValidViolation(v: unknown): v is ImpeccableViolation {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj['domain'] === 'string' &&
    typeof obj['severity'] === 'string' &&
    typeof obj['rule'] === 'string' &&
    typeof obj['evidence'] === 'string' &&
    typeof obj['fix'] === 'string'
  );
}

function buildAuditReport(
  jobId: string,
  violations: ImpeccableViolation[],
  auditedAt: string,
  rawAnalysis: string,
): AuditReport {
  return {
    jobId,
    violations,
    criticalCount: violations.filter(v => v.severity === 'critical').length,
    majorCount: violations.filter(v => v.severity === 'major').length,
    minorCount: violations.filter(v => v.severity === 'minor').length,
    auditedAt,
    rawAnalysis,
  };
}

function buildEmptyAuditReport(
  jobId: string,
  auditedAt: string,
  reason: string,
): AuditReport {
  return {
    jobId,
    violations: [],
    criticalCount: 0,
    majorCount: 0,
    minorCount: 0,
    auditedAt,
    rawAnalysis: reason,
  };
}
