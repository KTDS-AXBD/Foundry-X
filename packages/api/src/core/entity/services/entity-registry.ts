import type { BesirEntityType } from "../types.js";

export interface ServiceEntity {
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

export interface EntityLink {
  id: string;
  sourceId: string;
  targetId: string;
  linkType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export class EntityRegistry {
  constructor(private db: D1Database) {}

  async register(entity: {
    serviceId: string;
    entityType: string;
    externalId: string;
    title: string;
    status?: string;
    metadata?: Record<string, unknown>;
    orgId: string;
    besirType?: BesirEntityType;
  }): Promise<ServiceEntity> {
    const id = crypto.randomUUID();
    const metadataJson = entity.metadata ? JSON.stringify(entity.metadata) : null;

    await this.db
      .prepare(
        `INSERT INTO service_entities (id, service_id, entity_type, external_id, title, status, metadata, org_id, besir_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, entity.serviceId, entity.entityType, entity.externalId, entity.title, entity.status ?? null, metadataJson, entity.orgId, entity.besirType ?? null)
      .run();

    return {
      id,
      serviceId: entity.serviceId,
      entityType: entity.entityType,
      besirType: entity.besirType ?? null,
      externalId: entity.externalId,
      title: entity.title,
      status: entity.status ?? null,
      metadata: entity.metadata ?? null,
      orgId: entity.orgId,
      syncedAt: new Date().toISOString(),
    };
  }

  async search(params: {
    orgId: string;
    serviceId?: string;
    entityType?: string;
    besirType?: BesirEntityType;
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ServiceEntity[]; total: number }> {
    const conditions: string[] = ["org_id = ?"];
    const binds: unknown[] = [params.orgId];

    if (params.serviceId) {
      conditions.push("service_id = ?");
      binds.push(params.serviceId);
    }
    if (params.entityType) {
      conditions.push("entity_type = ?");
      binds.push(params.entityType);
    }
    if (params.besirType) {
      conditions.push("besir_type = ?");
      binds.push(params.besirType);
    }
    if (params.query) {
      conditions.push("title LIKE ?");
      binds.push(`%${params.query}%`);
    }

    const where = conditions.join(" AND ");
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as total FROM service_entities WHERE ${where}`)
      .bind(...binds)
      .first<{ total: number }>();

    const rows = await this.db
      .prepare(`SELECT * FROM service_entities WHERE ${where} ORDER BY synced_at DESC LIMIT ? OFFSET ?`)
      .bind(...binds, limit, offset)
      .all();

    return {
      items: (rows.results ?? []).map(this.mapEntity),
      total: countResult?.total ?? 0,
    };
  }

  async link(params: {
    sourceId: string;
    targetId: string;
    linkType: string;
    metadata?: Record<string, unknown>;
  }): Promise<EntityLink> {
    const id = crypto.randomUUID();
    const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;

    await this.db
      .prepare(
        `INSERT INTO entity_links (id, source_id, target_id, link_type, metadata)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, params.sourceId, params.targetId, params.linkType, metadataJson)
      .run();

    return {
      id,
      sourceId: params.sourceId,
      targetId: params.targetId,
      linkType: params.linkType,
      metadata: params.metadata ?? null,
      createdAt: new Date().toISOString(),
    };
  }

  async getGraph(entityId: string, depth: number = 2): Promise<{ nodes: ServiceEntity[]; edges: EntityLink[] }> {
    const visitedNodes = new Set<string>();
    const allEdges: EntityLink[] = [];
    let frontier = [entityId];

    for (let d = 0; d < depth && frontier.length > 0; d++) {
      const placeholders = frontier.map(() => "?").join(",");

      const outgoing = await this.db
        .prepare(`SELECT * FROM entity_links WHERE source_id IN (${placeholders})`)
        .bind(...frontier)
        .all();

      const incoming = await this.db
        .prepare(`SELECT * FROM entity_links WHERE target_id IN (${placeholders})`)
        .bind(...frontier)
        .all();

      const edges = [...(outgoing.results ?? []), ...(incoming.results ?? [])].map(this.mapLink);
      const nextFrontier = new Set<string>();

      for (const edge of edges) {
        if (!allEdges.some((e) => e.id === edge.id)) {
          allEdges.push(edge);
        }
        if (!visitedNodes.has(edge.sourceId)) nextFrontier.add(edge.sourceId);
        if (!visitedNodes.has(edge.targetId)) nextFrontier.add(edge.targetId);
      }

      for (const id of frontier) visitedNodes.add(id);
      frontier = [...nextFrontier].filter((id) => !visitedNodes.has(id));
    }

    for (const id of frontier) visitedNodes.add(id);

    const nodeIds = [...visitedNodes];
    const nodes: ServiceEntity[] = [];
    if (nodeIds.length > 0) {
      const placeholders = nodeIds.map(() => "?").join(",");
      const result = await this.db
        .prepare(`SELECT * FROM service_entities WHERE id IN (${placeholders})`)
        .bind(...nodeIds)
        .all();
      nodes.push(...(result.results ?? []).map(this.mapEntity));
    }

    return { nodes, edges: allEdges };
  }

  async bulkSync(
    serviceId: string,
    entities: Array<{ externalId: string; title: string; status?: string; metadata?: Record<string, unknown> }>,
    orgId: string,
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const entity of entities) {
      const existing = await this.db
        .prepare("SELECT id FROM service_entities WHERE service_id = ? AND external_id = ? AND org_id = ?")
        .bind(serviceId, entity.externalId, orgId)
        .first<{ id: string }>();

      const metadataJson = entity.metadata ? JSON.stringify(entity.metadata) : null;

      if (existing) {
        await this.db
          .prepare(
            `UPDATE service_entities SET title = ?, status = ?, metadata = ?, synced_at = datetime('now') WHERE id = ?`,
          )
          .bind(entity.title, entity.status ?? null, metadataJson, existing.id)
          .run();
        updated++;
      } else {
        const id = crypto.randomUUID();
        await this.db
          .prepare(
            `INSERT INTO service_entities (id, service_id, entity_type, external_id, title, status, metadata, org_id)
             VALUES (?, ?, 'unknown', ?, ?, ?, ?, ?)`,
          )
          .bind(id, serviceId, entity.externalId, entity.title, entity.status ?? null, metadataJson, orgId)
          .run();
        created++;
      }
    }

    return { created, updated };
  }

  private mapEntity(row: Record<string, unknown>): ServiceEntity {
    return {
      id: row.id as string,
      serviceId: row.service_id as string,
      entityType: row.entity_type as string,
      besirType: (row.besir_type as BesirEntityType) ?? null,
      externalId: row.external_id as string,
      title: row.title as string,
      status: (row.status as string) ?? null,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
      orgId: row.org_id as string,
      syncedAt: row.synced_at as string,
    };
  }

  private mapLink(row: Record<string, unknown>): EntityLink {
    return {
      id: row.id as string,
      sourceId: row.source_id as string,
      targetId: row.target_id as string,
      linkType: row.link_type as string,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
      createdAt: row.created_at as string,
    };
  }
}
