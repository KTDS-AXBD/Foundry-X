import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import type { DeployResult, BuilderConfig } from './types.js';

const execFileAsync = promisify(execFile);

/**
 * Cloudflare Pages에 빌드 산출물 배포
 * 프로젝트가 없으면 자동 생성 후 재시도
 */
export async function deployToPages(
  workDir: string,
  projectName: string,
  config: Pick<BuilderConfig, 'cloudflareApiToken' | 'cloudflareAccountId'>,
): Promise<DeployResult> {
  const distDir = path.join(workDir, 'dist');
  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: config.cloudflareApiToken,
    CLOUDFLARE_ACCOUNT_ID: config.cloudflareAccountId,
  };

  // 프로젝트 생성 시도 (이미 있으면 에러 무시)
  try {
    await execFileAsync(
      'npx',
      ['wrangler', 'pages', 'project', 'create', projectName, '--production-branch=main'],
      { cwd: workDir, timeout: 30_000, env },
    );
    console.log(`[Builder] Pages project created: ${projectName}`);
  } catch {
    // 이미 존재하면 에러 — 무시
    console.log(`[Builder] Pages project already exists or creation skipped: ${projectName}`);
  }

  const { stdout } = await execFileAsync(
    'npx',
    [
      'wrangler', 'pages', 'deploy', distDir,
      '--project-name', projectName,
      '--commit-dirty=true',
    ],
    {
      cwd: workDir,
      timeout: 3 * 60 * 1000,
      env,
    },
  );

  // wrangler 출력에서 배포 URL 추출
  const urlMatch = stdout.match(/https:\/\/[\w-]+\.[\w-]+\.pages\.dev/);
  const url = urlMatch ? urlMatch[0]! : `https://${projectName}.pages.dev`;

  console.log(`[Builder] Deployed: ${url}`);
  return { url, projectName };
}

/**
 * 프로토타입 이름에서 안전한 Pages 프로젝트명 생성
 * 한글→영문 변환은 하지 않고, kebab-case + prefix만 적용
 */
export function toProjectName(name: string): string {
  return `proto-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)}`;
}
