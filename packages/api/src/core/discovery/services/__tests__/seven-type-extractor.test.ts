// F630: SevenTypeExtractor TDD Red Phase
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @foundry-x/shared (not built in test env) and infra module
vi.mock("../../../infra/types.js", () => ({
  generateTraceId: () => "aaaa0000bbbb1111cccc2222dddd3333",
  generateSpanId: () => "1122334455667788",
  LLMService: class {},
  AuditBus: class {},
  SSEManager: class {},
  KVCacheService: class {},
  EventBus: class {},
  ServiceProxy: class {},
}));
vi.mock("@foundry-x/shared", () => ({
  MODEL_HAIKU: "claude-haiku-4-5-20251001",
}));

import { SevenTypeExtractor } from "../seven-type-extractor.service.js";
import type { TranscriptInput } from "../seven-type-extractor.service.js";
import type { EntityRegistry } from "../../../entity/types.js";
import type { LLMService } from "../../../infra/types.js";
import type { AuditBus } from "../../../infra/types.js";

const FAKE_LLM_RESPONSE = JSON.stringify([
  { besirType: "fact", title: "매출", attributes: {}, relationships: [{ to: "프로젝트", type: "split_by" }] },
  { besirType: "dimension", title: "프로젝트", attributes: {}, relationships: [] },
  { besirType: "actor", title: "영업팀장", attributes: {}, relationships: [] },
  { besirType: "workflow", title: "매출 검토", attributes: { frequency: "monthly" }, relationships: [] },
]);

function makeLLMMock(response = FAKE_LLM_RESPONSE) {
  return {
    generate: vi.fn().mockResolvedValue({ content: response, model: "test", tokensUsed: 0 }),
  } as unknown as LLMService;
}

function makeRegistryMock() {
  return {
    register: vi.fn().mockImplementation(async (params: Record<string, unknown>) => ({
      id: crypto.randomUUID(),
      serviceId: params["serviceId"],
      entityType: params["entityType"] ?? params["besirType"],
      besirType: params["besirType"] ?? null,
      externalId: params["externalId"],
      title: params["title"],
      status: null,
      metadata: params["metadata"] ?? null,
      orgId: params["orgId"],
      syncedAt: new Date().toISOString(),
    })),
  } as unknown as EntityRegistry;
}

function makeAuditMock() {
  return {
    emit: vi.fn().mockResolvedValue(undefined),
    sign: vi.fn().mockResolvedValue("fake-hmac"),
    queryByTrace: vi.fn().mockResolvedValue([]),
  } as unknown as AuditBus;
}

const TRANSCRIPT_INPUT: TranscriptInput = {
  orgId: "org-test-001",
  transcript: "매출은 프로젝트별로 집계되고, 매월 영업팀장이 검토합니다.",
};

describe("F630: SevenTypeExtractor", () => {
  let llm: LLMService;
  let registry: EntityRegistry;
  let auditBus: AuditBus;

  beforeEach(() => {
    llm = makeLLMMock();
    registry = makeRegistryMock();
    auditBus = makeAuditMock();
  });

  it("T1: LLM 응답을 파싱하여 4개 엔티티를 entity-registry에 등록한다", async () => {
    const extractor = new SevenTypeExtractor(registry, llm, auditBus);
    const result = await extractor.extractFromTranscript(TRANSCRIPT_INPUT);

    expect(result.extractedEntities).toHaveLength(4);
    expect(result.extractionRunId).toBeTruthy();
    expect(result.extractedAt).toBeGreaterThan(0);

    expect(registry.register).toHaveBeenCalledTimes(4);
    const firstCall = vi.mocked(registry.register).mock.calls[0]![0]!;
    expect(firstCall.orgId).toBe("org-test-001");
    expect(firstCall.serviceId).toBe("ai-foundry");
    expect(firstCall.besirType).toBe("fact");
    expect(firstCall.title).toBe("매출");
  });

  it("T2: audit-bus에 extraction.completed 이벤트를 발행한다", async () => {
    const extractor = new SevenTypeExtractor(registry, llm, auditBus);
    const result = await extractor.extractFromTranscript(TRANSCRIPT_INPUT);

    expect(auditBus.emit).toHaveBeenCalledOnce();
    const [eventType, payload] = vi.mocked(auditBus.emit).mock.calls[0]!;
    expect(eventType).toBe("extraction.completed");
    const p = payload as Record<string, unknown>;
    expect(p["extractionRunId"]).toBe(result.extractionRunId);
    expect(p["entityCount"]).toBe(4);
    expect(p["orgId"]).toBe("org-test-001");
  });

  it("T3: 잘못된 LLM 응답(invalid JSON)은 에러를 던진다", async () => {
    const badLlm = makeLLMMock("not valid json {{");
    const extractor = new SevenTypeExtractor(registry, badLlm, auditBus);

    await expect(extractor.extractFromTranscript(TRANSCRIPT_INPUT)).rejects.toThrow();
    expect(registry.register).not.toHaveBeenCalled();
  });

  it("T4: auditBus 미제공 시에도 추출이 정상 동작한다", async () => {
    const extractor = new SevenTypeExtractor(registry, llm);
    const result = await extractor.extractFromTranscript(TRANSCRIPT_INPUT);

    expect(result.extractedEntities).toHaveLength(4);
    expect(result.extractionRunId).toBeTruthy();
  });
});
