// F623: DomainInitService TDD Red Phase
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DomainInitService } from "./domain-init.service.js";
import type { EntityRegistry } from "../../entity/services/entity-registry.js";
import type { PolicyEngine } from "../../policy/services/policy-engine.service.js";
import type { SystemKnowledgeService } from "./system-knowledge.service.js";
import type { AuditBus } from "../../infra/audit-bus.js";

function makeMocks() {
  const policyEngine = {
    registerPolicy: vi.fn().mockResolvedValue({ id: "policy-uuid-1" }),
  } as unknown as PolicyEngine;

  const entityRegistry = {
    register: vi.fn().mockResolvedValue({
      id: "entity-uuid-1",
      serviceId: "ai-foundry",
      entityType: "domain_actor",
      besirType: "actor",
      externalId: "domain-kotra",
      title: "kotra",
      status: null,
      metadata: null,
      orgId: "org-1",
      syncedAt: new Date().toISOString(),
    }),
  } as unknown as EntityRegistry;

  const systemKnowledgeService = {
    registerKnowledge: vi.fn().mockResolvedValue({
      id: "sk-uuid-1",
      orgId: "org-1",
      assetType: "system_knowledge",
      title: "kotra 도메인 룰 (기본)",
      contentRef: "knowledge/domains/kotra/rules.md",
      contentType: "domain_rule",
      metadata: null,
      createdBy: "user-1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  } as unknown as SystemKnowledgeService;

  const auditBus = {
    emit: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditBus;

  return { policyEngine, entityRegistry, systemKnowledgeService, auditBus };
}

describe("F623: DomainInitService", () => {
  let mocks: ReturnType<typeof makeMocks>;
  let svc: DomainInitService;

  const input = {
    domainName: "kotra",
    orgId: "org-1",
    ownerId: "user-1",
  };

  beforeEach(() => {
    mocks = makeMocks();
    svc = new DomainInitService(
      mocks.entityRegistry,
      mocks.policyEngine,
      mocks.systemKnowledgeService,
      mocks.auditBus,
    );
  });

  it("T1: scaffold — policyEngine.registerPolicy를 1회 호출한다", async () => {
    await svc.scaffold(input);
    expect(mocks.policyEngine.registerPolicy).toHaveBeenCalledTimes(1);
    expect(mocks.policyEngine.registerPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-1", actionType: "read_only", allowed: true }),
    );
  });

  it("T2: scaffold — entityRegistry.register를 actor besirType으로 1회 호출한다", async () => {
    await svc.scaffold(input);
    expect(mocks.entityRegistry.register).toHaveBeenCalledTimes(1);
    expect(mocks.entityRegistry.register).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-1", besirType: "actor", externalId: "domain-kotra" }),
    );
  });

  it("T3: scaffold — auditBus.emit을 domain.initialized로 1회 호출한다", async () => {
    await svc.scaffold(input);
    expect(mocks.auditBus.emit).toHaveBeenCalledTimes(1);
    const [eventType, payload] = vi.mocked(mocks.auditBus.emit).mock.calls[0] as unknown as [string, unknown];
    expect(eventType).toBe("domain.initialized");
    expect(payload).toMatchObject({ domainName: "kotra", orgId: "org-1" });
  });

  it("T4: scaffold — systemKnowledgeService.registerKnowledge를 domain_rule로 1회 호출한다", async () => {
    await svc.scaffold(input);
    expect(mocks.systemKnowledgeService.registerKnowledge).toHaveBeenCalledTimes(1);
    expect(mocks.systemKnowledgeService.registerKnowledge).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-1", contentType: "domain_rule" }),
    );
  });

  it("T5: scaffold — scaffoldedAssets에 5개 자산 ID가 모두 포함된다", async () => {
    const result = await svc.scaffold(input);
    expect(result.domainName).toBe("kotra");
    expect(result.orgId).toBe("org-1");
    expect(result.scaffoldedAssets.policy.policyId).toBe("policy-uuid-1");
    expect(result.scaffoldedAssets.ontology.entityId).toBe("entity-uuid-1");
    expect(typeof result.scaffoldedAssets.skill.skillRef).toBe("string");
    expect(typeof result.scaffoldedAssets.log.auditEventId).toBe("string");
    expect(result.scaffoldedAssets.systemKnowledge.knowledgeId).toBe("sk-uuid-1");
    expect(typeof result.initializedAt).toBe("number");
  });
});
