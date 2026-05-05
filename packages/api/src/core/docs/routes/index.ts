import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import type { Env } from "../../../env.js";

export const docsApp = new Hono<{ Bindings: Env }>();
docsApp.get("/", swaggerUI({ url: "/api/openapi.json" }));
