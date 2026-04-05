/**
 * Sprint 154: F342 PersonaConfigService + Route Tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PersonaConfigService } from "../services/persona-config-service.js";

describe("PersonaConfigService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: PersonaConfigService;
  const orgId = "org_test";
  const itemId = "item_001";

  beforeEach(() => {
    db = createMockD1();
    svc = new PersonaConfigService(db as unknown as D1Database);
    // biz_items FK용 stub
    (db as any).db.prepare("INSERT OR IGNORE INTO biz_items (id, title, created_by) VALUES (?, ?, ?)").run(itemId, "Test Item", "user1");
  });

  it("initDefaults — 8인 페르소나 시딩", async () => {
    const count = await svc.initDefaults(itemId, orgId);
    expect(count).toBe(8);

    const configs = await svc.getByItem(itemId);
    expect(configs).toHaveLength(8);
    expect(configs[0]!.persona_id).toBeDefined();
    expect(configs[0]!.org_id).toBe(orgId);
  });

  it("initDefaults 중복 호출 시 추가 삽입 없음", async () => {
    await svc.initDefaults(itemId, orgId);
    const count2 = await svc.initDefaults(itemId, orgId);
    expect(count2).toBe(0);

    const configs = await svc.getByItem(itemId);
    expect(configs).toHaveLength(8);
  });

  it("upsert — 신규 페르소나 추가", async () => {
    const config = await svc.upsert(itemId, orgId, {
      personaId: "custom",
      personaName: "커스텀 전문가",
      personaRole: "도메인 전문가",
      weights: {
        strategic_fit: 20,
        market_potential: 15,
        technical_feasibility: 15,
        financial_viability: 15,
        competitive_advantage: 10,
        risk_assessment: 15,
        team_readiness: 10,
      },
      contextJson: { focus: "AI" },
    });

    expect(config.persona_id).toBe("custom");
    expect(config.persona_name).toBe("커스텀 전문가");
    expect(JSON.parse(config.weights).strategic_fit).toBe(20);
  });

  it("upsert — 기존 페르소나 업데이트", async () => {
    await svc.initDefaults(itemId, orgId);

    const updated = await svc.upsert(itemId, orgId, {
      personaId: "strategy",
      personaName: "전략담당 (수정)",
      personaRole: "수정된 역할",
      weights: {
        strategic_fit: 30,
        market_potential: 10,
        technical_feasibility: 10,
        financial_viability: 10,
        competitive_advantage: 15,
        risk_assessment: 15,
        team_readiness: 10,
      },
      contextJson: {},
    });

    expect(updated.persona_name).toBe("전략담당 (수정)");
    expect(JSON.parse(updated.weights).strategic_fit).toBe(30);
  });

  it("updateWeights — 가중치만 변경", async () => {
    await svc.initDefaults(itemId, orgId);
    await svc.updateWeights(itemId, "strategy", {
      strategic_fit: 50,
      market_potential: 5,
      technical_feasibility: 5,
      financial_viability: 10,
      competitive_advantage: 10,
      risk_assessment: 10,
      team_readiness: 10,
    });

    const configs = await svc.getByItem(itemId);
    const strategy = configs.find((c) => c.persona_id === "strategy");
    expect(JSON.parse(strategy!.weights).strategic_fit).toBe(50);
  });
});
