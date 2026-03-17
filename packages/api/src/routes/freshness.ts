import { Hono } from "hono";
import type { FreshnessReport } from "@foundry-x/shared";
import {
  readJsonFile,
  foundryXPath,
  MOCK_FRESHNESS,
} from "../services/data-reader.js";

export const freshnessRoute = new Hono();

freshnessRoute.get("/freshness", async (c) => {
  const data = await readJsonFile<FreshnessReport>(
    foundryXPath("freshness.json"),
    MOCK_FRESHNESS,
  );
  return c.json(data);
});
