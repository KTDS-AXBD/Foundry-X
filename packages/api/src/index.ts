import { app, handleScheduled } from "./app.js";
import { harnessRoute } from "./core/harness/routes/harness.js";
import { methodologyRoute } from "./core/offering/routes/methodology.js";
import { z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";

// ─── F126: Harness rules route (auth + tenant middleware from app.ts /api/* applies) ───
app.route("/api", harnessRoute);

// ─── F193+F194: Methodology management routes ───
app.route("/api", methodologyRoute);

// ─── F128: Global error handler — structured error responses ───
app.onError((err, c) => {
  if (err instanceof z.ZodError) {
    return c.json(
      {
        error: err.issues.map((i) => i.message).join(", "),
        errorCode: "VALIDATION_001",
        details: err.issues,
      },
      400,
    );
  }
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        errorCode: `HTTP_${err.status}`,
      },
      err.status,
    );
  }
  console.error("Unhandled error:", err);
  return c.json(
    {
      error: "Internal server error",
      errorCode: "INTERNAL_001",
    },
    500,
  );
});

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
