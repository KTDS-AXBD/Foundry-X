// F623: DomainInitService — 5-Asset 스캐폴드 오케스트레이터 (domain-init β endpoint)
import { generateTraceId, generateSpanId } from "../../infra/types.js";
import type { AuditBus } from "../../infra/types.js";
import type { EntityRegistry } from "../../entity/types.js";
import type { PolicyEngine } from "../../policy/types.js";
import type { SystemKnowledgeService } from "./system-knowledge.service.js";

export interface DomainInitInput {
  domainName: string;
  orgId: string;
  ownerId: string;
  description?: string;
}

export interface DomainScaffold {
  policy: { policyId: string };
  ontology: { entityId: string };
  skill: { skillRef: string };
  log: { auditEventId: string };
  systemKnowledge: { knowledgeId: string };
}

export interface DomainInitResult {
  domainName: string;
  orgId: string;
  scaffoldedAssets: DomainScaffold;
  initializedAt: number;
}

export class DomainInitService {
  constructor(
    private readonly entityRegistry: Pick<EntityRegistry, "register">,
    private readonly policyEngine: Pick<PolicyEngine, "registerPolicy">,
    private readonly systemKnowledgeService: Pick<SystemKnowledgeService, "registerKnowledge">,
    private readonly auditBus: Pick<AuditBus, "emit">,
  ) {}

  async scaffold(input: DomainInitInput): Promise<DomainInitResult> {
    const initializedAt = Date.now();
    const traceId = generateTraceId();
    const spanId = generateSpanId();
    const ctx = { traceId, spanId, sampled: true };

    // 1. Policy: default read_only allow
    const policy = await this.policyEngine.registerPolicy({
      orgId: input.orgId,
      actionType: "read_only",
      allowed: true,
      reason: `Default read_only for domain ${input.domainName}`,
      metadata: { domainName: input.domainName, scaffoldedBy: "domain-init" },
    });

    // 2. Ontology: BeSir actor entity
    const ontologyEntity = await this.entityRegistry.register({
      serviceId: "ai-foundry",
      entityType: "domain_actor",
      besirType: "actor",
      externalId: `domain-${input.domainName}`,
      title: input.domainName,
      metadata: {
        ownerId: input.ownerId,
        scaffoldedBy: "domain-init",
        description: input.description ?? null,
      },
      orgId: input.orgId,
    });

    // 3. Skill: ax-marketplace reference (외부 git repo — F623 scope 외)
    const skillRef = `ax-marketplace/skills/domain-${input.domainName}`;

    // 4. Log: domain.initialized audit event
    await this.auditBus.emit(
      "domain.initialized",
      {
        domainName: input.domainName,
        orgId: input.orgId,
        ownerId: input.ownerId,
        scaffoldedAt: initializedAt,
        assetIds: { policyId: policy.id, entityId: ontologyEntity.id },
      },
      ctx,
      input.ownerId,
      input.orgId,
    );

    // 5. SystemKnowledge: default domain rule
    const knowledge = await this.systemKnowledgeService.registerKnowledge({
      orgId: input.orgId,
      title: `${input.domainName} 도메인 룰 (기본)`,
      contentRef: `knowledge/domains/${input.domainName}/rules.md`,
      contentType: "domain_rule",
      metadata: { scaffoldedBy: "domain-init", ownerId: input.ownerId },
      createdBy: input.ownerId,
    });

    return {
      domainName: input.domainName,
      orgId: input.orgId,
      scaffoldedAssets: {
        policy: { policyId: policy.id },
        ontology: { entityId: ontologyEntity.id },
        skill: { skillRef },
        log: { auditEventId: traceId },
        systemKnowledge: { knowledgeId: knowledge.id },
      },
      initializedAt,
    };
  }
}
