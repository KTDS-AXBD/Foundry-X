// MSA 원칙: core/{domain}/ 파일에서 다른 도메인 내부 직접 import 차단
// 예외: 상대방 도메인의 types.ts (contract 파일)만 허용
import path from 'node:path';
import type { Rule } from 'eslint';

function getDomainFromPath(filepath: string): string | null {
  const match = filepath.match(/\/core\/([^/]+)\//);
  return match?.[1] ?? null;
}

function isTypesContractFile(importSource: string): boolean {
  const basename = path.basename(importSource, '.ts').replace(/\.js$/, '');
  return basename === 'types';
}

export const noCrossDomainImport: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow cross-domain imports between MSA core domains. Only contract files (types.ts) may be imported from another domain.',
    },
    messages: {
      noCrossDomainImport:
        'Domain "{{source}}" cannot import from domain "{{target}}" internals. Use only {{target}}/types.ts (contract) imports across domain boundaries.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    const currentDomain = getDomainFromPath(filename);
    if (!currentDomain) return {};

    return {
      ImportDeclaration(node) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ESLint AST import source
        const importSource = (node as any).source?.value as string | undefined;
        if (typeof importSource !== 'string') return;
        if (!importSource.startsWith('.')) return;

        const resolvedPath = path.resolve(path.dirname(filename), importSource);
        const targetDomain = getDomainFromPath(resolvedPath);

        if (!targetDomain || targetDomain === currentDomain) return;
        if (isTypesContractFile(importSource)) return;

        context.report({
          node,
          messageId: 'noCrossDomainImport',
          data: { source: currentDomain, target: targetDomain },
        });
      },
    };
  },
};
