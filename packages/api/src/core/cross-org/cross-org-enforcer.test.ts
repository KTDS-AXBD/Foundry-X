// F603: CrossOrgEnforcer TDD — default-deny 3 시나리오
import { describe, it, expect, vi } from "vitest";
import { CrossOrgEnforcer } from "./services/cross-org-enforcer.service.js";

type InsertCall = { table: string; values: unknown[] };

function makeD1Mock(overrideFirst?: Record<string, unknown>) {
  const insertLog: InsertCall[] = [];
  const mock = {
    insertLog,
    prepare: vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockImplementation((...args: unknown[]) => {
        if (sql.includes("INSERT INTO cross_org_groups")) {
          insertLog.push({ table: "cross_org_groups", values: args });
        }
        if (sql.includes("INSERT INTO cross_org_export_blocks")) {
          insertLog.push({ table: "cross_org_export_blocks", values: args });
        }
        const firstResult =
          sql.includes("SELECT") && overrideFirst ? overrideFirst : null;
        return {
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue(firstResult),
          all: vi.fn().mockResolvedValue({ results: [] }),
        };
      }),
    })),
  };
  return mock;
}

function makeAuditBusMock() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

describe("F603 CrossOrgEnforcer", () => {
  it("core_differentiator → checkExport allowed=false + blocks INSERT + 2 audit emits", async () => {
    const coreDiffRow = {
      id: "grp-1",
      asset_kind: "policy",
      org_id: "org-1",
      group_type: "core_differentiator",
    };
    const db = makeD1Mock(coreDiffRow);
    const bus = makeAuditBusMock();
    const enforcer = new CrossOrgEnforcer(db as unknown as D1Database, bus);

    const assignment = await enforcer.assignGroup({
      assetId: "asset-core",
      assetKind: "policy",
      orgId: "org-1",
      groupType: "core_differentiator",
      assignedBy: "sme",
    });

    expect(assignment.groupType).toBe("core_differentiator");
    expect(db.insertLog.some((r) => r.table === "cross_org_groups")).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      "cross_org.group_assigned",
      expect.objectContaining({ assetId: "asset-core", groupType: "core_differentiator" }),
      expect.anything(),
    );

    const result = await enforcer.checkExport({ assetId: "asset-core" });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("export_blocked");
    expect(result.blockId).toBeTruthy();
    expect(result.groupType).toBe("core_differentiator");
    expect(db.insertLog.some((r) => r.table === "cross_org_export_blocks")).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      "cross_org.export_blocked",
      expect.objectContaining({ assetId: "asset-core", reason: "export_blocked" }),
      expect.anything(),
    );
  });

  it("common_standard → checkExport allowed=true", async () => {
    const commonRow = {
      id: "grp-2",
      asset_kind: "skill",
      org_id: "org-1",
      group_type: "common_standard",
    };
    const db = makeD1Mock(commonRow);
    const bus = makeAuditBusMock();
    const enforcer = new CrossOrgEnforcer(db as unknown as D1Database, bus);

    await enforcer.assignGroup({
      assetId: "asset-common",
      assetKind: "skill",
      orgId: "org-1",
      groupType: "common_standard",
    });

    const result = await enforcer.checkExport({ assetId: "asset-common" });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
    expect(db.insertLog.filter((r) => r.table === "cross_org_export_blocks")).toHaveLength(0);
  });

  it("미분류 자산 → checkExport allowed=true, groupType=null", async () => {
    const db = makeD1Mock(null as any);
    const bus = makeAuditBusMock();
    const enforcer = new CrossOrgEnforcer(db as unknown as D1Database, bus);

    const result = await enforcer.checkExport({ assetId: "unknown-asset" });

    expect(result.allowed).toBe(true);
    expect(result.groupType).toBeNull();
  });
});
