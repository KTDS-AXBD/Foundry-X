import { describe, it, expect, vi, beforeEach } from "vitest";

// Real SPEC.md 5-column format:
// | F# | 제목 (FX-REQ-NNN, P#) | 버전 | 상태(이모지) | 비고 |
const MOCK_SPEC_CONTENT = vi.hoisted(() => `
## §5 기능 항목 (F-items)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F1 | 모노리포 scaffolding (FX-REQ-001, P1) | v0.1 | ✅ | pnpm workspace + Turborepo |
| F2 | 공유 타입 모듈 (FX-REQ-002, P1) | v0.1 | ✅ | packages/shared |
| F3 | Harness 모듈 (FX-REQ-003, P1) | v0.1 | 🔧 | detect, discover |
| F4 | PlumbBridge (FX-REQ-004, P1) | v0.1 | 📋 | bridge, errors |
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
    expect(data.length).toBe(4);
  });

  it("extracts reqCode from title parentheses", async () => {
    const res = await requirementsRoute.request("/requirements");
    const data = await res.json();
    const f1 = data[0];

    expect(f1.id).toBe("F1");
    expect(f1.reqCode).toBe("FX-REQ-001");
    expect(f1.title).toBe("모노리포 scaffolding");
    expect(f1.version).toBe("v0.1");
    expect(f1.note).toBe("pnpm workspace + Turborepo");
  });

  it("parses ✅ emoji as done status", async () => {
    const res = await requirementsRoute.request("/requirements");
    const data = await res.json();
    expect(data[0].status).toBe("done");
    expect(data[1].status).toBe("done");
  });

  it("parses 🔧 emoji as in_progress status", async () => {
    const res = await requirementsRoute.request("/requirements");
    const data = await res.json();
    const f3 = data.find((d: any) => d.id === "F3");
    expect(f3.status).toBe("in_progress");
  });

  it("parses 📋 emoji as planned status", async () => {
    const res = await requirementsRoute.request("/requirements");
    const data = await res.json();
    const f4 = data.find((d: any) => d.id === "F4");
    expect(f4.status).toBe("planned");
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
