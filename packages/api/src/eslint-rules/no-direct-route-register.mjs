// MSA 원칙: app.ts에서 /api/ 경로에 대한 직접 HTTP 메서드 등록 차단
// 필수 패턴: app.route('/api/{domain}', domainSubApp) 사용
const DIRECT_HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'all']);

export const noDirectRouteRegister = {
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
    // src/app.ts 파일에만 적용
    if (!filename.endsWith('/src/app.ts') && !filename.endsWith('\\src\\app.ts')) return {};

    return {
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') return;
        if (node.callee.property.type !== 'Identifier') return;

        const method = node.callee.property.name;
        if (!DIRECT_HTTP_METHODS.has(method)) return;

        const firstArg = node.arguments[0];
        if (!firstArg || firstArg.type !== 'Literal') return;
        if (typeof firstArg.value !== 'string') return;

        // /api/ 경로에 대한 직접 등록만 차단 (/, /api/openapi.json 등은 허용)
        if (firstArg.value.startsWith('/api/')) {
          context.report({
            node,
            messageId: 'noDirectRoute',
            data: {
              method,
              path: firstArg.value,
            },
          });
        }
      },
    };
  },
};
