import { Hono } from "hono";
import type { HarnessIntegrity } from "@foundry-x/shared";
import {
  readJsonFile,
  foundryXPath,
  MOCK_INTEGRITY,
} from "../services/data-reader.js";

export const integrityRoute = new Hono();

integrityRoute.get("/integrity", async (c) => {
  const data = await readJsonFile<HarnessIntegrity>(
    foundryXPath("integrity.json"),
    MOCK_INTEGRITY,
  );
  return c.json(data);
});
