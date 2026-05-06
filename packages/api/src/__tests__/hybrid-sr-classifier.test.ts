import { describe, it, expect, vi } from "vitest";
import { HybridSrClassifier, extractJson, validateSrType } from "../core/sr/services/hybrid-sr-classifier.js";
import { LLMService } from "../core/infra/llm.js";

function mockLlm(response?: { srType: string; confidence: number }, shouldFail = false): LLMService {
  const llm = new LLMService(undefined, undefined);
  if (shouldFail) {
    vi.spyOn(llm, "generate").mockRejectedValue(new Error("LLM unavailable"));
  } else if (response) {
    vi.spyOn(llm, "generate").mockResolvedValue({
      content: JSON.stringify(response),
      model: "test",
      tokensUsed: 10,
    });
  }
  return llm;
}

describe("HybridSrClassifier", () => {
  it("rule only — high confidence (>= 0.7) skips LLM", async () => {
    const llm = mockLlm({ srType: "bug_fix", confidence: 0.9 });
    const classifier = new HybridSrClassifier(llm);
    // security_patch: 9/9 keywords match → confidence = 0.85
    const result = await classifier.classify("보안 취약점 cve 패치 xss csrf injection vulnerability security", "");
    expect(result.method).toBe("rule");
    expect(result.srType).toBe("security_patch");
    expect(llm.generate).not.toHaveBeenCalled();
  });

  it("llm fallback — low confidence triggers LLM call", async () => {
    const llm = mockLlm({ srType: "bug_fix", confidence: 0.85 });
    const classifier = new HybridSrClassifier(llm);
    // Ambiguous text yields low rule confidence
    const result = await classifier.classify("잡다한 작업", "뭔가 처리");
    expect(llm.generate).toHaveBeenCalled();
    expect(result.srType).toBe("bug_fix");
    expect(result.confidence).toBe(0.85);
  });

  it("hybrid merge — same type uses weighted average", async () => {
    // code_change with low keywords → low confidence
    const llm = mockLlm({ srType: "code_change", confidence: 0.8 });
    const classifier = new HybridSrClassifier(llm);
    const result = await classifier.classify("기능 요청", "");
    expect(llm.generate).toHaveBeenCalled();
    expect(result.method).toBe("hybrid");
    // Weighted: rule * 0.4 + llm * 0.6
    expect(result.ruleConfidence).toBeDefined();
    expect(result.llmConfidence).toBe(0.8);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("hybrid merge — different types picks higher confidence", async () => {
    const llm = mockLlm({ srType: "security_patch", confidence: 0.95 });
    const classifier = new HybridSrClassifier(llm);
    // Rule says code_change with low confidence, LLM says security_patch with 0.95
    const result = await classifier.classify("잡다한 작업", "");
    expect(result.srType).toBe("security_patch");
    expect(result.method).toBe("llm");
    expect(result.confidence).toBe(0.95);
  });

  it("hybrid merge — rule wins when higher confidence", async () => {
    const llm = mockLlm({ srType: "doc_update", confidence: 0.3 });
    const classifier = new HybridSrClassifier(llm);
    const result = await classifier.classify("잡다한 작업", "");
    expect(result.method).toBe("rule");
    expect(result.ruleConfidence).toBe(0.5);
  });

  it("llm failure — graceful fallback to rule result", async () => {
    const llm = mockLlm(undefined, true);
    const classifier = new HybridSrClassifier(llm);
    const result = await classifier.classify("잡다한 작업", "");
    expect(result.method).toBe("rule");
    expect(result.srType).toBe("code_change");
    expect(result.confidence).toBe(0.5);
  });

  it("llm returns invalid type — fallback to rule", async () => {
    const llm = new LLMService(undefined, undefined);
    vi.spyOn(llm, "generate").mockResolvedValue({
      content: JSON.stringify({ srType: "invalid_type", confidence: 0.9 }),
      model: "test",
      tokensUsed: 10,
    });
    const classifier = new HybridSrClassifier(llm);
    const result = await classifier.classify("잡다한 작업", "");
    expect(result.method).toBe("rule");
  });

  it("llm returns unparseable response — fallback to rule", async () => {
    const llm = new LLMService(undefined, undefined);
    vi.spyOn(llm, "generate").mockResolvedValue({
      content: "I cannot classify this request.",
      model: "test",
      tokensUsed: 10,
    });
    const classifier = new HybridSrClassifier(llm);
    const result = await classifier.classify("잡다한 작업", "");
    expect(result.method).toBe("rule");
  });

  it("custom threshold respected", async () => {
    const llm = mockLlm({ srType: "bug_fix", confidence: 0.9 });
    // Very high threshold: even strong rule matches will trigger LLM
    const classifier = new HybridSrClassifier(llm, 0.99);
    const result = await classifier.classify("보안 취약점 패치", "XSS");
    expect(llm.generate).toHaveBeenCalled();
  });

  it("result includes suggestedWorkflow", async () => {
    const llm = mockLlm({ srType: "env_config", confidence: 0.9 });
    const classifier = new HybridSrClassifier(llm);
    const result = await classifier.classify("잡다한 작업", "");
    expect(result.suggestedWorkflow).toMatch(/^sr-/);
  });
});

describe("extractJson", () => {
  it("parses raw JSON", () => {
    const result = extractJson('{"srType": "bug_fix", "confidence": 0.8}');
    expect(result).toEqual({ srType: "bug_fix", confidence: 0.8 });
  });

  it("parses markdown-wrapped JSON", () => {
    const result = extractJson('```json\n{"srType": "bug_fix", "confidence": 0.8}\n```');
    expect(result).toEqual({ srType: "bug_fix", confidence: 0.8 });
  });

  it("extracts JSON from surrounding text", () => {
    const result = extractJson('The classification is {"srType": "env_config", "confidence": 0.7} based on analysis.');
    expect(result).toEqual({ srType: "env_config", confidence: 0.7 });
  });

  it("returns null for completely invalid input", () => {
    expect(extractJson("no json here at all")).toBeNull();
  });

  it("handles empty string", () => {
    expect(extractJson("")).toBeNull();
  });
});

describe("validateSrType", () => {
  it("valid types return true", () => {
    expect(validateSrType("code_change")).toBe(true);
    expect(validateSrType("bug_fix")).toBe(true);
    expect(validateSrType("env_config")).toBe(true);
    expect(validateSrType("doc_update")).toBe(true);
    expect(validateSrType("security_patch")).toBe(true);
  });

  it("invalid types return false", () => {
    expect(validateSrType("invalid")).toBe(false);
    expect(validateSrType("")).toBe(false);
    expect(validateSrType("BUG_FIX")).toBe(false);
  });
});
