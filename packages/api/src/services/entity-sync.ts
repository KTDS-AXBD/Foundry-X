import { EntityRegistry } from "./entity-registry.js";
import type { ServiceEntity, EntityLink } from "./entity-registry.js";

const DISCOVERY_EVENT_TYPE_MAP: Record<string, string> = {
  "discovery.created": "discovery",
  "experiment.completed": "experiment",
  "signal.detected": "discovery",
};

const FOUNDRY_EVENT_TYPE_MAP: Record<string, string> = {
  "skill.generated": "skill",
  "policy.approved": "document",
  "document.ingested": "document",
};

export class EntitySyncService {
  constructor(private registry: EntityRegistry) {}

  async handleDiscoveryEvent(event: {
    type: "discovery.created" | "experiment.completed" | "signal.detected";
    data: { id: string; title: string; status: string; metadata?: Record<string, unknown> };
    orgId: string;
  }): Promise<ServiceEntity> {
    const entityType = DISCOVERY_EVENT_TYPE_MAP[event.type] ?? "discovery";

    return this.registry.register({
      serviceId: "discovery-x",
      entityType,
      externalId: event.data.id,
      title: event.data.title,
      status: event.data.status,
      metadata: { ...event.data.metadata, sourceEvent: event.type },
      orgId: event.orgId,
    });
  }

  async handleFoundryEvent(event: {
    type: "skill.generated" | "policy.approved" | "document.ingested";
    data: { id: string; title: string; status: string; metadata?: Record<string, unknown> };
    orgId: string;
  }): Promise<ServiceEntity> {
    const entityType = FOUNDRY_EVENT_TYPE_MAP[event.type] ?? "document";

    return this.registry.register({
      serviceId: "ai-foundry",
      entityType,
      externalId: event.data.id,
      title: event.data.title,
      status: event.data.status,
      metadata: { ...event.data.metadata, sourceEvent: event.type },
      orgId: event.orgId,
    });
  }

  async inferLinks(entityId: string): Promise<EntityLink[]> {
    const graph = await this.registry.getGraph(entityId, 1);
    const entity = graph.nodes.find((n) => n.id === entityId);
    if (!entity) return [];

    const { items: candidates } = await this.registry.search({
      orgId: entity.orgId,
      limit: 50,
    });

    const links: EntityLink[] = [];

    for (const candidate of candidates) {
      if (candidate.id === entityId) continue;

      const alreadyLinked = graph.edges.some(
        (e) =>
          (e.sourceId === entityId && e.targetId === candidate.id) ||
          (e.targetId === entityId && e.sourceId === candidate.id),
      );
      if (alreadyLinked) continue;

      if (candidate.metadata && entity.metadata) {
        const candidateTags = (candidate.metadata as Record<string, unknown>).tags;
        const entityTags = (entity.metadata as Record<string, unknown>).tags;

        if (Array.isArray(candidateTags) && Array.isArray(entityTags)) {
          const overlap = candidateTags.filter((t: unknown) => entityTags.includes(t));
          if (overlap.length > 0) {
            const link = await this.registry.link({
              sourceId: entityId,
              targetId: candidate.id,
              linkType: "references",
              metadata: { inferredBy: "tag-overlap", tags: overlap },
            });
            links.push(link);
          }
        }
      }
    }

    return links;
  }
}
