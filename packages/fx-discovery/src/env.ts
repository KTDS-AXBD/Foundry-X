/** fx-discovery Workers 환경 바인딩 (F518: FX-REQ-546) */
export interface DiscoveryEnv {
  DB: D1Database;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY?: string;
}
