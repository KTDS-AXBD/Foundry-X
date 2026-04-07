import { describe, it, expect, beforeEach } from "vitest";
import { CommandRegistryService } from "../core/agent/services/command-registry.js";

describe("CommandRegistryService", () => {
  let service: CommandRegistryService;

  const sampleCommand = {
    namespace: "foundry",
    name: "sync",
    description: "Sync spec with code",
    argsSchema: { path: { type: "string" } },
    handler: "foundry-sync-handler",
    requiredPermissions: ["repo:read", "spec:write"],
    enabled: true,
  };

  beforeEach(() => {
    service = new CommandRegistryService();
  });

  it("registers and retrieves a command", () => {
    const created = service.register("org_test", sampleCommand);

    expect(created.id).toBeDefined();
    expect(created.namespace).toBe("foundry");
    expect(created.name).toBe("sync");
    expect(created.handler).toBe("foundry-sync-handler");
    expect(created.orgId).toBe("org_test");
    expect(created.enabled).toBe(true);

    const retrieved = service.getByName("org_test", "foundry", "sync");
    expect(retrieved).toEqual(created);
  });

  it("executes a command and returns mock result", () => {
    service.register("org_test", sampleCommand);

    const result = service.execute("org_test", "foundry", "sync", { path: "/src" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("foundry/sync");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns error when executing non-existent command", () => {
    const result = service.execute("org_test", "unknown", "cmd", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("returns error when executing disabled command", () => {
    service.register("org_test", { ...sampleCommand, enabled: false });

    const result = service.execute("org_test", "foundry", "sync", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("disabled");
  });

  it("lists by namespace with org isolation", () => {
    service.register("org_a", sampleCommand);
    service.register("org_a", { ...sampleCommand, namespace: "foundry", name: "review" });
    service.register("org_a", { ...sampleCommand, namespace: "plumb", name: "check" });
    service.register("org_b", sampleCommand);

    const foundryList = service.listByNamespace("org_a", "foundry");
    expect(foundryList).toHaveLength(2);

    const plumbList = service.listByNamespace("org_a", "plumb");
    expect(plumbList).toHaveLength(1);

    const allOrgA = service.listByNamespace("org_a");
    expect(allOrgA).toHaveLength(3);

    const allOrgB = service.listByNamespace("org_b");
    expect(allOrgB).toHaveLength(1);
  });

  it("updates a command", () => {
    const created = service.register("org_test", sampleCommand);

    const updated = service.update(created.id, { description: "Updated description", enabled: false });
    expect(updated).not.toBeNull();
    expect(updated!.description).toBe("Updated description");
    expect(updated!.enabled).toBe(false);
    expect(updated!.name).toBe("sync"); // unchanged
  });

  it("returns null when updating non-existent command", () => {
    expect(service.update("non-existent", { description: "test" })).toBeNull();
  });

  it("removes a command", () => {
    const created = service.register("org_test", sampleCommand);
    expect(service.remove(created.id)).toBe(true);
    expect(service.getByName("org_test", "foundry", "sync")).toBeNull();
  });

  it("returns false when removing non-existent command", () => {
    expect(service.remove("non-existent")).toBe(false);
  });

  it("lists unique namespaces", () => {
    service.register("org_test", sampleCommand);
    service.register("org_test", { ...sampleCommand, namespace: "plumb", name: "check" });
    service.register("org_test", { ...sampleCommand, namespace: "foundry", name: "review" });
    service.register("org_other", { ...sampleCommand, namespace: "other", name: "cmd" });

    const namespaces = service.listNamespaces("org_test");
    expect(namespaces).toHaveLength(2);
    expect(namespaces).toContain("foundry");
    expect(namespaces).toContain("plumb");
  });

  it("returns null for non-existent getByName", () => {
    expect(service.getByName("org_test", "no", "such")).toBeNull();
  });
});
