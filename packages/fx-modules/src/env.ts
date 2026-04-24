/** fx-modules Workers 환경 바인딩 (F572: FX-REQ-615) */
export interface ModulesEnv {
  DB: D1Database;
  JWT_SECRET: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  ANTHROPIC_API_KEY?: string;
  WEBHOOK_SECRET?: string;
  AI?: Ai;
}

// Alias for portal/gate/launch route compatibility (originally from packages/api/src/env.ts)
export type Env = ModulesEnv;
