import { noDirectDbInRoute } from "./no-direct-db-in-route.mjs";
import { requireZodSchema } from "./require-zod-schema.mjs";
import { noOrphanPlumbImport } from "./no-orphan-plumb-import.mjs";

export const foundryXPlugin = {
  meta: { name: "eslint-plugin-foundry-x", version: "1.0.0" },
  rules: {
    "no-direct-db-in-route": noDirectDbInRoute,
    "require-zod-schema": requireZodSchema,
    "no-orphan-plumb-import": noOrphanPlumbImport,
  },
};
