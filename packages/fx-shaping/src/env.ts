/** fx-shaping Workers 환경 바인딩 (F540: FX-REQ-579) */
export interface ShapingEnv {
  DB: D1Database;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY?: string;
  /** KV Cache — rate limiting (ax-bd-agent, ax-bd-persona-eval) */
  CACHE: KVNamespace;
  /** R2 — prototype HTML 서빙 (ax-bd-prototypes) */
  FILES_BUCKET: R2Bucket;
  /** Marker.io 피드백 위젯 (ax-bd-prototypes, optional) */
  MARKER_PROJECT_ID?: string;
}
