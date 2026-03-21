import { noDirectDbInRoute } from "./no-direct-db-in-route.js";
import { requireZodSchema } from "./require-zod-schema.js";
import { noOrphanPlumbImport } from "./no-orphan-plumb-import.js";

export const foundryXPlugin = {
  meta: { name: "eslint-plugin-foundry-x", version: "1.0.0" },
  rules: {
    "no-direct-db-in-route": noDirectDbInRoute,
    "require-zod-schema": requireZodSchema,
    "no-orphan-plumb-import": noOrphanPlumbImport,
  },
};
