import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
// S336: foundry-x-api 플러그인의 no-types-schema-barrel 룰 공유 (모노리포 상대경로)
import { foundryXApiPlugin } from '../api/src/eslint-rules/index.mjs';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'foundry-x-api': foundryXApiPlugin },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off',
      // S336: types.ts 의 schemas barrel re-export 차단 (순환 import → openapi.json 500 시한폭탄)
      'foundry-x-api/no-types-schema-barrel': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '**/*.test.ts'],
  },
);
