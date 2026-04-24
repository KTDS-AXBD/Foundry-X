// fx-modules — Portal/Gate/Launch Domain Worker (F572: FX-REQ-615)
import app from "./app.js";
import type { ModulesEnv } from "./env.js";

export default {
  fetch: app.fetch.bind(app) as ExportedHandlerFetchHandler<ModulesEnv>,
} satisfies ExportedHandler<ModulesEnv>;
