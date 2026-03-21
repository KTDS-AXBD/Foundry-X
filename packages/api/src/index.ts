import { app, handleScheduled } from "./app.js";

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};

export type { Env } from "./env.js";

// ── Local dev (node-server) ────────────────────
// import { serve } from "@hono/node-server";
// const port = 3001;
// serve({ fetch: app.fetch, port }, (info) => {
//   console.log(`Foundry-X API running on http://localhost:${info.port}`);
// });
