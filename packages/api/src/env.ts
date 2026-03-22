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
  SENTRY_DSN?: string;
  // Google OAuth
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  // Sprint 26: Service Bindings
  DX_WORKER?: Fetcher;   // Discovery-X Worker
  AIF_WORKER?: Fetcher;  // AI Foundry Worker
  DX_API_URL?: string;   // 폴백: Discovery-X API URL
  AIF_API_URL?: string;  // 폴백: AI Foundry API URL
};
