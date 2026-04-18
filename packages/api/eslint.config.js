import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { foundryXApiPlugin } from './src/eslint-rules/index.mjs';

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
      // MSA 원칙 룰 — core/{domain}/ 신규 파일에만 의도적으로 적용
      'foundry-x-api/no-cross-domain-import': 'error',
      'foundry-x-api/no-direct-route-register': 'error',
      // C71: 하드코딩 모델 ID 차단 — @foundry-x/shared/model-defaults SSOT 강제
      'foundry-x-api/use-model-ssot': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '**/*.test.ts', 'src/azure.ts'],
  },
);
