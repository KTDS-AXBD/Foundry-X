// MSA 원칙: core/{domain}/ 파일에서 다른 도메인 내부 직접 import 차단
// 예외: 상대방 도메인의 types.ts (contract 파일)만 허용
import path from 'path';

function getDomainFromPath(filepath) {
  const match = filepath.match(/\/core\/([^/]+)\//);
  return match ? match[1] : null;
}

function isTypesContractFile(importSource) {
  // types.ts, types.js, types (확장자 없음) 형태만 허용
  const basename = path.basename(importSource, '.ts').replace(/\.js$/, '');
  return basename === 'types';
}

export const noCrossDomainImport = {
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
        const importSource = node.source.value;
        // 상대 경로 import만 검사 (절대 경로/패키지는 제외)
        if (!importSource.startsWith('.')) return;

        // 상대 경로를 절대 경로로 변환하여 도메인 추출
        const resolvedPath = path.resolve(path.dirname(filename), importSource);
        const targetDomain = getDomainFromPath(resolvedPath);

        // core 도메인 import가 아니거나 같은 도메인이면 통과
        if (!targetDomain || targetDomain === currentDomain) return;

        // contract(types) 파일은 예외 허용
        if (isTypesContractFile(importSource)) return;

        context.report({
          node,
          messageId: 'noCrossDomainImport',
          data: {
            source: currentDomain,
            target: targetDomain,
          },
        });
      },
    };
  },
};
