// stub — Green Phase에서 health endpoint 추가됨
import { Hono } from "hono";
import type { DiscoveryEnv } from "./env.js";

const app = new Hono<{ Bindings: DiscoveryEnv }>();

export default app;
