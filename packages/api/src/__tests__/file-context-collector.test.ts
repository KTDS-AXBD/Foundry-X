import { describe, it, expect } from "vitest";
import {
  parseImports, resolveImportPath, estimateTokens, truncateToTokens, FileContextCollector,
} from "../core/harness/services/file-context-collector.js";

describe("parseImports", () => {
  it("ESM import", () => {
    expect(parseImports(`import { foo } from "./bar.js";\nimport baz from "../qux.ts";`)).toEqual(["./bar.js", "../qux.ts"]);
  });
  it("require", () => {
    expect(parseImports(`const x = require("./utils.js");`)).toEqual(["./utils.js"]);
  });
  it("re-export", () => {
    expect(parseImports(`export { foo } from "./types.js";`)).toEqual(["./types.js"]);
  });
  it("filters node_modules", () => {
    expect(parseImports(`import { z } from "zod";\nimport x from "./local.js";`)).toEqual(["./local.js"]);
  });
  it("deduplicates", () => {
    expect(parseImports(`import { a } from "./x.js";\nimport { b } from "./x.js";`)).toEqual(["./x.js"]);
  });
});

describe("resolveImportPath", () => {
  it("relative", () => { expect(resolveImportPath("src/services/foo.ts", "./bar.js")).toBe("src/services/bar.ts"); });
  it("..", () => { expect(resolveImportPath("src/services/foo.ts", "../types.js")).toBe("src/types.ts"); });
  it("adds .ts", () => { expect(resolveImportPath("src/foo.ts", "./bar")).toBe("src/bar.ts"); });
  it(".js -> .ts", () => { expect(resolveImportPath("src/foo.ts", "./bar.js")).toBe("src/bar.ts"); });
});

describe("estimateTokens", () => {
  it("~3 chars/token", () => { expect(estimateTokens("abcdef")).toBe(2); });
});

describe("truncateToTokens", () => {
  it("within budget", () => { expect(truncateToTokens("short", 100)).toBe("short"); });
  it("over budget", () => {
    const r = truncateToTokens("a".repeat(100), 10);
    expect(r).toContain("// ... (truncated)");
  });
});

describe("FileContextCollector", () => {
  it("client contents", async () => {
    const c = new FileContextCollector(null, { maxDepth: 0, tokenBudget: 50000, maxFileLines: 500 });
    const r = await c.collect("r", "m", ["a.ts"], { "a.ts": "const x = 1;" });
    expect(r.files).toHaveLength(1);
    expect(r.files[0]!.depth).toBe(0);
  });
  it("depth=1 imports", async () => {
    const c = new FileContextCollector(null, { maxDepth: 1, tokenBudget: 50000, maxFileLines: 500 });
    const r = await c.collect("r", "m", ["src/a.ts"], { "src/a.ts": `import { b } from "./b.js";`, "src/b.ts": "export const b = 2;" });
    expect(r.files).toHaveLength(2);
    expect(r.files.find((f) => f.path === "src/b.ts")!.depth).toBe(1);
  });
  it("budget truncation", async () => {
    const c = new FileContextCollector(null, { maxDepth: 0, tokenBudget: 200, maxFileLines: 500 });
    const r = await c.collect("r", "m", ["a.ts"], { "a.ts": "x".repeat(900) });
    expect(r.files[0]!.truncated).toBe(true);
  });
  it("budget skip", async () => {
    const c = new FileContextCollector(null, { maxDepth: 0, tokenBudget: 5, maxFileLines: 500 });
    const r = await c.collect("r", "m", ["a.ts", "b.ts"], { "a.ts": "x".repeat(100), "b.ts": "y".repeat(100) });
    expect(r.skippedFiles.length).toBeGreaterThan(0);
  });
  it("circular prevention", async () => {
    const c = new FileContextCollector(null, { maxDepth: 1, tokenBudget: 50000, maxFileLines: 500 });
    const r = await c.collect("r", "m", ["src/a.ts"], { "src/a.ts": `import { b } from "./b.js";`, "src/b.ts": `import { a } from "./a.js";` });
    expect(new Set(r.files.map((f) => f.path)).size).toBe(r.files.length);
  });
  it("missing file skipped", async () => {
    const c = new FileContextCollector(null, { maxDepth: 0, tokenBudget: 50000, maxFileLines: 500 });
    const r = await c.collect("r", "m", ["miss.ts"]);
    expect(r.skippedFiles).toContain("miss.ts");
  });
  it("maxFileLines", async () => {
    const c = new FileContextCollector(null, { maxDepth: 0, tokenBudget: 50000, maxFileLines: 3 });
    const r = await c.collect("r", "m", ["a.ts"], { "a.ts": "1\n2\n3\n4\n5" });
    expect(r.files[0]!.truncated).toBe(true);
    expect(r.files[0]!.lineCount).toBe(5);
  });
});
