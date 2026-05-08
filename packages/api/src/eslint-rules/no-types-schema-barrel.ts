import type { Rule } from 'eslint';

// S336: types.ts 에서 schemas barrel re-export 차단
//
// 안티패턴:
//   core/{domain}/types.ts:
//     export const FOO_TYPES = [...] as const;            // ① const enum 배열
//     export * from "./schemas/{domain}.js";              // ② schemas barrel
//   core/{domain}/schemas/{domain}.ts:
//     import { FOO_TYPES } from "../types.js";            // ③ const import
//     z.enum(FOO_TYPES)                                   // ④ enum 사용
//
// 평가 순서가 우연히 schemas → types 로 들어가면 ② 재진입 시점에 ① 가 아직 평가 전 →
// FOO_TYPES = undefined → z.enum(undefined) → ZodEnum._def.values=undefined →
// OpenAPI 스펙 생성 시 `joinValues(undefined).map(...)` TypeError → /api/openapi.json HTTP 500.
//
// 실제 사례 (S336):
//   - F628 entity 도메인이 14 sprint silent fail 끝에 production 500 surface
//   - 같은 시한폭탄 6 도메인 (policy/ethics/diagnostic/asset/cq/cross-org) 사전 발견
//
// Fix: schemas 는 항상 호출자가 "./schemas/{file}" 에서 직접 import (barrel re-export 금지).

const SCHEMAS_PATH_RE = /^\.\/schemas(\/|$)/;

export const noTypesSchemaBarrel: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'In core/**/types.ts, disallow `export * from "./schemas/..."`. Such barrel re-export creates a circular dependency with schemas/ files that import const arrays from types.ts (z.enum(undefined) at module evaluation time → /api/openapi.json HTTP 500).',
    },
    messages: {
      noBarrel:
        'types.ts 에서 `export * from "{{source}}"` 금지: schemas 가 types.ts 의 const 를 import 하면 순환 import → 평가 시점에 const=undefined → z.enum(undefined) → /api/openapi.json HTTP 500 위험 (S336 entity 선례). schemas 는 호출자가 "./schemas/{file}" 에서 직접 import.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    // types.ts 파일에만 적용 (Windows 경로 호환)
    if (!filename.endsWith('/types.ts') && !filename.endsWith('\\types.ts')) return {};

    return {
      ExportAllDeclaration(node) {
        const source = node.source && typeof node.source.value === 'string' ? node.source.value : '';
        // ./schemas 또는 ./schemas/... 만 차단
        if (!SCHEMAS_PATH_RE.test(source)) return;
        context.report({
          node,
          messageId: 'noBarrel',
          data: { source },
        });
      },
    };
  },
};
