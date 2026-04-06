// Sprint 181 F396 — Foundry-X 모듈 경계 제한 ESLint 룰
// Design §7: 모듈 간 직접 import 금지, shared/ 경유만 허용

const MODULE_BOUNDARIES: Record<string, string[]> = {
  "core/discovery": ["core/shaping", "shared"],
  "core/shaping": ["core/discovery", "shared"],
  "modules/auth": ["shared", "modules/portal"],
  "modules/portal": ["shared", "modules/auth"],
  "modules/gate": ["shared"],
  "modules/launch": ["shared"],
  "modules/infra": ["shared"],
};

export interface RuleContext {
  filename: string;
  options: Array<{ boundaries?: Record<string, string[]> }>;
  report: (descriptor: {
    node: unknown;
    messageId: string;
    data: Record<string, string>;
  }) => void;
}

export interface ImportNode {
  source: { value: string };
}

export const noCrossModuleImport = {
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow cross-module imports between Foundry-X module boundaries",
    },
    messages: {
      noCrossImport:
        'Module "{{source}}" cannot import from "{{target}}". Allowed: {{allowed}}.',
    },
    schema: [
      {
        type: "object" as const,
        properties: {
          boundaries: { type: "object" as const },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context: RuleContext) {
    const boundaries = context.options[0]?.boundaries ?? MODULE_BOUNDARIES;
    const filename = context.filename;

    const sourceModule = Object.keys(boundaries).find((mod) =>
      filename.includes(`/${mod}/`),
    );
    if (!sourceModule) return {};

    const allowedTargets = boundaries[sourceModule] ?? [];

    return {
      ImportDeclaration(node: ImportNode) {
        const importPath = node.source.value;
        if (!importPath.startsWith(".") && !importPath.startsWith("/")) return;

        for (const mod of Object.keys(boundaries)) {
          if (mod === sourceModule) continue;
          if (
            importPath.includes(`/${mod}/`) ||
            importPath.includes(`../${mod}`)
          ) {
            if (!allowedTargets.includes(mod)) {
              context.report({
                node,
                messageId: "noCrossImport",
                data: {
                  source: sourceModule,
                  target: mod,
                  allowed: allowedTargets.join(", "),
                },
              });
            }
          }
        }
      },
    };
  },
};
