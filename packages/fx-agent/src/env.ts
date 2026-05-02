/** fx-agent Workers 환경 바인딩 (F571: FX-REQ-614) */
export interface AgentEnv {
  DB: D1Database;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  /** Service Binding — Phase 46 잔여 cross-domain 호출 대비 (현재 unused) */
  MAIN_API: Fetcher;
}
