import type { Rule } from "eslint";

export const noDirectDbInRoute: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct D1 database access in route handlers",
    },
    hasSuggestions: true,
    messages: {
      noDirectDb: "Route handler should not access D1 directly. Use a service method instead.",
      useService: "Extract database call to a service method.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes("/routes/")) return {};

    return {
      MemberExpression(node) {
        // c.env.DB 패턴 감지
        if (
          node.object.type === "MemberExpression" &&
          node.object.property.type === "Identifier" &&
          node.object.property.name === "env" &&
          node.property.type === "Identifier" &&
          node.property.name === "DB"
        ) {
          context.report({
            node,
            messageId: "noDirectDb",
            suggest: [{
              messageId: "useService",
              fix(fixer) {
                const text = context.sourceCode.getText(node);
                return fixer.replaceText(node, `/* TODO: use service */ ${text}`);
              },
            }],
          });
        }
      },
      CallExpression(node) {
        // db.prepare() 패턴 감지
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "prepare"
        ) {
          context.report({
            node,
            messageId: "noDirectDb",
            suggest: [{
              messageId: "useService",
              fix(fixer) {
                const text = context.sourceCode.getText(node);
                return fixer.replaceText(node, `/* TODO: use service */ ${text}`);
              },
            }],
          });
        }
      },
    };
  },
};
