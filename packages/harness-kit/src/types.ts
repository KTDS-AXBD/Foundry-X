/** 서비스 식별자 (Sprint 179 service-mapping.md 기반) */
export type ServiceId =
  | "foundry-x"
  | "discovery-x"
  | "ai-foundry"
  | "gate-x"
  | "launch-x"
  | "eval-x";

/** Workers 환경 바인딩 (필수 공통) */
export interface HarnessEnv {
  DB: D1Database;
  JWT_SECRET: string;
  CACHE?: KVNamespace;
  [key: string]: unknown;
}

/** harness-kit 설정 */
export interface HarnessConfig {
  serviceName: string;
  serviceId: ServiceId;
  corsOrigins: string[];
  publicPaths?: string[];
  jwtAlgorithm?: string; // default: 'HS256'
}

/** scaffold 옵션 */
export interface ScaffoldOptions {
  name: string; // 서비스명 (kebab-case)
  serviceId: ServiceId;
  accountId?: string; // Cloudflare account ID
  dbName?: string; // D1 database name
  outputDir?: string; // 출력 디렉토리
}
