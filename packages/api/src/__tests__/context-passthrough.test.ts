import { describe, it, expect, beforeEach } from "vitest";
import { ContextPassthroughService } from "../agent/services/context-passthrough.js";

describe("ContextPassthroughService", () => {
  let service: ContextPassthroughService;

  const samplePayload = {
    storyId: "STORY-001",
    title: "User Authentication Flow",
    requirements: ["OAuth2 support", "JWT tokens"],
    acceptanceCriteria: ["Login works with Google", "Token refresh works"],
    technicalNotes: "Use PKCE flow",
    relatedFiles: ["src/auth/oauth.ts"],
    priority: "high" as const,
  };

  beforeEach(() => {
    service = new ContextPassthroughService();
  });

  it("creates and retrieves a passthrough", () => {
    const created = service.create("org_test", {
      sourceRole: "architect",
      targetRole: "developer",
      payload: samplePayload,
    });

    expect(created.id).toBeDefined();
    expect(created.sourceRole).toBe("architect");
    expect(created.targetRole).toBe("developer");
    expect(created.status).toBe("pending");
    expect(created.orgId).toBe("org_test");
    expect(created.deliveredAt).toBeNull();
    expect(created.acknowledgedAt).toBeNull();

    const retrieved = service.getById(created.id);
    expect(retrieved).toEqual(created);
  });

  it("delivers a passthrough", () => {
    const created = service.create("org_test", {
      sourceRole: "pm",
      targetRole: "developer",
      payload: samplePayload,
    });

    const delivered = service.deliver(created.id);
    expect(delivered).not.toBeNull();
    expect(delivered!.status).toBe("delivered");
    expect(delivered!.deliveredAt).toBeDefined();
    expect(delivered!.deliveredAt).not.toBeNull();
  });

  it("acknowledges a passthrough", () => {
    const created = service.create("org_test", {
      sourceRole: "pm",
      targetRole: "developer",
      payload: samplePayload,
    });

    const acknowledged = service.acknowledge(created.id);
    expect(acknowledged).not.toBeNull();
    expect(acknowledged!.status).toBe("acknowledged");
    expect(acknowledged!.acknowledgedAt).not.toBeNull();
  });

  it("lists by target role with org isolation", () => {
    service.create("org_a", {
      sourceRole: "pm",
      targetRole: "developer",
      payload: samplePayload,
    });
    service.create("org_a", {
      sourceRole: "architect",
      targetRole: "developer",
      payload: samplePayload,
    });
    service.create("org_a", {
      sourceRole: "pm",
      targetRole: "tester",
      payload: samplePayload,
    });
    service.create("org_b", {
      sourceRole: "pm",
      targetRole: "developer",
      payload: samplePayload,
    });

    const devList = service.listByTarget("org_a", "developer");
    expect(devList).toHaveLength(2);

    const testerList = service.listByTarget("org_a", "tester");
    expect(testerList).toHaveLength(1);

    const orgBList = service.listByTarget("org_b", "developer");
    expect(orgBList).toHaveLength(1);
  });

  it("lists by workflow execution id", () => {
    service.create("org_test", {
      sourceRole: "pm",
      targetRole: "developer",
      payload: samplePayload,
      workflowExecutionId: "wf-123",
    });
    service.create("org_test", {
      sourceRole: "architect",
      targetRole: "developer",
      payload: samplePayload,
      workflowExecutionId: "wf-123",
    });
    service.create("org_test", {
      sourceRole: "pm",
      targetRole: "tester",
      payload: samplePayload,
      workflowExecutionId: "wf-456",
    });

    const wf123 = service.listByWorkflow("wf-123");
    expect(wf123).toHaveLength(2);

    const wf456 = service.listByWorkflow("wf-456");
    expect(wf456).toHaveLength(1);
  });

  it("returns null for non-existent id", () => {
    expect(service.getById("non-existent")).toBeNull();
  });

  it("returns null when delivering non-existent id", () => {
    expect(service.deliver("non-existent")).toBeNull();
  });

  it("returns null when acknowledging non-existent id", () => {
    expect(service.acknowledge("non-existent")).toBeNull();
  });

  it("stores workflowExecutionId as null when not provided", () => {
    const created = service.create("org_test", {
      sourceRole: "pm",
      targetRole: "developer",
      payload: samplePayload,
    });
    expect(created.workflowExecutionId).toBeNull();
  });

  it("preserves payload data through lifecycle", () => {
    const created = service.create("org_test", {
      sourceRole: "pm",
      targetRole: "developer",
      payload: samplePayload,
      workflowExecutionId: "wf-001",
    });

    service.deliver(created.id);
    service.acknowledge(created.id);

    const final = service.getById(created.id);
    expect(final!.payload.storyId).toBe("STORY-001");
    expect(final!.payload.requirements).toEqual(["OAuth2 support", "JWT tokens"]);
    expect(final!.status).toBe("acknowledged");
  });
});
