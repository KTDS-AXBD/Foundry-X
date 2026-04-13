// F528 Graph Orchestration (L3) — SteeringHandler TDD Red Phase
import { describe, it, expect } from "vitest";
import { ConcreteSteeringHandler } from "../../core/agent/orchestration/steering-handler.js";
import type { SteeringRule } from "../../core/agent/orchestration/steering-handler.js";

describe("F528 SteeringHandler", () => {
  it("beforeTool: 규칙 매칭 시 Interrupt를 반환한다", async () => {
    const rule: SteeringRule = {
      matchTool: (name) => name === "delete_file",
      onBeforeTool: async () => ({ action: "interrupt", message: "Deletion not allowed" }),
      matchOutput: () => false,
      onAfterModel: async () => ({ action: "proceed" }),
    };

    const handler = new ConcreteSteeringHandler([rule]);
    const result = await handler.beforeTool("delete_file", { path: "/tmp/test" });

    expect(result.action).toBe("interrupt");
    expect(result.message).toBe("Deletion not allowed");
  });

  it("beforeTool: 규칙 불일치 시 Proceed를 반환한다", async () => {
    const rule: SteeringRule = {
      matchTool: (name) => name === "dangerous_tool",
      onBeforeTool: async () => ({ action: "interrupt" }),
      matchOutput: () => false,
      onAfterModel: async () => ({ action: "proceed" }),
    };

    const handler = new ConcreteSteeringHandler([rule]);
    const result = await handler.beforeTool("read_file", {});

    expect(result.action).toBe("proceed");
  });

  it("afterModel: 규칙 매칭 시 Guide 메시지를 반환한다", async () => {
    const rule: SteeringRule = {
      matchTool: () => false,
      onBeforeTool: async () => ({ action: "proceed" }),
      matchOutput: (output) => output.includes("ERROR"),
      onAfterModel: async () => ({ action: "guide", message: "Please correct the error" }),
    };

    const handler = new ConcreteSteeringHandler([rule]);
    const result = await handler.afterModel("ERROR: something went wrong");

    expect(result.action).toBe("guide");
    expect(result.message).toBe("Please correct the error");
  });

  it("afterModel: 빈 규칙 배열 시 항상 Proceed를 반환한다", async () => {
    const handler = new ConcreteSteeringHandler([]);
    const result = await handler.afterModel("any output");

    expect(result.action).toBe("proceed");
  });
});
