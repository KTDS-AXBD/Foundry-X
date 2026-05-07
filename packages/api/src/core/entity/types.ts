// BeSir 7-타입 (06_architecture_alignment_with_besir_v1.md §1.2, F628)
export const BESIR_ENTITY_TYPES = [
  "fact",       // 숫자로 나타나는 객체
  "dimension",  // Fact를 가르는 기준
  "workflow",   // 업무 흐름
  "event",      // 사건
  "actor",      // 주체/담당자
  "policy",     // 룰/규칙
  "support",    // 위 6개 보조
] as const;

export type BesirEntityType = (typeof BESIR_ENTITY_TYPES)[number];

export interface BesirEntity {
  id: string;
  serviceId: string;
  entityType: string;
  besirType: BesirEntityType | null;
  externalId: string;
  title: string;
  status: string | null;
  metadata: Record<string, unknown> | null;
  orgId: string;
  syncedAt: string;
}

export { EntityRegistry } from "./services/entity-registry.js";
// NOTE: schemas/entity.js는 types.js의 BESIR_ENTITY_TYPES를 import하므로 여기서 re-export하면
// 순환 import 발생 → schema 평가 시점에 BESIR_ENTITY_TYPES가 undefined → z.enum(undefined) →
// /api/openapi.json 500 (S336 발견). schemas는 호출자가 "./schemas/entity.js"에서 직접 import.
