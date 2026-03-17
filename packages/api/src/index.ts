import { app } from "./app.js";

export default app;

export type Env = {
  DB: D1Database;
  GITHUB_TOKEN: string;
  JWT_SECRET: string;
  GITHUB_REPO: string;
};

// ── Local dev (node-server) ────────────────────
// import { serve } from "@hono/node-server";
// const port = 3001;
// serve({ fetch: app.fetch, port }, (info) => {
//   console.log(`Foundry-X API running on http://localhost:${info.port}`);
// });
