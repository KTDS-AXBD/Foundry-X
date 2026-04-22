// F567: k6 script 구조 검증 테스트 (TDD Red)
// vitest에서 실행하지 않고 node --test로 실행 (k6는 별도 런타임)
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(__dirname, "../multi-hop-latency.js");
const baselinePath = join(__dirname, "../single-hop-baseline.js");

describe("multi-hop-latency.js", () => {
  it("파일이 존재한다", () => {
    const content = readFileSync(scriptPath, "utf-8");
    assert.ok(content.length > 0);
  });

  it("options export가 존재한다", () => {
    const content = readFileSync(scriptPath, "utf-8");
    assert.ok(content.includes("export const options"), "options export 없음");
  });

  it("thresholds에 p95 < 300ms SLO가 정의되어 있다", () => {
    const content = readFileSync(scriptPath, "utf-8");
    assert.ok(
      content.includes("p(95)<300") || content.includes("p(95) < 300"),
      "SLO threshold p95 < 300ms 없음",
    );
  });

  it("scenarios가 정의되어 있다", () => {
    const content = readFileSync(scriptPath, "utf-8");
    assert.ok(content.includes("scenarios"), "scenarios 없음");
  });

  it("gateway 엔드포인트 URL이 포함되어 있다", () => {
    const content = readFileSync(scriptPath, "utf-8");
    assert.ok(
      content.includes("fx-gateway") || content.includes("GATEWAY_URL"),
      "gateway URL 없음",
    );
  });

  it("default export 함수가 있다", () => {
    const content = readFileSync(scriptPath, "utf-8");
    assert.ok(content.includes("export default function"), "default export function 없음");
  });
});

describe("single-hop-baseline.js", () => {
  it("baseline 스크립트가 존재한다", () => {
    const content = readFileSync(baselinePath, "utf-8");
    assert.ok(content.length > 0);
  });

  it("baseline thresholds는 gateway보다 낮다 (p95 < 200ms)", () => {
    const content = readFileSync(baselinePath, "utf-8");
    assert.ok(
      content.includes("p(95)<200") || content.includes("p(95) < 200"),
      "baseline SLO p95 < 200ms 없음",
    );
  });
});
