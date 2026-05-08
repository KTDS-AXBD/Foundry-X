// F603 Sprint 363 — CrossOrgGroupSchema + AssignGroupSchema contract
// 4 그룹 enum 정합 회귀 차단 (default-deny security critical — CROSS_ORG_GROUPS const 변경 시 즉시 RED)
import { describe, it, expect } from "vitest";
import {
  CrossOrgGroupSchema,
  AssetKindSchema,
  ExportBlockReasonSchema,
  AssignGroupSchema,
} from "./cross-org.js";
import { CROSS_ORG_GROUPS, ASSET_KINDS, EXPORT_BLOCK_REASONS } from "../types.js";

describe("F603: CrossOrgGroupSchema contract (default-deny security critical)", () => {
  it("4 그룹 모두 통과 — common_standard / org_specific / tacit_knowledge / core_differentiator", () => {
    expect(CROSS_ORG_GROUPS.length).toBe(4);
    for (const g of CROSS_ORG_GROUPS) {
      expect(() => CrossOrgGroupSchema.parse(g)).not.toThrow();
    }
  });

  it("invalid 값은 zod parse에서 거부 (D1 trigger 보조 + service 보조)", () => {
    expect(() => CrossOrgGroupSchema.parse("invalid")).toThrow();
    expect(() => CrossOrgGroupSchema.parse("Core_Differentiator")).toThrow(); // case-sensitive
    expect(() => CrossOrgGroupSchema.parse("")).toThrow();
    expect(() => CrossOrgGroupSchema.parse("public")).toThrow(); // default-deny: 모르는 그룹은 거부
  });

  it("AssetKind 4종 (policy/ontology/skill/system_knowledge)", () => {
    expect(ASSET_KINDS.length).toBe(4);
    for (const k of ASSET_KINDS) {
      expect(() => AssetKindSchema.parse(k)).not.toThrow();
    }
    expect(() => AssetKindSchema.parse("agent")).toThrow();
  });

  it("ExportBlockReason 4종 (export/license/marketplace/learning_opt_in)", () => {
    expect(EXPORT_BLOCK_REASONS.length).toBe(4);
    for (const r of EXPORT_BLOCK_REASONS) {
      expect(() => ExportBlockReasonSchema.parse(r)).not.toThrow();
    }
  });

  it("AssignGroupSchema — core_differentiator INSERT 가능 (보안 critical)", () => {
    const result = AssignGroupSchema.safeParse({
      assetId: "asset-core-1",
      assetKind: "skill",
      orgId: "org-1",
      groupType: "core_differentiator",
      assignedBy: "manual",
    });
    expect(result.success).toBe(true);
  });

  it("AssignGroupSchema — invalid groupType 거부 (default-deny 안전망 #1)", () => {
    const result = AssignGroupSchema.safeParse({
      assetId: "asset-1",
      assetKind: "skill",
      orgId: "org-1",
      groupType: "wrongtype",
      assignedBy: "manual",
    });
    expect(result.success).toBe(false);
  });
});
