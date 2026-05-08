// S336 no-types-schema-barrel ESLint 룰 단위 테스트
// ESLint v9+ RuleTester는 전역 describe/it을 감지하여 개별 테스트를 등록함
import { RuleTester } from 'eslint';
import { describe } from 'vitest';
import { noTypesSchemaBarrel } from './no-types-schema-barrel.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('S336 foundry-x-api/no-types-schema-barrel', () => {
  ruleTester.run('no-types-schema-barrel', noTypesSchemaBarrel, {
    valid: [
      // types.ts 가 아닌 파일은 검사 대상 외
      {
        code: 'export * from "./schemas/foo.js";',
        filename: '/project/src/index.ts',
      },
      {
        code: 'export * from "./schemas/foo.js";',
        filename: '/project/src/core/discovery/routes/biz-items.ts',
      },
      // types.ts 지만 schemas 가 아닌 다른 경로의 barrel 은 허용
      {
        code: 'export * from "./services/registry.js";',
        filename: '/project/src/core/entity/types.ts',
      },
      {
        code: 'export * from "../shared.js";',
        filename: '/project/src/core/entity/types.ts',
      },
      // types.ts 에서 const 만 export — 안전
      {
        code: 'export const FOO_TYPES = ["a", "b"];',
        filename: '/project/src/core/entity/types.ts',
      },
      // types.ts 에서 명시적 named import (barrel 아님)
      {
        code: 'export { FooSchema } from "./schemas/foo.js";',
        filename: '/project/src/core/entity/types.ts',
      },
    ],
    invalid: [
      // 정확한 안티패턴 — types.ts 에서 ./schemas barrel
      {
        code: 'export * from "./schemas/entity.js";',
        filename: '/project/src/core/entity/types.ts',
        errors: [{ messageId: 'noBarrel' }],
      },
      {
        code: 'export * from "./schemas/policy.js";',
        filename: '/project/src/core/policy/types.ts',
        errors: [{ messageId: 'noBarrel' }],
      },
      // 확장자 없는 형태도 차단
      {
        code: 'export * from "./schemas/foo";',
        filename: '/project/src/core/asset/types.ts',
        errors: [{ messageId: 'noBarrel' }],
      },
      // 하위 디렉토리도 차단 (./schemas/sub/bar)
      {
        code: 'export * from "./schemas/sub/bar.js";',
        filename: '/project/src/core/cq/types.ts',
        errors: [{ messageId: 'noBarrel' }],
      },
      // 다른 export 와 섞여 있어도 ./schemas barrel 만 정확히 잡음
      {
        code: [
          'export const FOO = [];',
          'export { Service } from "./services/foo.js";',
          'export * from "./schemas/foo.js";',
        ].join('\n'),
        filename: '/project/src/core/entity/types.ts',
        errors: [{ messageId: 'noBarrel' }],
      },
    ],
  });
});
