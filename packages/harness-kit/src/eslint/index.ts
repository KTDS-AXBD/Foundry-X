import { noCrossServiceImport } from "./no-cross-service-import.js";

export const harnessKitPlugin = {
  meta: { name: "eslint-plugin-harness-kit", version: "0.1.0" },
  rules: {
    "no-cross-service-import": noCrossServiceImport,
  },
};
