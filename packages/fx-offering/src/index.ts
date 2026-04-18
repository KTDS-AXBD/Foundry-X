// fx-offering — Offering Domain Worker (F541: FX-REQ-580)
import app from "./app.js";
import type { OfferingEnv } from "./env.js";

export default {
  fetch: app.fetch.bind(app) as ExportedHandlerFetchHandler<OfferingEnv>,
} satisfies ExportedHandler<OfferingEnv>;
