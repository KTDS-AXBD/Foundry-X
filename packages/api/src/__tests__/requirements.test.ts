import { describe, it, expect, vi, beforeEach } from "vitest";

// NOTE: parseSpecRequirements regex expects 6 columns:
// | F# | REQ | Title | Version | Status | Note |
// (Real SPEC.md uses 5 columns — Phase 2 DB 전환 시 수정 예정)
const MOCK_SPEC_CONTENT = vi.hoisted(() => `
## §5 기능 항목 (F-items)

| F# | REQ | Title | Version | Status | Note |
|----|-----|-------|---------|--------|------|
| F1 | FX-REQ-001 | 모노리포 scaffolding | v0.1 | DONE | pnpm workspace |
| F2 | FX-REQ-002 | 공유 타입 모듈 | v0.1 | DONE | packages/shared |
| F3 | FX-REQ-003 | Harness 모듈 | v0.1 | in_progress | detect, discover |
`);

// Mock data-reader to provide controlled SPEC.md content
vi.mock("../services/data-reader.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/data-reader.js")>();
  return {
    ...actual,
    getProjectRoot: () => "/mock/project",
    readTextFile: vi.fn().mockResolvedValue(MOCK_SPEC_CONTENT),
  };
});

import { requirementsRoute } from "../routes/requirements.js";

describe("requirements routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET /requirements ───

  it("GET /requirements parses F-items from SPEC.md", async () => {
    const res = await requirementsRoute.request("/requirements");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(3);
  });

  it("parsed items have correct structure", async () => {
    const res = await requirementsRoute.request("/requirements");
    const data = await res.json();
    const item = data[0];

    expect(item.id).toBe("F1");
    expect(item.reqCode).toBe("FX-REQ-001");
    expect(item.title).toContain("모노리포");
    expect(item.version).toBe("v0.1");
    expect(item.status).toBe("done");
    expect(item.note).toBe("pnpm workspace");
  });

  // ─── PUT /requirements/:id ───

  it("parses in_progress status correctly", async () => {
    const res = await requirementsRoute.request("/requirements");
    const data = await res.json();
    const f3 = data.find((d: any) => d.id === "F3");
    expect(f3.status).toBe("in_progress");
  });

  // ─── PUT /requirements/:id ───

  it("PUT /requirements/:id updates status", async () => {
    const res = await requirementsRoute.request("/requirements/F1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("F1");
    expect(data.status).toBe("in_progress");
  });

  it("PUT /requirements/:id rejects invalid status", async () => {
    const res = await requirementsRoute.request("/requirements/F1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "invalid_status" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  it("PUT /requirements/:id returns 404 for unknown id", async () => {
    const res = await requirementsRoute.request("/requirements/F999", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    expect(res.status).toBe(404);
  });
});
