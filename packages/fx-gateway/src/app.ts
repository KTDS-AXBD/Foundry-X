// stub — Green Phase에서 구현됨
import { Hono } from "hono";
import type { GatewayEnv } from "./env.js";

const app = new Hono<{ Bindings: GatewayEnv }>();

export default app;
