/** fx-offering Workers 환경 바인딩 (F541: FX-REQ-580) */
export interface OfferingEnv {
  DB: D1Database;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY?: string;
  /** R2 — offering prototype HTML 서빙 */
  FILES_BUCKET: R2Bucket;
  /** Workers AI — bdp ProposalGenerator */
  AI: Ai;
  /** KV Cache (선택, rate limiting 용도) */
  CACHE?: KVNamespace;
}
