import type { Rule } from 'eslint';

// claude-(sonnet|haiku|opus)-N-N (날짜 suffix 포함) 또는 anthropic/ prefix 포함
const MODEL_LITERAL_RE = /claude-(sonnet|haiku|opus)-\d+-\d+/;

const EXEMPT_PATH_SEGMENTS = ['/__tests__/', '/e2e/fixtures/', '/archive/'];

function isExemptPath(filename: string): boolean {
  return EXEMPT_PATH_SEGMENTS.some((seg) => filename.includes(seg));
}

export const useModelSsot: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow hardcoded Claude model ID literals. Use MODEL_SONNET / MODEL_HAIKU / OR_MODEL_SONNET / OR_MODEL_HAIKU from @foundry-x/shared/model-defaults.',
    },
    messages: {
      useModelSsot:
        'Hardcoded model ID "{{value}}" is forbidden. Import MODEL_SONNET / MODEL_HAIKU / OR_MODEL_SONNET / OR_MODEL_HAIKU from @foundry-x/shared/model-defaults instead.',
    },
    schema: [],
  },
  create(context) {
    if (isExemptPath(context.filename)) return {};

    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        if (MODEL_LITERAL_RE.test(node.value)) {
          context.report({
            node,
            messageId: 'useModelSsot',
            data: { value: node.value },
          });
        }
      },
    };
  },
};
