// F628 Sprint 352 — BesirEntityTypeSchema contract
// 7-타입 enum 정합 회귀 차단 (BESIR_ENTITY_TYPES const 변경 시 즉시 RED)
import { describe, it, expect } from "vitest";
import { BesirEntityTypeSchema, RegisterEntitySchema } from "./entity.js";
import { BESIR_ENTITY_TYPES } from "../types.js";

describe("F628: BesirEntityTypeSchema contract", () => {
  it("7-타입 모두 통과", () => {
    for (const t of BESIR_ENTITY_TYPES) {
      expect(() => BesirEntityTypeSchema.parse(t)).not.toThrow();
    }
  });

  it("invalid 값은 zod parse에서 거부 (D1 trigger 보조)", () => {
    expect(() => BesirEntityTypeSchema.parse("invalid")).toThrow();
    expect(() => BesirEntityTypeSchema.parse("Fact")).toThrow(); // case-sensitive
    expect(() => BesirEntityTypeSchema.parse("")).toThrow();
  });

  it("RegisterEntity besirType optional — 미지정 OK", () => {
    const result = RegisterEntitySchema.safeParse({
      serviceId: "foundry-x",
      entityType: "skill",
      externalId: "x-1",
      title: "T",
      orgId: "org-1",
    });
    expect(result.success).toBe(true);
  });

  it("RegisterEntity besirType invalid → safeParse 실패", () => {
    const result = RegisterEntitySchema.safeParse({
      serviceId: "foundry-x",
      entityType: "skill",
      externalId: "x-1",
      title: "T",
      orgId: "org-1",
      besirType: "wrongtype",
    });
    expect(result.success).toBe(false);
  });
});
