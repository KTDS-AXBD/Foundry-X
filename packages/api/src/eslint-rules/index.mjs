import { noCrossDomainImport } from './no-cross-domain-import.mjs';
import { noDirectRouteRegister } from './no-direct-route-register.mjs';

export const foundryXApiPlugin = {
  meta: { name: 'eslint-plugin-foundry-x-api', version: '1.0.0' },
  rules: {
    'no-cross-domain-import': noCrossDomainImport,
    'no-direct-route-register': noDirectRouteRegister,
  },
};
