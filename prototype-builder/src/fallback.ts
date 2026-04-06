import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
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
 * API 응답에서 파일 블록을 파싱하여 workDir에 저장
 * 형식: ```tsx // src/App.tsx  또는  // filepath: src/components/Header.tsx
 */
export async function writeGeneratedFiles(
  text: string,
  workDir: string,
): Promise<number> {
  // 패턴 1: ```언어\n// filepath: path\n코드```
  // 패턴 2: ```언어\n// src/path\n코드```
  const fileBlocks: Array<{ filePath: string; content: string }> = [];
  const seen = new Set<string>();
  let match;

  // 패턴 1: ```lang\n// filepath 또는 // src/path\n코드```
  const p1 = /```(?:tsx?|jsx?|css|json|html)\s*\n(?:\/\/\s*(?:filepath:\s*)?)?(\S+\.(?:tsx?|jsx?|css|json|html))\s*\n([\s\S]*?)```/g;
  while ((match = p1.exec(text)) !== null) {
    const fp = match[1]!.replace(/^\/+/, '');
    if (!seen.has(fp)) { seen.add(fp); fileBlocks.push({ filePath: fp, content: match[2]! }); }
  }

  // 패턴 2: **`src/path`** 또는 **src/path** 또는 ### `src/path` 후 코드블록
  const p2 = /(?:\*\*`?|###\s*`?)(src\/[^`*\n#]+\.(?:tsx?|jsx?|css))`?\*?\*?\s*\n+```(?:tsx?|jsx?|css|json|html)?\s*\n([\s\S]*?)```/g;
  while ((match = p2.exec(text)) !== null) {
    const fp = match[1]!;
    if (!seen.has(fp)) { seen.add(fp); fileBlocks.push({ filePath: fp, content: match[2]! }); }
  }

  // 패턴 3: #### filename.tsx 또는 **filename.tsx**: 후 코드블록 (경로 없으면 src/ 추가)
  const p3 = /(?:####?\s+|^\*\*)([A-Z][A-Za-z]+\.tsx?)\*?\*?\s*:?\s*\n+```(?:tsx?|jsx?)?\s*\n([\s\S]*?)```/gm;
  while ((match = p3.exec(text)) !== null) {
    const name = match[1]!;
    const fp = name === 'App.tsx' ? `src/${name}` : `src/components/${name}`;
    if (!seen.has(fp)) { seen.add(fp); fileBlocks.push({ filePath: fp, content: match[2]! }); }
  }

  // 패턴 4: 코드블록 내부 첫 줄이 import/export로 시작하면 파일명 추론 불가 → skip
  // 최후 fallback: 단일 블록이면 App.tsx로
  if (fileBlocks.length === 0) {
    const singleBlock = text.match(/```(?:tsx?|jsx?)\s*\n([\s\S]*?)```/);
    if (singleBlock) {
      fileBlocks.push({ filePath: 'src/App.tsx', content: singleBlock[1]! });
    }
  }

  let written = 0;
  for (const block of fileBlocks) {
    const fullPath = path.join(workDir, block.filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, block.content, 'utf-8');
    written++;
    console.log(`[Builder] Wrote: ${block.filePath} (${block.content.length} bytes)`);
  }

  // 빌드 실패 방지: 파일에서 import된 로컬 모듈 중 없는 파일에 stub 생성
  await createMissingStubs(workDir);

  return written;
}

/**
 * 작성된 .tsx/.ts 파일의 import를 스캔하여 누락된 로컬 파일에 빈 stub 생성
 */
async function createMissingStubs(workDir: string): Promise<void> {
  const srcDir = path.join(workDir, 'src');
  try {
    await fs.access(srcDir);
  } catch {
    return;
  }

  const files = await collectFiles(srcDir);
  const existing = new Set(files.map(f => path.relative(workDir, f)));

  for (const file of files) {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
    const content = await fs.readFile(file, 'utf-8');

    // from './path' 또는 from "../path" 패턴 매칭
    const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
    let m;
    while ((m = importRegex.exec(content)) !== null) {
      const importPath = m[1]!;
      const dir = path.dirname(file);
      const resolved = path.resolve(dir, importPath);
      const rel = path.relative(workDir, resolved);

      // .tsx, .ts 확장자 시도
      const candidates = [rel + '.tsx', rel + '.ts', rel + '/index.tsx', rel + '/index.ts'];
      const found = candidates.some(c => existing.has(c));

      if (!found) {
        const stubPath = path.join(workDir, rel + '.tsx');
        await fs.mkdir(path.dirname(stubPath), { recursive: true });
        // 파일명에서 컴포넌트명 추출 (e.g. RuleGeneratorView.tsx → RuleGeneratorView)
        const compName = path.basename(rel).replace(/\.\w+$/, '');
        // default + named export 모두 제공 — import 방식 무관하게 동작
        const stub = [
          `export function ${compName}() { return <div>${compName} placeholder</div>; }`,
          `export default ${compName};`,
          '',
        ].join('\n');
        await fs.writeFile(stubPath, stub, 'utf-8');
        existing.add(rel + '.tsx');
        console.log(`[Builder] Stub created: ${rel}.tsx (${compName})`);
      }
    }
  }
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...await collectFiles(full));
    } else {
      result.push(full);
    }
  }
  return result;
}

/**
 * Anthropic API 직접 호출 + workDir에 파일 생성
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

  // API 모드용 프롬프트 — 파일 경로를 명시적으로 요구
  const basePrompt = buildGeneratorPrompt(job, round);
  const apiPrompt = [
    basePrompt,
    '',
    '## 출력 형식 (필수)',
    '각 파일을 아래 형식으로 출력하세요:',
    '',
    '```tsx',
    '// src/App.tsx',
    '코드 내용...',
    '```',
    '',
    '```tsx',
    '// src/components/ComponentName.tsx',
    '코드 내용...',
    '```',
    '',
    '모든 파일의 첫 줄에 `// src/경로/파일명.tsx` 주석을 반드시 포함하세요.',
    'index.html, tailwind.config.js, vite.config.ts는 수정하지 마세요.',
    'src/App.tsx는 반드시 포함하세요.',
  ].join('\n');

  console.log(`[Builder] API call: round=${round}, model=claude-sonnet-4-6`);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16384,
      messages: [{ role: 'user', content: apiPrompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    // 응답에서 파일을 파싱하여 workDir에 저장
    const filesWritten = await writeGeneratedFiles(text, job.workDir);
    console.log(`[Builder] API response: ${text.length} chars, ${filesWritten} files written`);

    if (filesWritten === 0) {
      return {
        level: 'api',
        output: text,
        success: false,
        error: `API returned text but no parseable file blocks (${text.length} chars)`,
      };
    }

    return { level: 'api', output: text, success: true };
  } catch (err) {
    console.error(`[Builder] API error:`, err);
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
 * SKIP_CLI=true 환경변수로 CLI 단계 건너뛰기 가능 (Docker 환경용)
 */
export async function executeWithFallback(
  job: PrototypeJob,
  round: number,
  cliRunner: (job: PrototypeJob, round: number) => Promise<{ stdout: string; exitCode: number }>,
): Promise<FallbackResult> {
  const skipCli = process.env['SKIP_CLI'] === 'true';

  // Level 1: CLI (Docker에서는 skip)
  if (!skipCli) {
    console.log(`[Builder] Trying CLI generator...`);
    const cliResult = await cliRunner(job, round);
    if (cliResult.exitCode === 0) {
      return { level: 'cli', output: cliResult.stdout, success: true };
    }
    console.log(`[Builder] CLI failed (exit ${cliResult.exitCode}), falling back to API`);
  } else {
    console.log(`[Builder] SKIP_CLI=true, using API directly`);
  }

  // Level 2: API (with file writing)
  const apiResult = await fallbackToApi(job, round);
  if (apiResult.success) {
    return apiResult;
  }

  // Level 3: 모두 실패
  return {
    level: 'ensemble',
    output: '',
    success: false,
    error: `${skipCli ? 'CLI skipped' : 'CLI failed'}, API failed: ${apiResult.error}`,
  };
}
