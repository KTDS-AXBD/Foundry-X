import { Hono } from "hono";
import type { FoundryXConfig } from "@foundry-x/shared";
import {
  readJsonFile,
  foundryXPath,
  MOCK_PROFILE,
} from "../services/data-reader.js";

export const profileRoute = new Hono();

profileRoute.get("/profile", async (c) => {
  const config = await readJsonFile<FoundryXConfig | null>(
    foundryXPath("config.json"),
    null,
  );
  const profile = config?.repoProfile ?? MOCK_PROFILE;
  return c.json(profile);
});
