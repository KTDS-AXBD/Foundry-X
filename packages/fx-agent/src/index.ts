// fx-agent — Agent Domain Worker (F571: FX-REQ-614)
import app from "./app.js";
import type { AgentEnv } from "./env.js";

export default {
  fetch: app.fetch.bind(app) as ExportedHandlerFetchHandler<AgentEnv>,
} satisfies ExportedHandler<AgentEnv>;
