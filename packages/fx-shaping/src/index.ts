// fx-shaping — Shaping Domain Worker (F540: FX-REQ-579)
import app from "./app.js";
import type { ShapingEnv } from "./env.js";

export default {
  fetch: app.fetch.bind(app) as ExportedHandlerFetchHandler<ShapingEnv>,
} satisfies ExportedHandler<ShapingEnv>;
