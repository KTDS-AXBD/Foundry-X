import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { foundryXPlugin } from './src/harness/lint-rules/index.mjs';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'foundry-x': foundryXPlugin },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off',
      'foundry-x/no-direct-db-in-route': 'error',
      'foundry-x/require-zod-schema': 'warn',
      'foundry-x/no-orphan-plumb-import': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '**/*.test.ts'],
  },
);
