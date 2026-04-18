// C71 use-model-ssot ESLint 룰 단위 테스트 (TDD Red phase)
// ESLint v9+ RuleTester는 전역 describe/it을 감지하여 개별 테스트를 등록함 — run()을 describe() 안에서 직접 호출
import { RuleTester } from 'eslint';
import { describe } from 'vitest';
import { useModelSsot } from './use-model-ssot.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('C71 foundry-x-api/use-model-ssot', () => {
  ruleTester.run('use-model-ssot', useModelSsot, {
    valid: [
      // SSOT 상수 참조 — 문자열 리터럴 아님
      { code: 'const m = MODEL_SONNET;' },
      { code: 'const m = MODEL_HAIKU;' },
      { code: 'const m = OR_MODEL_SONNET;' },
      // 관련 없는 문자열
      { code: 'const s = "hello world";' },
      { code: 'const s = "claude";' },
      { code: 'const s = "claude-sonnet";' },
      // __tests__/ 경로 면제
      {
        code: 'const m = "claude-sonnet-4-6";',
        filename: '/project/src/__tests__/foo.test.ts',
      },
      {
        code: 'const m = "claude-haiku-4-5";',
        filename: '/project/packages/api/src/__tests__/service.test.ts',
      },
      // archive/ 경로 면제
      {
        code: 'const m = "claude-sonnet-4-6";',
        filename: '/project/archive/old-service.ts',
      },
      // e2e/fixtures/ 경로 면제
      {
        code: 'const m = "claude-haiku-4-5";',
        filename: '/project/packages/web/e2e/fixtures/mock.ts',
      },
    ],
    invalid: [
      // Direct Anthropic API 리터럴
      {
        code: 'const m = "claude-sonnet-4-6";',
        errors: [{ messageId: 'useModelSsot' }],
      },
      {
        code: 'const m = "claude-haiku-4-5";',
        errors: [{ messageId: 'useModelSsot' }],
      },
      // 날짜 suffix 포함 (claude-haiku-4-5-20251001)
      {
        code: 'const m = "claude-haiku-4-5-20251001";',
        errors: [{ messageId: 'useModelSsot' }],
      },
      // OpenRouter 경로 prefix 포함
      {
        code: 'const m = "anthropic/claude-sonnet-4-6";',
        errors: [{ messageId: 'useModelSsot' }],
      },
      // opus 포함
      {
        code: 'const m = "claude-opus-4-7";',
        errors: [{ messageId: 'useModelSsot' }],
      },
      // 객체 값에 포함된 경우
      {
        code: 'const config = { model: "claude-sonnet-4-6" };',
        errors: [{ messageId: 'useModelSsot' }],
      },
      // 함수 인자로 전달
      {
        code: 'fetch(url, { body: JSON.stringify({ model: "claude-haiku-4-5" }) });',
        errors: [{ messageId: 'useModelSsot' }],
      },
    ],
  });
});
