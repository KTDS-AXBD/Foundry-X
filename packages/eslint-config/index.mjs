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
