import type { Rule } from "eslint";

export const noOrphanPlumbImport: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow PlumbBridge import outside of CLI package",
    },
    hasSuggestions: true,
    messages: {
      noOrphanImport: "PlumbBridge should only be imported within packages/cli. Use MCP or CLI subprocess instead.",
      useMcp: "Use MCP tool call or CLI subprocess for Plumb integration.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    // CLI 패키지 내부는 허용
    if (filename.includes("packages/cli/")) return {};

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source === "string" && (
          source.includes("plumb") ||
          source.includes("PlumbBridge")
        )) {
          context.report({
            node,
            messageId: "noOrphanImport",
            suggest: [{
              messageId: "useMcp",
              fix(fixer) {
                return fixer.replaceText(node, `/* TODO: use MCP instead */ ${context.sourceCode.getText(node)}`);
              },
            }],
          });
        }
      },
    };
  },
};
