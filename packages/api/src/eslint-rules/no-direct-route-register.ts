// MSA 원칙: app.ts에서 /api/ 경로에 대한 직접 HTTP 메서드 등록 차단
// 필수 패턴: app.route('/api/{domain}', domainSubApp) 사용
import type { Rule } from 'eslint';

const DIRECT_HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'all']);

export const noDirectRouteRegister: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'In app.ts, disallow direct HTTP method registration on /api/ paths. Use app.route() to mount sub-apps from core/{domain}/routes/index.ts.',
    },
    messages: {
      noDirectRoute:
        'Direct route app.{{method}}("{{path}}", ...) is forbidden in app.ts. Use app.route("/api/{domain}", subApp) and define handlers in core/{domain}/routes/index.ts.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.endsWith('/src/app.ts') && !filename.endsWith('\\src\\app.ts')) return {};

    return {
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') return;
        if (node.callee.property.type !== 'Identifier') return;

        const method = node.callee.property.name;
        if (!DIRECT_HTTP_METHODS.has(method)) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ESLint AST node.arguments runtime type
        const firstArg = (node as any).arguments?.[0];
        if (!firstArg || firstArg.type !== 'Literal') return;
        if (typeof firstArg.value !== 'string') return;

        if (firstArg.value.startsWith('/api/')) {
          context.report({
            node,
            messageId: 'noDirectRoute',
            data: { method, path: firstArg.value },
          });
        }
      },
    };
  },
};
