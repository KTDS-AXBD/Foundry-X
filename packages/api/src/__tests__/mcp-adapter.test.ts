import { describe, it, expect } from "vitest";
import { TASK_TYPE_TO_MCP_TOOL } from "../core/agent/services/mcp-adapter.js";
import type { McpMessage, McpResponse } from "../core/agent/services/mcp-adapter.js";

describe("MCP Adapter", () => {
  it("TASK_TYPE_TO_MCP_TOOL maps all 14 task types", () => {
    expect(TASK_TYPE_TO_MCP_TOOL["code-review"]).toBe("foundry_code_review");
    expect(TASK_TYPE_TO_MCP_TOOL["code-generation"]).toBe("foundry_code_gen");
    expect(TASK_TYPE_TO_MCP_TOOL["spec-analysis"]).toBe("foundry_spec_analyze");
    expect(TASK_TYPE_TO_MCP_TOOL["test-generation"]).toBe("foundry_test_gen");
    // Phase 1-3: AI Foundry 역공학 자산 연동
    expect(TASK_TYPE_TO_MCP_TOOL["policy-evaluation"]).toBe("foundry_policy_eval");
    expect(TASK_TYPE_TO_MCP_TOOL["skill-query"]).toBe("foundry_skill_query");
    expect(TASK_TYPE_TO_MCP_TOOL["ontology-lookup"]).toBe("foundry_ontology_lookup");
    expect(TASK_TYPE_TO_MCP_TOOL["security-review"]).toBe("foundry_security_review");
    expect(TASK_TYPE_TO_MCP_TOOL["qa-testing"]).toBe("foundry_qa_testing");
    // Phase 15+: BD/Discovery 확장
    expect(TASK_TYPE_TO_MCP_TOOL["infra-analysis"]).toBe("foundry_infra_analysis");
    expect(TASK_TYPE_TO_MCP_TOOL["bmc-generation"]).toBe("foundry_bmc_generation");
    expect(TASK_TYPE_TO_MCP_TOOL["bmc-insight"]).toBe("foundry_bmc_insight");
    expect(TASK_TYPE_TO_MCP_TOOL["market-summary"]).toBe("foundry_market_summary");
    expect(TASK_TYPE_TO_MCP_TOOL["discovery-analysis"]).toBe("foundry_discovery_analysis");
    expect(Object.keys(TASK_TYPE_TO_MCP_TOOL)).toHaveLength(14);
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
