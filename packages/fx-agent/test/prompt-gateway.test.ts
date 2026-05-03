import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromptGatewayService } from "../src/services/prompt-gateway.js";
import type { SanitizationRule } from "../src/services/prompt-gateway.js";

function createMockDb() {
  return {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
  } as any;
}

describe("PromptGatewayService", () => {
  let db: ReturnType<typeof createMockDb>;
  let gw: PromptGatewayService;

  beforeEach(() => {
    db = createMockDb();
    gw = new PromptGatewayService(db);
  });

  // ─── sanitizePrompt ───

  it("masks API key patterns", async () => {
    const input = 'const api_key = "sk-1234567890abcdef"';
    const result = await gw.sanitizePrompt(input);

    expect(result.sanitizedContent).toContain("[REDACTED_SECRET]");
    expect(result.sanitizedContent).not.toContain("sk-1234567890abcdef");
    expect(result.appliedRules.some((r) => r.ruleId === "default-secret")).toBe(true);
  });

  it("masks password patterns", async () => {
    const input = 'password: "mypassword123"';
    const result = await gw.sanitizePrompt(input);

    expect(result.sanitizedContent).toContain("[REDACTED_PASSWORD]");
    expect(result.sanitizedContent).not.toContain("mypassword123");
    expect(result.appliedRules.some((r) => r.ruleId === "default-password")).toBe(true);
  });

  it("masks internal URL patterns", async () => {
    const input = "fetch('http://internal.company.com/api/users')";
    const result = await gw.sanitizePrompt(input);

    expect(result.sanitizedContent).toContain("[REDACTED_INTERNAL_URL]");
    expect(result.sanitizedContent).not.toContain("internal.company.com");
  });

  it("masks JWT tokens", async () => {
    // A realistic JWT-shaped string
    const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const input = `Authorization: Bearer ${jwt}`;
    const result = await gw.sanitizePrompt(input);

    expect(result.sanitizedContent).toContain("[REDACTED_JWT]");
    expect(result.sanitizedContent).not.toContain("eyJhbGci");
  });

  it("returns original content when no patterns match", async () => {
    const input = "const greeting = 'Hello, world!';";
    const result = await gw.sanitizePrompt(input);

    expect(result.sanitizedContent).toBe(input);
    expect(result.appliedRules).toEqual([]);
  });

  it("applies multiple rules simultaneously", async () => {
    const input = 'api_key = "sk-abcdefghijklmnop" and url http://dev.internal.io/path';
    const result = await gw.sanitizePrompt(input);

    expect(result.sanitizedContent).toContain("[REDACTED_SECRET]");
    expect(result.sanitizedContent).toContain("[REDACTED_INTERNAL_URL]");
    expect(result.appliedRules.length).toBeGreaterThanOrEqual(2);
  });

  it("loads custom rules from D1", async () => {
    db.all.mockResolvedValueOnce({
      results: [
        {
          id: "custom-email",
          pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
          replacement: "[REDACTED_EMAIL]",
          category: "pii",
          enabled: 1,
          created_at: "2026-03-22T00:00:00Z",
        },
      ],
    });

    const input = "Contact user@example.com for details";
    const result = await gw.sanitizePrompt(input);

    expect(result.sanitizedContent).toContain("[REDACTED_EMAIL]");
    expect(result.sanitizedContent).not.toContain("user@example.com");
  });

  it("falls back to DEFAULT_RULES when D1 returns empty", async () => {
    db.all.mockResolvedValueOnce({ results: [] });

    const rules = await gw.loadRules();
    expect(rules.length).toBe(PromptGatewayService.DEFAULT_RULES.length);
    expect(rules[0]!.id).toBe("default-secret");
  });

  it("falls back to DEFAULT_RULES when D1 throws", async () => {
    db.all.mockRejectedValueOnce(new Error("D1 unavailable"));

    const rules = await gw.loadRules();
    expect(rules.length).toBe(PromptGatewayService.DEFAULT_RULES.length);
  });

  // ─── abstractCode ───

  it("extracts export function signatures", () => {
    const files = {
      "src/services/foo.ts": `import { bar } from "./bar.js";

export function processData(input: string): boolean {
  const cleaned = input.trim();
  return cleaned.length > 0;
}

function helperInternal() {
  return true;
}`,
    };

    const result = gw.abstractCode(files);
    const abs = result["src/services/foo.ts"]!;

    expect(abs.filePath).toBe("src/services/foo.ts");
    expect(abs.imports).toContain('import { bar } from "./bar.js";');
    expect(abs.exports.some((e) => e.includes("export function processData"))).toBe(true);
    expect(abs.summary).toContain("export function processData");
  });

  it("preserves imports and exports", () => {
    const files = {
      "src/index.ts": `import { A } from "./a.js";
import { B } from "./b.js";
export { A, B };
export const VERSION = "1.0.0";`,
    };

    const result = gw.abstractCode(files);
    const abs = result["src/index.ts"]!;

    expect(abs.imports.length).toBe(2);
    expect(abs.exports.length).toBe(2);
    expect(abs.lineCount).toBe(4);
  });

  it("extracts class declarations", () => {
    const files = {
      "src/services/gateway.ts": `import { Injectable } from "framework";

export class PromptGatewayService {
  private db: any;
  constructor(db: any) { this.db = db; }
  process() { return "done"; }
}`,
    };

    const result = gw.abstractCode(files);
    const abs = result["src/services/gateway.ts"]!;

    expect(abs.summary).toContain("export class PromptGatewayService");
  });

  // ─── rule behavior ───

  it("skips disabled rules", async () => {
    const rules: SanitizationRule[] = [
      {
        id: "disabled-rule",
        pattern: "hello",
        replacement: "[GONE]",
        category: "custom",
        enabled: false,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];

    const result = gw.applyRules("hello world", rules);
    expect(result.sanitizedContent).toBe("hello world");
    expect(result.appliedRules).toEqual([]);
  });

  it("reports sanitizedLength < originalLength after redaction", async () => {
    const longSecret = 'api_key = "sk-thisisaverylongsecretkeyvalue12345678"';
    const result = await gw.sanitizePrompt(longSecret);

    expect(result.sanitizedLength).toBeLessThan(result.originalLength);
  });

  // ─── listRules ───

  it("listRules returns all rules including defaults", async () => {
    db.all.mockResolvedValueOnce({ results: [] });
    const rules = await gw.listRules();
    expect(rules.length).toBe(4);
    expect(rules.map((r) => r.id)).toContain("default-secret");
    expect(rules.map((r) => r.id)).toContain("default-jwt");
  });
});
