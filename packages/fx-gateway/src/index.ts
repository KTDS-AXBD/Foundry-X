// fx-gateway — API Gateway Worker (F517: FX-REQ-545)
// stub — Green Phase에서 완성됨
import app from "./app.js";
import type { GatewayEnv } from "./env.js";

export default {
  fetch: app.fetch.bind(app) as ExportedHandlerFetchHandler<GatewayEnv>,
} satisfies ExportedHandler<GatewayEnv>;
