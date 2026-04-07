import type { GitHubService } from "../../../modules/portal/services/github.js";

export interface FileContext {
  path: string;
  content: string;
  imports: string[];
  lineCount: number;
  depth: number;
  truncated: boolean;
}

export interface CollectorOptions {
  maxDepth: number;
  tokenBudget: number;
  maxFileLines: number;
}

export interface CollectorResult {
  files: FileContext[];
  totalTokens: number;
  truncated: boolean;
  skippedFiles: string[];
}

const DEFAULT_OPTIONS: CollectorOptions = {
  maxDepth: 1,
  tokenBudget: 50_000,
  maxFileLines: 500,
};

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 3;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n// ... (truncated)";
}

export function parseImports(content: string): string[] {
  const results = new Set<string>();
  const importRe = /import\s+(?:[\w{},\s*]+\s+from\s+)?["']([^"']+)["']/g;
  const requireRe = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
  const reExportRe = /export\s+(?:\{[^}]*\}|\*)\s+from\s+["']([^"']+)["']/g;
  for (const re of [importRe, requireRe, reExportRe]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const spec = m[1];
      if (spec && (spec.startsWith("./") || spec.startsWith("../"))) results.add(spec);
    }
  }
  return [...results];
}

export function resolveImportPath(fromFile: string, importPath: string): string {
  const dir = fromFile.replace(/\/[^/]+$/, "");
  const parts = `${dir}/${importPath}`.split("/");
  const resolved: string[] = [];
  for (const p of parts) {
    if (p === "..") resolved.pop();
    else if (p !== ".") resolved.push(p);
  }
  let result = resolved.join("/");
  if (result.endsWith(".js")) result = result.slice(0, -3) + ".ts";
  if (!/\.\w+$/.test(result)) result += ".ts";
  return result;
}

export class FileContextCollector {
  private options: CollectorOptions;
  constructor(private github: GitHubService | null, options?: Partial<CollectorOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async collect(
    repo: string, branch: string, targetFiles: string[],
    clientFileContents?: Record<string, string>,
  ): Promise<CollectorResult> {
    const visited = new Set<string>();
    const fileContexts: FileContext[] = [];
    const skippedFiles: string[] = [];

    for (const filePath of targetFiles) {
      if (visited.has(filePath)) continue;
      visited.add(filePath);
      const content = await this.getContent(filePath, repo, branch, clientFileContents);
      if (content === null) { skippedFiles.push(filePath); continue; }
      const lines = content.split("\n");
      const truncContent = lines.length > this.options.maxFileLines
        ? lines.slice(0, this.options.maxFileLines).join("\n") + "\n// ... (truncated)" : content;
      fileContexts.push({
        path: filePath, content: truncContent, imports: parseImports(content),
        lineCount: lines.length, depth: 0, truncated: lines.length > this.options.maxFileLines,
      });
    }

    if (this.options.maxDepth >= 1) {
      const importPaths = new Set<string>();
      for (const fc of fileContexts) {
        for (const imp of fc.imports) {
          const resolved = resolveImportPath(fc.path, imp);
          if (!visited.has(resolved)) importPaths.add(resolved);
        }
      }
      for (const importPath of importPaths) {
        if (visited.has(importPath)) continue;
        visited.add(importPath);
        const content = await this.getContent(importPath, repo, branch, clientFileContents);
        if (content === null) { skippedFiles.push(importPath); continue; }
        const lines = content.split("\n");
        const truncContent = lines.length > this.options.maxFileLines
          ? lines.slice(0, this.options.maxFileLines).join("\n") + "\n// ... (truncated)" : content;
        fileContexts.push({
          path: importPath, content: truncContent, imports: parseImports(content),
          lineCount: lines.length, depth: 1, truncated: lines.length > this.options.maxFileLines,
        });
      }
    }

    fileContexts.sort((a, b) => a.depth !== b.depth ? a.depth - b.depth : a.lineCount - b.lineCount);
    let totalTokens = 0;
    let truncated = false;
    const finalFiles: FileContext[] = [];
    for (const fc of fileContexts) {
      const tokens = estimateTokens(fc.content);
      if (totalTokens + tokens <= this.options.tokenBudget) {
        totalTokens += tokens; finalFiles.push(fc);
      } else {
        const remaining = this.options.tokenBudget - totalTokens;
        if (remaining > 100) {
          const trunc = truncateToTokens(fc.content, remaining);
          totalTokens += estimateTokens(trunc);
          finalFiles.push({ ...fc, content: trunc, truncated: true });
        } else { skippedFiles.push(fc.path); }
        truncated = true;
      }
    }
    return { files: finalFiles, totalTokens, truncated, skippedFiles };
  }

  private async getContent(
    filePath: string, repo: string, branch: string,
    clientFileContents?: Record<string, string>,
  ): Promise<string | null> {
    if (clientFileContents?.[filePath] !== undefined) return clientFileContents[filePath];
    if (!this.github) return null;
    return this.github.getFileContentRaw(repo, filePath, branch);
  }
}
