// F618: Launch-X Integration — SkillRegistry + ObjectStore + Rollback + E2E Type1/2
import { describe, it, expect, vi } from "vitest";
import { SkillRegistryService } from "../services/skill-registry.service.js";
import { ObjectStoreService } from "../services/object-store.service.js";
import { RollbackService } from "../services/rollback.service.js";
import { LaunchEngine } from "../services/launch-engine.service.js";

type InsertCall = { table: string; values: unknown[] };
type SelectCall = { table: string; condition: unknown };

function makeD1Mock() {
  const insertLog: InsertCall[] = [];
  const selectLog: SelectCall[] = [];

  const mock = {
    insertLog,
    selectLog,
    prepare: vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockImplementation((...args: unknown[]) => {
        if (sql.includes("INSERT INTO skill_registry_entries")) insertLog.push({ table: "skill_registry_entries", values: args });
        if (sql.includes("INSERT INTO launch_rollbacks")) insertLog.push({ table: "launch_rollbacks", values: args });
        if (sql.includes("INSERT INTO launch_artifacts_type1")) insertLog.push({ table: "launch_artifacts_type1", values: args });
        if (sql.includes("INSERT INTO launch_runtimes_type2")) insertLog.push({ table: "launch_runtimes_type2", values: args });
        if (sql.includes("INSERT INTO launch_decisions")) insertLog.push({ table: "launch_decisions", values: args });
        if (sql.includes("SELECT") && sql.includes("skill_registry_entries")) selectLog.push({ table: "skill_registry_entries", condition: args });
        if (sql.includes("SELECT") && sql.includes("launch_rollbacks")) selectLog.push({ table: "launch_rollbacks", condition: args });

        const skillRow = sql.includes("skill_registry_entries") && sql.includes("SELECT")
          ? { skill_id: args[0], skill_version: "1.0", skill_meta: "{}", active: 1, registered_at: Date.now() }
          : null;

        return {
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue(skillRow),
          all: vi.fn().mockResolvedValue({
            results: sql.includes("launch_rollbacks")
              ? [{ rollback_id: "rb-1", release_id: args[0], from_version: "1.0", to_version: "0.9", reason: "test", requester: "user", executed_at: Date.now() }]
              : [],
          }),
        };
      }),
    })),
  };
  return mock;
}

function makeAuditBusMock() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

describe("F618 SkillRegistryService", () => {
  it("register() — INSERT skill_registry_entries + audit emit launch.skill_registered", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const svc = new SkillRegistryService(db as unknown as D1Database, bus as any);

    const result = await svc.register({ skillId: "skill-001", skillVersion: "1.0", meta: { name: "TestSkill" } });

    expect(result.skillId).toBe("skill-001");
    expect(result.skillVersion).toBe("1.0");
    expect(result.active).toBe(true);
    expect(db.insertLog.some((r) => r.table === "skill_registry_entries")).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      "launch.skill_registered",
      expect.objectContaining({ skillId: "skill-001", skillVersion: "1.0" }),
      expect.any(Object),
    );
  });

  it("lookup() — SELECT skill_registry_entries WHERE skill_id", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const svc = new SkillRegistryService(db as unknown as D1Database, bus as any);

    const result = await svc.lookup("skill-001");
    expect(result).not.toBeNull();
    expect(db.selectLog.some((r) => r.table === "skill_registry_entries")).toBe(true);
  });

  it("listActive() — SELECT active=1 entries", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const svc = new SkillRegistryService(db as unknown as D1Database, bus as any);

    const list = await svc.listActive();
    expect(Array.isArray(list)).toBe(true);
  });
});

describe("F618 ObjectStoreService", () => {
  it("uploadZip() — stub URL + audit emit launch.object_store.uploaded", async () => {
    const bus = makeAuditBusMock();
    const svc = new ObjectStoreService(bus as any);

    const result = await svc.uploadZip("release-001", "zipcontentbytes");

    expect(result.releaseId).toBe("release-001");
    expect(result.downloadUrl).toContain("release-001");
    expect(result.expiresAt).toBeGreaterThan(Date.now());
    expect(bus.emit).toHaveBeenCalledWith(
      "launch.object_store.uploaded",
      expect.objectContaining({ releaseId: "release-001" }),
      expect.any(Object),
    );
  });

  it("getDownloadUrl() — returns URL with expiry", async () => {
    const bus = makeAuditBusMock();
    const svc = new ObjectStoreService(bus as any);

    const url = await svc.getDownloadUrl("release-002", 3600);
    expect(url).toContain("release-002");
  });

  it("cleanupExpired() — returns count (stub returns 0)", async () => {
    const bus = makeAuditBusMock();
    const svc = new ObjectStoreService(bus as any);

    const count = await svc.cleanupExpired();
    expect(count).toBe(0);
  });
});

describe("F618 RollbackService", () => {
  it("executeRollback() — INSERT launch_rollbacks + audit emit launch.rollback.completed", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const svc = new RollbackService(db as unknown as D1Database, bus as any);

    const result = await svc.executeRollback({
      releaseId: "rel-001",
      fromVersion: "1.1",
      toVersion: "1.0",
      reason: "regression in prod",
      requester: "admin",
    });

    expect(result.rollbackId).toBeTruthy();
    expect(result.releaseId).toBe("rel-001");
    expect(result.fromVersion).toBe("1.1");
    expect(result.toVersion).toBe("1.0");
    expect(db.insertLog.some((r) => r.table === "launch_rollbacks")).toBe(true);
    expect(bus.emit).toHaveBeenCalledWith(
      "launch.rollback.completed",
      expect.objectContaining({
        releaseId: "rel-001",
        fromVersion: "1.1",
        toVersion: "1.0",
        requester: "admin",
      }),
      expect.any(Object),
    );
  });

  it("getRollbackHistory() — SELECT launch_rollbacks by release_id", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const svc = new RollbackService(db as unknown as D1Database, bus as any);

    const history = await svc.getRollbackHistory("rel-001");
    expect(Array.isArray(history)).toBe(true);
    expect(db.selectLog.some((r) => r.table === "launch_rollbacks")).toBe(true);
  });
});

describe("F618 E2E Integration", () => {
  it("Type 1 path: package → publishType1 → objectStore.uploadZip → rollback → history", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const engine = new LaunchEngine(db as unknown as D1Database, bus as any);
    const objStore = new ObjectStoreService(bus as any);
    const rollbackSvc = new RollbackService(db as unknown as D1Database, bus as any);

    const manifest = await engine.package({ orgId: "org-e2e", artifactRef: "s3://bucket/app.zip", metadata: { version: "1.1" } });
    const artifact = await engine.publishType1(manifest);
    const uploaded = await objStore.uploadZip(manifest.releaseId, "zip-bytes");
    const rb = await rollbackSvc.executeRollback({
      releaseId: manifest.releaseId,
      fromVersion: "1.1",
      toVersion: "1.0",
      reason: "E2E rollback test",
      requester: "e2e-runner",
    });

    expect(artifact.releaseId).toBe(manifest.releaseId);
    expect(uploaded.downloadUrl).toContain(manifest.releaseId);
    expect(rb.releaseId).toBe(manifest.releaseId);

    const history = await rollbackSvc.getRollbackHistory(manifest.releaseId);
    expect(Array.isArray(history)).toBe(true);

    // audit events: launch.completed + launch.object_store.uploaded + launch.rollback.completed
    const emitCalls = (bus.emit as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
    expect(emitCalls).toContain("launch.completed");
    expect(emitCalls).toContain("launch.object_store.uploaded");
    expect(emitCalls).toContain("launch.rollback.completed");
  });

  it("Type 2 path: package → deployType2 → skillRegistry.register → rollback", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const engine = new LaunchEngine(db as unknown as D1Database, bus as any);
    const skillRegistry = new SkillRegistryService(db as unknown as D1Database, bus as any);
    const rollbackSvc = new RollbackService(db as unknown as D1Database, bus as any);

    const manifest = await engine.package({ orgId: "org-e2e", artifactRef: "foundry://skill/v2", metadata: { version: "2.0" } });
    const runtime = await engine.deployType2(manifest);
    const skill = await skillRegistry.register({ skillId: manifest.releaseId, skillVersion: "2.0", meta: { endpoint: runtime.invokeEndpoint } });
    const rb = await rollbackSvc.executeRollback({
      releaseId: manifest.releaseId,
      fromVersion: "2.0",
      toVersion: "1.9",
      reason: "blue/green rollback",
      requester: "ops",
    });

    expect(runtime.status).toBe("active");
    expect(skill.skillId).toBe(manifest.releaseId);
    expect(rb.releaseId).toBe(manifest.releaseId);

    const emitCalls = (bus.emit as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
    expect(emitCalls).toContain("launch.completed");
    expect(emitCalls).toContain("launch.skill_registered");
    expect(emitCalls).toContain("launch.rollback.completed");
  });
});
