/**
 * F427: Vision API 시각 평가
 *
 * 빌드된 프로토타입의 스크린샷을 Claude Vision API로 전송하여
 * UI 시각 품질을 평가한다.
 *
 * 평가 항목: 레이아웃 균형 / 색상 조화 / 타이포그래피 / 시각 계층구조 / 반응형
 *
 * 스크린샷 전략:
 * 1. Chromium headless 스크린샷 (google-chrome / chromium)
 * 2. 없으면: HTML 소스 기반 텍스트 평가 (fallback)
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import Anthropic from '@anthropic-ai/sdk';
import type { DimensionScore } from './types.js';
import { DIMENSION_WEIGHTS } from './types.js';

const execFileAsync = promisify(execFile);

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

export interface VisionEvalResult {
  layout: number;        // 레이아웃 균형 0~100
  color: number;         // 색상 조화 0~100
  typography: number;    // 타이포그래피 0~100
  hierarchy: number;     // 시각 계층구조 0~100
  responsive: number;    // 반응형 0~100
  overall: number;       // 평균 점수 0~100
  rationale: string;     // 평가 근거
  method: 'screenshot' | 'html-text';  // 평가 방법
}

interface VisionApiResponse {
  layout: number;
  color: number;
  typography: number;
  hierarchy: number;
  responsive: number;
  rationale: string;
}

// ─────────────────────────────────────────────
// Chromium 탐색
// ─────────────────────────────────────────────

const CHROMIUM_CANDIDATES = [
  'google-chrome',
  'google-chrome-stable',
  'chromium',
  'chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

export async function findChromium(): Promise<string | null> {
  for (const candidate of CHROMIUM_CANDIDATES) {
    try {
      await execFileAsync('which', [candidate], { timeout: 3000 });
      return candidate;
    } catch {
      // 다음 후보 시도
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// 스크린샷 캡처
// ─────────────────────────────────────────────

/**
 * Chromium headless로 HTML 파일 스크린샷 캡처 → PNG base64 반환
 */
export async function captureScreenshot(
  htmlPath: string,
  chromiumPath: string,
): Promise<string | null> {
  const tmpFile = path.join(os.tmpdir(), `fx-vision-${Date.now()}.png`);

  try {
    await execFileAsync(
      chromiumPath,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        `--screenshot=${tmpFile}`,
        '--window-size=1280,800',
        `file://${htmlPath}`,
      ],
      { timeout: 30_000 },
    );

    const buffer = await fs.readFile(tmpFile);
    const base64 = buffer.toString('base64');

    // 임시 파일 정리
    await fs.unlink(tmpFile).catch(() => undefined);

    return base64;
  } catch {
    await fs.unlink(tmpFile).catch(() => undefined);
    return null;
  }
}

// ─────────────────────────────────────────────
// Claude API 호출 (Vision 또는 텍스트)
// ─────────────────────────────────────────────

const VISION_SYSTEM_PROMPT = [
  '당신은 UI/UX 전문가입니다. 프로토타입의 시각적 품질을 5개 항목에서 0~100점으로 평가하세요.',
  '',
  '평가 기준:',
  '- layout (레이아웃 균형): 요소 배치, 여백 일관성, 시각적 균형',
  '- color (색상 조화): 색상 팔레트 일관성, 대비, impeccable 디자인 원칙 준수',
  '- typography (타이포그래피): 폰트 계층, 가독성, 크기/두께 시스템',
  '- hierarchy (시각 계층구조): 주요 정보가 시각적으로 부각되는지, 정보 구조',
  '- responsive (반응형): 레이아웃이 다양한 화면에서 유연하게 동작할지',
  '',
  '순수 JSON으로만 응답하세요 (마크다운 없이):',
].join('\n');

function buildVisionEvalExample(): string {
  return JSON.stringify({
    layout: 75,
    color: 60,
    typography: 80,
    hierarchy: 70,
    responsive: 65,
    rationale: '레이아웃 균형 양호. 색상이 단조로움(회색 계열 과다). 타이포 계층 명확. 계층구조 개선 여지. 반응형 기본 구현.',
  } satisfies VisionApiResponse);
}

/**
 * Claude Vision API로 스크린샷 이미지를 평가
 */
async function evaluateWithScreenshot(
  base64Image: string,
  client: Anthropic,
): Promise<VisionApiResponse> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    temperature: 0,
    system: VISION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `위 프로토타입 스크린샷을 평가하세요.\n\n응답 형식 예시:\n${buildVisionEvalExample()}`,
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();

  const jsonStr = text.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
  return JSON.parse(jsonStr) as VisionApiResponse;
}

/**
 * Claude 텍스트 API로 HTML 코드를 시각적으로 평가 (스크린샷 없을 때 fallback)
 */
async function evaluateWithHtmlText(
  htmlContent: string,
  cssContent: string,
  client: Anthropic,
): Promise<VisionApiResponse> {
  const prompt = [
    '아래 HTML/CSS 코드를 읽고, 실제 렌더링된 모습을 상상하여 시각적 품질을 평가하세요.',
    '',
    '## HTML',
    htmlContent.slice(0, 4000),
    '',
    '## CSS/TSX 코드',
    cssContent.slice(0, 4000),
    '',
    `응답 형식 예시:\n${buildVisionEvalExample()}`,
  ].join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    temperature: 0,
    system: VISION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();

  const jsonStr = text.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
  return JSON.parse(jsonStr) as VisionApiResponse;
}

// ─────────────────────────────────────────────
// 소스 파일 수집 헬퍼
// ─────────────────────────────────────────────

async function readBuildArtifacts(workDir: string): Promise<{ html: string; css: string }> {
  const distIndex = path.join(workDir, 'dist', 'index.html');
  const srcIndex = path.join(workDir, 'index.html');

  let html = '';
  try {
    html = await fs.readFile(distIndex, 'utf-8');
  } catch {
    try {
      html = await fs.readFile(srcIndex, 'utf-8');
    } catch {
      html = '';
    }
  }

  // CSS/TSX 소스 수집
  const cssLines: string[] = [];
  const srcDir = path.join(workDir, 'src');
  try {
    await collectCssAndJsx(srcDir, cssLines);
  } catch {
    // src/ 없으면 skip
  }

  return { html, css: cssLines.join('\n') };
}

async function collectCssAndJsx(dir: string, lines: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectCssAndJsx(full, lines);
    } else if (entry.name.endsWith('.css') || entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      try {
        const content = await fs.readFile(full, 'utf-8');
        lines.push(`// ${entry.name}\n${content.slice(0, 800)}`);
      } catch {
        // skip
      }
    }
    // 총 합산이 8000자 넘으면 중단
    if (lines.join('\n').length > 8000) break;
  }
}

// ─────────────────────────────────────────────
// 메인 평가 함수
// ─────────────────────────────────────────────

/**
 * Vision API로 UI 차원 점수 산출 (F427)
 *
 * 우선순위:
 * 1. Chromium 스크린샷 → Vision API
 * 2. HTML 텍스트 → Claude API (fallback)
 * 3. API 키 없음 → 정적 분석 점수 그대로 반환 (0.5 기본값)
 */
export async function visionEvaluateUi(
  workDir: string,
  options: {
    apiKey?: string;
    chromiumPath?: string;
  } = {},
): Promise<VisionEvalResult> {
  const apiKey = options.apiKey ?? process.env['ANTHROPIC_API_KEY'];

  if (!apiKey) {
    return {
      layout: 50, color: 50, typography: 50, hierarchy: 50, responsive: 50,
      overall: 50,
      rationale: 'ANTHROPIC_API_KEY not set — using default score',
      method: 'html-text',
    };
  }

  const client = new Anthropic({ apiKey });
  const { html, css } = await readBuildArtifacts(workDir);

  // 스크린샷 시도
  let parsed: VisionApiResponse | null = null;
  let method: 'screenshot' | 'html-text' = 'html-text';

  const chromiumPath = options.chromiumPath ?? await findChromium();
  if (chromiumPath) {
    const distIndex = path.join(workDir, 'dist', 'index.html');
    const srcIndex = path.join(workDir, 'index.html');
    const htmlFile = await fs.access(distIndex).then(() => distIndex).catch(() => srcIndex);

    const base64 = await captureScreenshot(htmlFile, chromiumPath);
    if (base64) {
      try {
        parsed = await evaluateWithScreenshot(base64, client);
        method = 'screenshot';
      } catch {
        parsed = null; // fallback to HTML text
      }
    }
  }

  // HTML 텍스트 fallback
  if (!parsed) {
    try {
      parsed = await evaluateWithHtmlText(html, css, client);
    } catch (err) {
      console.log(`[Vision] evaluateWithHtmlText failed: ${String(err).slice(0, 100)}`);
      return {
        layout: 50, color: 50, typography: 50, hierarchy: 50, responsive: 50,
        overall: 50,
        rationale: `Vision API failed: ${String(err).slice(0, 100)}`,
        method: 'html-text',
      };
    }
  }

  // 점수 정규화 (0~100 범위 보장)
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const layout = clamp(parsed.layout);
  const color = clamp(parsed.color);
  const typography = clamp(parsed.typography);
  const hierarchy = clamp(parsed.hierarchy);
  const responsive = clamp(parsed.responsive);
  const overall = Math.round((layout + color + typography + hierarchy + responsive) / 5);

  return { layout, color, typography, hierarchy, responsive, overall, rationale: parsed.rationale, method };
}

/**
 * Vision 평가 결과를 DimensionScore(ui)로 변환
 */
export function visionResultToDimensionScore(result: VisionEvalResult): DimensionScore {
  const weight = DIMENSION_WEIGHTS.ui;
  const score = result.overall / 100;

  return {
    dimension: 'ui',
    score: Math.round(score * 100) / 100,
    weight,
    weighted: Math.round(score * weight * 100) / 100,
    details: [
      `Vision(${result.method}): layout=${result.layout}, color=${result.color},`,
      `typo=${result.typography}, hierarchy=${result.hierarchy}, responsive=${result.responsive}`,
      `| ${result.rationale.slice(0, 100)}`,
    ].join(' '),
  };
}
