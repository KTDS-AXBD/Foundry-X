/**
 * Sprint 154: F342 PersonaEvalService Tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PersonaEvalService } from "../core/shaping/services/persona-eval-service.js";

describe("PersonaEvalService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: PersonaEvalService;
  const orgId = "org_test";
  const itemId = "item_002";

  const makeScores = () => ({
    strategic_fit: 80,
    market_potential: 70,
    technical_feasibility: 90,
    financial_viability: 60,
    competitive_advantage: 75,
    risk_assessment: 65,
    team_readiness: 85,
  });

  beforeEach(() => {
    db = createMockD1();
    svc = new PersonaEvalService(db as unknown as D1Database);
    (db as any).db.prepare("INSERT OR IGNORE INTO biz_items (id, title, created_by) VALUES (?, ?, ?)").run(itemId, "Test Item", "user1");
  });

  it("save — 평가 결과 저장", async () => {
    const result = await svc.save(itemId, orgId, {
      personaId: "strategy",
      scores: makeScores(),
      verdict: "Go",
      summary: "전략적으로 적합한 아이템",
      concern: null,
      condition: null,
      evalModel: "claude-sonnet-4-5-20250514",
    });

    expect(result.persona_id).toBe("strategy");
    expect(result.verdict).toBe("Go");
    expect(result.summary).toBe("전략적으로 적합한 아이템");
  });

  it("save — 동일 persona 재평가 시 업데이트", async () => {
    await svc.save(itemId, orgId, {
      personaId: "strategy",
      scores: makeScores(),
      verdict: "Go",
      summary: "v1",
    });

    const updated = await svc.save(itemId, orgId, {
      personaId: "strategy",
      scores: makeScores(),
      verdict: "Conditional",
      summary: "v2 — 조건부",
      concern: "시장 진입 타이밍",
      condition: "Q3 전 출시 필수",
    });

    expect(updated.verdict).toBe("Conditional");
    expect(updated.summary).toBe("v2 — 조건부");

    const all = await svc.getByItem(itemId);
    expect(all).toHaveLength(1);
  });

  it("getOverallVerdict — 다수결 판정", async () => {
    // 5 Go, 2 Conditional, 1 NoGo → Go
    const personas = ["strategy", "sales", "ap-biz", "ai-tech", "finance", "security", "partner", "product"];
    const verdicts: Array<"Go" | "Conditional" | "NoGo"> = ["Go", "Go", "Go", "Go", "Go", "Conditional", "Conditional", "NoGo"];

    for (let i = 0; i < 8; i++) {
      await svc.save(itemId, orgId, {
        personaId: personas[i]!,
        scores: makeScores(),
        verdict: verdicts[i]!,
        summary: `${personas[i]} 평가`,
        concern: null,
        condition: null,
      });
    }

    const result = await svc.getOverallVerdict(itemId);
    expect(result.verdict).toBe("Go");
    expect(result.go).toBe(5);
    expect(result.conditional).toBe(2);
    expect(result.noGo).toBe(1);
  });

  it("getOverallVerdict — NoGo 과반 시 NoGo", async () => {
    const personas = ["strategy", "sales", "finance"];
    for (const p of personas) {
      await svc.save(itemId, orgId, {
        personaId: p,
        scores: makeScores(),
        verdict: p === "sales" ? "Go" : "NoGo",
        summary: `${p} 평가`,
        concern: null,
        condition: null,
      });
    }

    const result = await svc.getOverallVerdict(itemId);
    expect(result.verdict).toBe("NoGo");
  });

  it("getOverallVerdict — 빈 평가 시 Conditional", async () => {
    const result = await svc.getOverallVerdict(itemId);
    expect(result.verdict).toBe("Conditional");
  });
});
