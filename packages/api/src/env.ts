export type Env = {
  DB: D1Database;
  GITHUB_TOKEN: string;
  JWT_SECRET: string;
  GITHUB_REPO: string;
  // Sprint 8 신규
  CACHE: KVNamespace;
  AI: Ai;
  ANTHROPIC_API_KEY?: string;
  WEBHOOK_SECRET?: string;
};
