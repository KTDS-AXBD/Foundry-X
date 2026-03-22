// ─── Plugin System Types (Sprint 47, F164) ───
// 플러그인 시스템 인터페이스 정의 (타입만, 런타임 구현은 Sprint 48+)

/** 데이터 분류 등급 (F166 데이터 거버넌스) */
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

/** PII 마스킹 전략 */
export type MaskingStrategy = 'redact' | 'hash' | 'partial' | 'tokenize';

/** 감사 로그 이벤트 유형 (F165) */
export type AuditEventType =
  | 'ai_generation'
  | 'code_review'
  | 'masking'
  | 'approval'
  | 'plugin_action';

/** 감사 로그 출력 유형 */
export type AuditOutputType = 'code' | 'test' | 'document' | 'review';

// ─── Plugin Manifest ───

/** 플러그인 매니페스트 — 메타데이터 + 의존성 선언 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: PluginPermission[];
  hooks: PluginHookDeclaration[];
  slots: PluginSlotDeclaration[];
  dependencies?: string[];
  minPlatformVersion?: string;
}

/** 플러그인 권한 */
export type PluginPermission =
  | 'read:agents'
  | 'read:specs'
  | 'read:workflows'
  | 'write:agents'
  | 'write:workflows'
  | 'admin:settings';

/** 플러그인 훅 선언 */
export interface PluginHookDeclaration {
  event: PluginHookEvent;
  handler: string;
  priority?: number;
}

/** 플러그인 훅 이벤트 */
export type PluginHookEvent =
  | 'agent:before-run'
  | 'agent:after-run'
  | 'workflow:before-step'
  | 'workflow:after-step'
  | 'spec:before-sync'
  | 'spec:after-sync'
  | 'pr:before-create'
  | 'pr:after-merge';

/** 플러그인 슬롯 선언 */
export interface PluginSlotDeclaration {
  slot: PluginSlotId;
  component: string;
}

/** 플러그인 슬롯 ID */
export type PluginSlotId =
  | 'dashboard:widget'
  | 'agent:config-panel'
  | 'sidebar:menu-item'
  | 'spec:toolbar';

/** 플러그인 상태 */
export type PluginStatus =
  | 'installed'
  | 'validated'
  | 'active'
  | 'inactive'
  | 'error';

/** 플러그인 인스턴스 (런타임) */
export interface PluginInstance {
  manifest: PluginManifest;
  status: PluginStatus;
  installedAt: string;
  activatedAt?: string;
  config?: Record<string, unknown>;
  errorMessage?: string;
}
