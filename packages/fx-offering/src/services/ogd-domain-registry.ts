// F360: O-G-D Domain Registry (Sprint 163)
// 도메인 어댑터 등록/조회 + D1 동기화

import type { DomainAdapterInterface, DomainAdapterConfig } from "@foundry-x/shared";

export class OgdDomainRegistry {
  private adapters = new Map<string, DomainAdapterInterface>();

  register(adapter: DomainAdapterInterface): void {
    this.adapters.set(adapter.domain, adapter);
  }

  get(domain: string): DomainAdapterInterface | undefined {
    return this.adapters.get(domain);
  }

  list(): DomainAdapterInterface[] {
    return Array.from(this.adapters.values());
  }

  has(domain: string): boolean {
    return this.adapters.has(domain);
  }

  get size(): number {
    return this.adapters.size;
  }

  /** 등록된 어댑터 메타데이터를 ogd_domains에 upsert */
  async syncToDb(db: D1Database, tenantId: string): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await db
        .prepare(
          `INSERT INTO ogd_domains (id, tenant_id, domain, display_name, description, adapter_type, default_rubric, default_max_rounds, default_min_score, enabled)
           VALUES (?, ?, ?, ?, ?, 'builtin', ?, 3, 0.85, 1)
           ON CONFLICT(tenant_id, domain) DO UPDATE SET
             display_name = excluded.display_name,
             description = excluded.description,
             default_rubric = excluded.default_rubric,
             updated_at = datetime('now')`,
        )
        .bind(
          `${tenantId}:${adapter.domain}`,
          tenantId,
          adapter.domain,
          adapter.displayName,
          adapter.description,
          adapter.getDefaultRubric(),
        )
        .run();
    }
  }

  /** D1에서 도메인 목록 조회 */
  static async listFromDb(
    db: D1Database,
    tenantId: string,
  ): Promise<DomainAdapterConfig[]> {
    const result = await db
      .prepare(
        `SELECT domain, display_name, description, adapter_type, default_rubric, default_max_rounds, default_min_score, enabled
         FROM ogd_domains WHERE tenant_id = ? ORDER BY domain`,
      )
      .bind(tenantId)
      .all();

    return (result.results ?? []).map((row: Record<string, unknown>) => ({
      domain: row.domain as string,
      displayName: row.display_name as string,
      description: (row.description as string) ?? "",
      adapterType: row.adapter_type as "builtin" | "custom",
      defaultRubric: (row.default_rubric as string) ?? "",
      defaultMaxRounds: row.default_max_rounds as number,
      defaultMinScore: row.default_min_score as number,
      enabled: Boolean(row.enabled),
    }));
  }
}
