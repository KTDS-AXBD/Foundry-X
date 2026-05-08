import { noCrossDomainD1 } from './no-cross-domain-d1.mjs';
import { noCrossDomainImport } from './no-cross-domain-import.mjs';
import { noDirectRouteRegister } from './no-direct-route-register.mjs';
import { noTypesSchemaBarrel } from './no-types-schema-barrel.mjs';
import { useModelSsot } from './use-model-ssot.mjs';

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
