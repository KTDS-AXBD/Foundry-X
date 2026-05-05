// F609: TDD Red — types.ts contract verification
import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";

const API_ROOT = path.resolve(__dirname, "../..");
const CORE_DIR = path.join(API_ROOT, "src/core");

describe("F609: types.ts contract", () => {
  const DOMAINS_WITH_CONTRACT = [
    "agent",
    "harness",
    "discovery",
    "collection",
    "shaping",
    "offering",
    "spec",
    "verification",
    "decode-bridge",
    "events",
    "files",
    "sr",
    "entity",
    "work",
  ];

  it("all 14 domains have types.ts", () => {
    const missing = DOMAINS_WITH_CONTRACT.filter(
      (d) => !fs.existsSync(path.join(CORE_DIR, d, "types.ts"))
    );
    expect(missing, `Missing types.ts for domains: ${missing.join(", ")}`).toHaveLength(0);
  });

  it("baseline fingerprint count is reduced below 160", () => {
    const baselinePath = path.join(API_ROOT, ".eslint-baseline.json");
    expect(fs.existsSync(baselinePath)).toBe(true);
    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    const count = baseline.fingerprints?.length ?? 0;
    // F608 161 → F609 77 → F610 142 → F611 27 → F612 1 → F613 0 (Pass 시리즈 종결, S333)
    // count >= 0 (baseline JSON 자체는 항상 존재, 0 도달이 시리즈 종결 증명)
    expect(count).toBeLessThan(160);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("agent/types.ts re-exports required symbols", () => {
    const typesPath = path.join(CORE_DIR, "agent", "types.ts");
    expect(fs.existsSync(typesPath)).toBe(true);
    const content = fs.readFileSync(typesPath, "utf8");
    // Key symbols used by external callers
    expect(content).toContain("AgentRunner");
    expect(content).toContain("AgentExecutionResult");
    expect(content).toContain("PromptGatewayService");
  });
});
