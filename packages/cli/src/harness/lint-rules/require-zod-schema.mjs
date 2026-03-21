

export const requireZodSchema = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require Zod schema validation for request body parsing in routes",
    },
    hasSuggestions: true,
    messages: {
      requireZod: "Use Zod schema to validate request body: `schema.parse(await c.req.json())`",
      addZodParse: "Wrap with schema.parse()",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes("/routes/")) return {};

    return {
      CallExpression(node) {
        // c.req.json() 패턴 감지
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "json" &&
          node.callee.object.type === "MemberExpression" &&
          node.callee.object.property.type === "Identifier" &&
          node.callee.object.property.name === "req"
        ) {
          // 부모가 이미 schema.parse() 래핑인지 확인
          const parent = node.parent;
          if (
            parent?.type === "CallExpression" &&
            parent.callee?.type === "MemberExpression" &&
            parent.callee.property?.name === "parse"
          ) {
            return; // 이미 검증됨
          }

          context.report({
            node,
            messageId: "requireZod",
            suggest: [{
              messageId: "addZodParse",
              fix(fixer) {
                const text = context.sourceCode.getText(node);
                return fixer.replaceText(node, `schema.parse(${text})`);
              },
            }],
          });
        }
      },
    };
  },
};
