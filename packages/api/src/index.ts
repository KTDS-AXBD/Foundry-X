import { serve } from "@hono/node-server";
import { app } from "./app.js";

const port = 3001;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Foundry-X API running on http://localhost:${info.port}`);
});

export { app };
