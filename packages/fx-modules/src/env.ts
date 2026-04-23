/** fx-modules Workers 환경 바인딩 (F572: FX-REQ-615) */
export interface ModulesEnv {
  DB: D1Database;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY?: string;
  GITHUB_TOKEN?: string;
}
