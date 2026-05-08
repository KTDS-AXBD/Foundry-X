import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
// S336 → F633: foundry-x-api 플러그인 (workspace 패키지로 격상)
import { foundryXApiPlugin } from '@foundry-x/eslint-config';

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
