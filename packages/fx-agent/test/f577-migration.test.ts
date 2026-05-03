import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import path from "path";

const ROOT = path.resolve(__dirname, "../../..");

function shell(cmd: string): string {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function count(cmd: string): number {
  const out = shell(cmd);
  return out === "" ? 0 : parseInt(out, 10);
}

// F577 P-a through P-g migration verification tests
describe("F577 Migration — packages/api/src/agent → 0", () => {
  it("P-a: agent/routes has 0 files", () => {
    const n = count(
      "find packages/api/src/agent/routes -type f 2>/dev/null | wc -l"
    );
    expect(n).toBe(0);
  });

  it("P-b: fx-agent/test has >= 90 test files", () => {
    const n = count(
      "find packages/fx-agent/test -name '*.test.ts' 2>/dev/null | wc -l"
    );
    expect(n).toBeGreaterThanOrEqual(90);
  });

  it("P-c: agent/services has 0 files", () => {
    const n = count(
      "find packages/api/src/agent/services -type f 2>/dev/null | wc -l"
    );
    expect(n).toBe(0);
  });

  it("P-d: no external api/src non-test files import from agent/", () => {
    const n = count(
      `grep -rln "from.*['\"].*agent/" packages/api/src | grep -v '\\.test\\.ts' | grep -v '^packages/api/src/agent' | wc -l`
    );
    expect(n).toBe(0);
  });

  it("P-e: agent/ has 0 cross-domain deps to core domains", () => {
    const n = count(
      `grep -rE "from ['\\"]\\.\\.\\/.*core\\/(discovery|offering|shaping|gateway|ontology|verification|prototype)\\/" packages/api/src/agent --include="*.ts" 2>/dev/null | grep -v '\\.test\\.ts' | wc -l`
    );
    expect(n).toBe(0);
  });

  it("P-f: orchestration/streaming/runtime/schemas/specs have 0 files", () => {
    const n = count(
      `find packages/api/src/agent/orchestration packages/api/src/agent/streaming packages/api/src/agent/runtime packages/api/src/agent/schemas packages/api/src/agent/specs -type f 2>/dev/null | wc -l`
    );
    expect(n).toBe(0);
  });

  it("P-g: packages/api/src/agent has 0 files total", () => {
    const n = count(
      "find packages/api/src/agent -type f 2>/dev/null | wc -l"
    );
    expect(n).toBe(0);
  });
});
