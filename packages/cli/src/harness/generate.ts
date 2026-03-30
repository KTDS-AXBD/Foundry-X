import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import type { GenerateResult, RepoProfile } from '@foundry-x/shared';
import { mergeMarkdown, mergeJson } from './merge-utils.js';
import type { HarnessBuilder } from './builders/types.js';
import { buildArchitecture } from './builders/architecture-builder.js';
import { buildConstitution } from './builders/constitution-builder.js';
import { buildClaude } from './builders/claude-builder.js';
import { buildAgents } from './builders/agents-builder.js';
import { buildProjectContext } from './builders/project-context-builder.js';

/** Builder 등록: 이 파일명에 대해 builder가 동적 콘텐츠를 생성 */
const BUILDERS: Record<string, HarnessBuilder> = {
  'ARCHITECTURE.md': buildArchitecture,
  'CONSTITUTION.md': buildConstitution,
  'CLAUDE.md': buildClaude,
  'AGENTS.md': buildAgents,
  'project-context.md': buildProjectContext,
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Recursively list all files in a directory, returning relative paths.
 * Excludes _meta.json.
 */
async function listFilesRecursive(
  dir: string,
  base: string = dir,
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listFilesRecursive(fullPath, base);
      files.push(...nested);
    } else if (entry.name !== '_meta.json') {
      files.push(relative(base, fullPath));
    }
  }

  return files;
}

function applyProfileVariables(content: string, profile: RepoProfile): string {
  return content
    .replace(/\{\{languages\}\}/g, profile.languages.join(', '))
    .replace(/\{\{frameworks\}\}/g, profile.frameworks.join(', '))
    .replace(/\{\{buildTools\}\}/g, profile.buildTools.join(', '))
    .replace(/\{\{packageManager\}\}/g, profile.packageManager ?? 'unknown')
    .replace(/\{\{architecturePattern\}\}/g, profile.architecturePattern)
    .replace(/\{\{mode\}\}/g, profile.mode);
}

export async function generateHarness(
  cwd: string,
  profile: RepoProfile,
  templateDir: string,
  options?: { force?: boolean },
): Promise<GenerateResult> {
  const force = options?.force ?? false;
  const created: string[] = [];
  const merged: string[] = [];
  const skipped: string[] = [];

  const templateFiles = await listFilesRecursive(templateDir);

  for (const relPath of templateFiles) {
    const srcPath = join(templateDir, relPath);
    const destPath = join(cwd, relPath);
    const ext = extname(relPath);
    const builder = BUILDERS[relPath];

    // Ensure parent directory exists
    await ensureDir(dirname(destPath));

    // Resolve content: builder output or template with variable substitution
    const content = builder
      ? builder(profile)
      : ext === '.md'
        ? applyProfileVariables(await readFile(srcPath, 'utf-8'), profile)
        : await readFile(srcPath, 'utf-8');

    const destExists = await fileExists(destPath);

    if (!destExists) {
      // File doesn't exist → write builder/template content
      await writeFile(destPath, content);
      created.push(relPath);
    } else if (force) {
      // Force mode → overwrite
      await writeFile(destPath, content);
      created.push(relPath);
    } else if (ext === '.md') {
      // Merge markdown — preserves user customizations
      const existingContent = await readFile(destPath, 'utf-8');
      const mergedContent = mergeMarkdown(existingContent, content);
      await writeFile(destPath, mergedContent);
      merged.push(relPath);
    } else if (ext === '.json') {
      // Merge JSON
      const existingContent = await readFile(destPath, 'utf-8');
      const existingObj = JSON.parse(existingContent) as Record<string, unknown>;
      const templateObj = JSON.parse(content) as Record<string, unknown>;
      const mergedObj = mergeJson(existingObj, templateObj);
      await writeFile(destPath, JSON.stringify(mergedObj, null, 2) + '\n');
      merged.push(relPath);
    } else {
      // Other existing files → skip
      skipped.push(relPath);
    }
  }

  return { created, merged, skipped };
}
