// F616: LaunchEngine TDD — package + Type1 publish + decision log + audit emit
import { describe, it, expect, vi } from "vitest";
import { LaunchEngine } from "./services/launch-engine.service.js";

type InsertCall = { table: string; values: unknown[] };

function makeD1Mock() {
  const insertLog: InsertCall[] = [];
  const mock = {
    insertLog,
    prepare: vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockImplementation((...args: unknown[]) => {
        if (sql.includes("INSERT INTO launch_artifacts_type1")) {
          insertLog.push({ table: "launch_artifacts_type1", values: args });
        }
        if (sql.includes("INSERT INTO launch_runtimes_type2")) {
          insertLog.push({ table: "launch_runtimes_type2", values: args });
        }
        if (sql.includes("INSERT INTO launch_decisions")) {
          insertLog.push({ table: "launch_decisions", values: args });
        }
        return {
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue(null),
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

describe("F616 LaunchEngine", () => {
  const orgId = "org-test";
  const artifactRef = "s3://bucket/artifact.zip";

  it("T1: package → sha256 manifest + publishType1 → type1 INSERT + decisions INSERT + audit emit launch.completed", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const engine = new LaunchEngine(db as unknown as D1Database, bus as any);

    const manifest = await engine.package({ orgId, artifactRef, metadata: { version: "1.0" } });

    expect(manifest.releaseId).toBeTruthy();
    expect(manifest.sha256).toHaveLength(64);
    expect(manifest.orgId).toBe(orgId);

    const artifact = await engine.publishType1(manifest);

    expect(artifact.releaseId).toBe(manifest.releaseId);
    expect(artifact.downloadUrl).toContain(manifest.releaseId);
    expect(artifact.sha256).toBe(manifest.sha256);

    expect(db.insertLog.some((r) => r.table === "launch_artifacts_type1")).toBe(true);
    expect(db.insertLog.some((r) => r.table === "launch_decisions")).toBe(true);

    expect(bus.emit).toHaveBeenCalledWith(
      "launch.completed",
      expect.objectContaining({
        releaseId: manifest.releaseId,
        orgId,
        launchType: 1,
        sha256: manifest.sha256,
      }),
      expect.objectContaining({ traceId: expect.any(String) }),
    );
  });
});
