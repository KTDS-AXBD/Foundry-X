import app from "./app.js";
import { ogdQueueWorker } from "./workers/ogd-queue-worker.js";
import type { OgdQueueMessage } from "./workers/ogd-queue-worker.js";
import type { GateEnv } from "./env.js";

// Durable Object — named export 필수 (Cloudflare Workers 요구사항)
export { OgdCoordinator } from "./durable-objects/ogd-coordinator.js";

export default {
  fetch: app.fetch.bind(app) as ExportedHandlerFetchHandler<GateEnv>,
  queue: ogdQueueWorker.queue,
} satisfies ExportedHandler<GateEnv, OgdQueueMessage>;
