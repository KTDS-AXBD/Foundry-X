import { describe, it, expect } from "vitest";
import { noCrossServiceImport } from "../../src/eslint/no-cross-service-import.js";

describe("no-cross-service-import ESLint rule", () => {
  it("should have correct meta type", () => {
    expect(noCrossServiceImport.meta.type).toBe("problem");
  });

  it("should have noCrossImport message", () => {
    expect(noCrossServiceImport.meta.messages.noCrossImport).toContain(
      "cannot import from",
    );
  });

  it("should return empty handlers for files outside module boundaries", () => {
    const context = {
      filename: "/project/packages/api/src/utils/helper.ts",
      options: [],
      report: () => {},
    };
    const handlers = noCrossServiceImport.create(context);
    expect(handlers).toEqual({});
  });

  it("should return ImportDeclaration handler for files in module boundaries", () => {
    const context = {
      filename: "/project/packages/api/src/core/discovery/routes.ts",
      options: [],
      report: () => {},
    };
    const handlers = noCrossServiceImport.create(context);
    expect(handlers).toHaveProperty("ImportDeclaration");
  });

  it("should report cross-module import violation", () => {
    const reports: Array<{ messageId: string; data: Record<string, string> }> = [];
    const context = {
      filename: "/project/packages/api/src/modules/auth/service.ts",
      options: [],
      report: (desc: { messageId: string; data: Record<string, string> }) => {
        reports.push(desc);
      },
    };

    const handlers = noCrossServiceImport.create(context);
    // Simulate an import from modules/gate (not allowed for auth)
    if (handlers.ImportDeclaration) {
      handlers.ImportDeclaration({
        source: { value: "../../modules/gate/validator.js" },
      });
    }

    expect(reports.length).toBe(1);
    expect(reports[0].messageId).toBe("noCrossImport");
    expect(reports[0].data.source).toBe("modules/auth");
    expect(reports[0].data.target).toBe("modules/gate");
  });

  it("should allow import from shared (allowed dependency)", () => {
    const reports: unknown[] = [];
    const context = {
      filename: "/project/packages/api/src/modules/auth/service.ts",
      options: [],
      report: (desc: unknown) => {
        reports.push(desc);
      },
    };

    const handlers = noCrossServiceImport.create(context);
    if (handlers.ImportDeclaration) {
      handlers.ImportDeclaration({
        source: { value: "../shared/types.js" },
      });
    }

    expect(reports.length).toBe(0);
  });

  it("should skip non-relative imports", () => {
    const reports: unknown[] = [];
    const context = {
      filename: "/project/packages/api/src/modules/auth/service.ts",
      options: [],
      report: (desc: unknown) => {
        reports.push(desc);
      },
    };

    const handlers = noCrossServiceImport.create(context);
    if (handlers.ImportDeclaration) {
      handlers.ImportDeclaration({
        source: { value: "hono" },
      });
    }

    expect(reports.length).toBe(0);
  });

  it("should allow core/discovery to import from core/shaping", () => {
    const reports: unknown[] = [];
    const context = {
      filename: "/project/packages/api/src/core/discovery/service.ts",
      options: [],
      report: (desc: unknown) => {
        reports.push(desc);
      },
    };

    const handlers = noCrossServiceImport.create(context);
    if (handlers.ImportDeclaration) {
      handlers.ImportDeclaration({
        source: { value: "../core/shaping/types.js" },
      });
    }

    expect(reports.length).toBe(0);
  });
});
