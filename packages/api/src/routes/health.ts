import { Hono } from "hono";
import { MOCK_HEALTH } from "../services/data-reader.js";

export const healthRoute = new Hono();

healthRoute.get("/health", (c) => {
  return c.json(MOCK_HEALTH);
});
