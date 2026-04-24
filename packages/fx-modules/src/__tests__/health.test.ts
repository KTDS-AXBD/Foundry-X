// F572 TDD Red: fx-modules health endpoints + cross-domain import guard
import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import app from "../app.js";

describe("F572 — fx-modules health endpoints", () => {
  it("GET /api/portal/health → 200 { domain: portal }", async () => {
    const res = await app.request("/api/portal/health");
    expect(res.status).toBe(200);
    const body = await res.json() as { domain: string; status: string };
    expect(body.domain).toBe("portal");
    expect(body.status).toBe("ok");
  });

  it("GET /api/gate/health → 200 { domain: gate }", async () => {
    const res = await app.request("/api/gate/health");
    expect(res.status).toBe(200);
    const body = await res.json() as { domain: string; status: string };
    expect(body.domain).toBe("gate");
    expect(body.status).toBe("ok");
  });

  it("GET /api/launch/health → 200 { domain: launch }", async () => {
    const res = await app.request("/api/launch/health");
    expect(res.status).toBe(200);
    const body = await res.json() as { domain: string; status: string };
    expect(body.domain).toBe("launch");
    expect(body.status).toBe("ok");
  });
});

describe("F572 — cross-domain import guard", () => {
  const CORE_DIR = join(import.meta.dirname, "../core");

  function collectTsFiles(dir: string): string[] {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...collectTsFiles(fullPath));
        } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
          files.push(fullPath);
        }
      }
      return files;
    } catch {
      return [];
    }
  }

  function checkNoCrossImport(
    srcDomain: string,
    forbiddenDomains: string[],
  ): string[] {
    const srcDir = join(CORE_DIR, srcDomain);
    const files = collectTsFiles(srcDir);
    const violations: string[] = [];
    for (const file of files) {
      const { readFileSync } = require("node:fs");
      const content = readFileSync(file, "utf-8") as string;
      for (const forbidden of forbiddenDomains) {
        if (content.includes(`core/${forbidden}`) || content.includes(`/${forbidden}/`)) {
          violations.push(`${file} imports from core/${forbidden}`);
        }
      }
    }
    return violations;
  }

  it("core/portal has no imports from core/gate or core/launch", () => {
    const violations = checkNoCrossImport("portal", ["gate", "launch"]);
    expect(violations).toHaveLength(0);
  });

  it("core/gate has no imports from core/launch", () => {
    const violations = checkNoCrossImport("gate", ["launch"]);
    expect(violations).toHaveLength(0);
  });

  it("core/launch has no imports from core/portal or core/gate", () => {
    const violations = checkNoCrossImport("launch", ["portal", "gate"]);
    expect(violations).toHaveLength(0);
  });
});
