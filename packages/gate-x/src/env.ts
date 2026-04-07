import type { HarnessEnv } from "@foundry-x/harness-kit";
import type { OgdQueueMessage } from "./workers/ogd-queue-worker.js";

/** Gate-X Workers 환경 바인딩 */
export interface GateEnv extends HarnessEnv {
  DB: D1Database;
  JWT_SECRET: string;
  CACHE?: KVNamespace;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  LLM_PROVIDER_ORDER?: string;
  ENVIRONMENT?: string;
  /** Cloudflare Queue — O-G-D 파이프라인 비동기 처리 (F404 PoC) */
  OGD_QUEUE: Queue<OgdQueueMessage>;
  /** Durable Object — O-G-D job 상태 관리 (F404 PoC) */
  OGD_COORDINATOR: DurableObjectNamespace;
}
