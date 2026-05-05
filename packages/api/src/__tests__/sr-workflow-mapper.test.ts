import { describe, it, expect } from "vitest";
import { SrWorkflowMapper } from "../core/sr/services/sr-workflow-mapper.js";
import type { SrType } from "../core/sr/schemas/sr.js";

describe("SrWorkflowMapper", () => {
  const m = new SrWorkflowMapper();
  it("code_change", () => { const t = m.getWorkflowForType("code_change"); expect(t.id).toBe("sr-code-change"); expect(t.nodes).toHaveLength(5); });
  it("bug_fix", () => { const t = m.getWorkflowForType("bug_fix"); expect(t.id).toBe("sr-bug-fix"); expect(t.nodes).toHaveLength(6); });
  it("env_config", () => { const t = m.getWorkflowForType("env_config"); expect(t.id).toBe("sr-env-config"); expect(t.nodes).toHaveLength(4); });
  it("doc_update", () => { const t = m.getWorkflowForType("doc_update"); expect(t.id).toBe("sr-doc-update"); expect(t.nodes).toHaveLength(4); });
  it("security_patch", () => { const t = m.getWorkflowForType("security_patch"); expect(t.id).toBe("sr-security-patch"); expect(t.nodes).toHaveLength(4); });
  it("unknown → throw", () => { expect(() => m.getWorkflowForType("unknown" as SrType)).toThrow("Unknown SR type"); });
});
