import { noCrossDomainImport } from './no-cross-domain-import.js';
import { noDirectRouteRegister } from './no-direct-route-register.js';
import { useModelSsot } from './use-model-ssot.js';

export const foundryXApiPlugin = {
  meta: { name: 'eslint-plugin-foundry-x-api', version: '1.0.0' },
  rules: {
    'no-cross-domain-import': noCrossDomainImport,
    'no-direct-route-register': noDirectRouteRegister,
    'use-model-ssot': useModelSsot,
  },
};
