import { describe, it, expect } from "vitest";
import { TASK_TYPE_TO_MCP_TOOL } from "../services/mcp-adapter.js";
import type { McpMessage, McpResponse } from "../services/mcp-adapter.js";

describe("MCP Adapter", () => {
  it("TASK_TYPE_TO_MCP_TOOL maps all 4 task types", () => {
    expect(TASK_TYPE_TO_MCP_TOOL["code-review"]).toBe("foundry_code_review");
    expect(TASK_TYPE_TO_MCP_TOOL["code-generation"]).toBe("foundry_code_gen");
    expect(TASK_TYPE_TO_MCP_TOOL["spec-analysis"]).toBe("foundry_spec_analyze");
    expect(TASK_TYPE_TO_MCP_TOOL["test-generation"]).toBe("foundry_test_gen");
    expect(Object.keys(TASK_TYPE_TO_MCP_TOOL)).toHaveLength(4);
  });

  it("MCP message types have correct structure", () => {
    const message: McpMessage = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "foundry_code_review", arguments: { files: [] } },
      id: "1",
    };
    expect(message.jsonrpc).toBe("2.0");
    expect(message.method).toBe("tools/call");

    const response: McpResponse = {
      jsonrpc: "2.0",
      result: { content: [{ type: "text", text: "review done" }] },
      id: "1",
    };
    expect(response.result).toBeDefined();
    expect(response.error).toBeUndefined();
  });
});
