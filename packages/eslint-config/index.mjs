import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

import { noCrossDomainD1 } from './rules/no-cross-domain-d1.mjs';
import { noCrossDomainImport } from './rules/no-cross-domain-import.mjs';
import { noDirectRouteRegister } from './rules/no-direct-route-register.mjs';
import { noTypesSchemaBarrel } from './rules/no-types-schema-barrel.mjs';
import { useModelSsot } from './rules/use-model-ssot.mjs';

export const foundryXApiPlugin = {
  meta: { name: 'eslint-plugin-foundry-x-api', version: '1.0.0' },
  rules: {
    'no-cross-domain-d1': noCrossDomainD1,
    'no-cross-domain-import': noCrossDomainImport,
    'no-direct-route-register': noDirectRouteRegister,
    'no-types-schema-barrel': noTypesSchemaBarrel,
    'use-model-ssot': useModelSsot,
  },
};

const commonRules = {
  '@typescript-eslint/no-unused-vars': ['error', {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
  }],
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/consistent-type-imports': 'error',
  'no-console': 'off',
  // S336: types.ts schemas barrel 차단 (순환 import → openapi.json 500 시한폭탄)
  'foundry-x-api/no-types-schema-barrel': 'error',
};

// 5 fx-* 공통 base preset
export const baseConfig = (...overrides) => tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'foundry-x-api': foundryXApiPlugin },
    rules: commonRules,
  },
  {
    ignores: ['dist/', 'node_modules/', '**/*.test.ts'],
  },
  ...overrides,
);

// packages/api 전용 preset (baseConfig + 4 추가 rule + azure.ts ignore)
export const apiConfig = (...overrides) => tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'foundry-x-api': foundryXApiPlugin },
    rules: {
      ...commonRules,
      // MSA 원칙 룰 — core/{domain}/ 신규 파일에만 의도적으로 적용
      'foundry-x-api/no-cross-domain-import': 'error',
      'foundry-x-api/no-direct-route-register': 'error',
      // C71: 하드코딩 모델 ID 차단 — @foundry-x/shared/model-defaults SSOT 강제
      'foundry-x-api/use-model-ssot': 'error',
      // C75: D1 크로스도메인 테이블 접근 차단 (forward-only)
      'foundry-x-api/no-cross-domain-d1': 'warn',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '**/*.test.ts', 'src/azure.ts'],
  },
  ...overrides,
);
