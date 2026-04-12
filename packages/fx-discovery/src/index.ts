// fx-discovery — Discovery Domain Worker (F518: FX-REQ-546)
import app from "./app.js";
import type { DiscoveryEnv } from "./env.js";

export default {
  fetch: app.fetch.bind(app) as ExportedHandlerFetchHandler<DiscoveryEnv>,
} satisfies ExportedHandler<DiscoveryEnv>;
