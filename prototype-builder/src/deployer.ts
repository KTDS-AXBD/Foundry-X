import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import type { DeployResult, BuilderConfig } from './types.js';

const execFileAsync = promisify(execFile);

/**
 * Cloudflare Pages에 빌드 산출물 배포
 * wrangler pages deploy dist/ --project-name=proto-{name}
 */
export async function deployToPages(
  workDir: string,
  projectName: string,
  config: Pick<BuilderConfig, 'cloudflareApiToken' | 'cloudflareAccountId'>,
): Promise<DeployResult> {
  const distDir = path.join(workDir, 'dist');

  const { stdout } = await execFileAsync(
    'npx',
    [
      'wrangler', 'pages', 'deploy', distDir,
      '--project-name', projectName,
      '--commit-dirty=true',
    ],
    {
      cwd: workDir,
      timeout: 3 * 60 * 1000, // 3분
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: config.cloudflareApiToken,
        CLOUDFLARE_ACCOUNT_ID: config.cloudflareAccountId,
      },
    },
  );

  // wrangler 출력에서 배포 URL 추출
  const urlMatch = stdout.match(/https:\/\/[\w-]+\.[\w-]+\.pages\.dev/);
  const url = urlMatch ? urlMatch[0]! : `https://${projectName}.pages.dev`;

  return { url, projectName };
}

/**
 * 프로토타입 이름에서 안전한 Pages 프로젝트명 생성
 * 한글→영문 변환은 하지 않고, kebab-case + prefix만 적용
 */
export function toProjectName(name: string): string {
  return `proto-${name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)}`;
}
