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
  // Sprint 34: OpenRouter
  OPENROUTER_API_KEY?: string;
  OPENROUTER_DEFAULT_MODEL?: string;
  // Sprint 55: 외부 AI 검토 API
  OPENAI_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  // Sprint 26: Service Bindings
  DX_WORKER?: Fetcher;   // Discovery-X Worker
  AIF_WORKER?: Fetcher;  // AI Foundry Worker
  DX_API_URL?: string;   // 폴백: Discovery-X API URL
  AIF_API_URL?: string;  // 폴백: AI Foundry API URL
  // Sprint 67: 이메일 발송 (F210)
  RESEND_API_KEY?: string;
  // F441: R2 파일 스토리지 (Sprint 213)
  FILES_BUCKET: R2Bucket;
  // 테스트 공유 Org (설정 시 signup/google/setup-password가 개인 Org 대신 이 Org에 멤버십 부여)
  DEFAULT_SHARED_ORG_ID?: string;
  // Marker.io project ID — /ax-bd/prototypes/:id/html 응답에 피드백 위젯 주입 시 사용
  MARKER_PROJECT_ID?: string;
  // F542 Sprint 290: MetaAgent 모델 전환 (haiku-4-5|sonnet-4-6|both)
  META_AGENT_MODEL?: string;
  // F546 Sprint 298: fx-decode-bridge — Decode-X (svc-extraction/svc-ontology) 연동
  SVC_EXTRACTION?: Fetcher;
  SVC_ONTOLOGY?: Fetcher;
  DECODE_X_INTERNAL_SECRET?: string;
  DECODE_X_EXTRACTION_URL?: string;
  DECODE_X_ONTOLOGY_URL?: string;
  // F355b Sprint 219: shared secret for Decode-X → Foundry-X internal handoff calls
  DECODE_X_HANDOFF_SECRET?: string;
  // F606 Sprint 351: Audit Log Bus HMAC signing key
  AUDIT_HMAC_KEY?: string;
  // F615 Sprint 360: Guard-X decision HMAC signing key
  GUARD_HMAC_KEY?: string;
};
