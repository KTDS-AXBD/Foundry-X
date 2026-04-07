import type { HarnessEnv } from "@foundry-x/harness-kit";

/** Gate-X Workers 환경 바인딩 */
export interface GateEnv extends HarnessEnv {
  DB: D1Database;
  JWT_SECRET: string;
  CACHE?: KVNamespace;
  ANTHROPIC_API_KEY?: string;
  ENVIRONMENT?: string;
}
