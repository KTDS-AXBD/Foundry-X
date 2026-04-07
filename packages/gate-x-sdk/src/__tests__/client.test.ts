import { describe, it, expect, vi, beforeEach } from "vitest";
import { GateXClient, GateXRequestError } from "../index.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockOk(body: unknown, status = 200) {
  return Promise.resolve({
    ok: true,
    status,
    json: () => Promise.resolve(body),
  });
}

function mockError(status: number, body: unknown) {
  return Promise.resolve({
    ok: false,
    status,
    statusText: "Error",
    json: () => Promise.resolve(body),
  });
}

describe("GateXClient", () => {
  let client: GateXClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new GateXClient({ apiKey: "test-key", baseUrl: "http://localhost:8787" });
  });

  describe("constructor", () => {
    it("uses default baseUrl when not provided", () => {
      const c = new GateXClient({ apiKey: "k" });
      mockFetch.mockReturnValue(mockOk({ service: "gate-x", status: "ok", ts: "" }));
      void c.health();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("gate-x.ktds-axbd.workers.dev"),
        expect.any(Object),
      );
    });

    it("strips trailing slash from baseUrl", () => {
      const c = new GateXClient({ apiKey: "k", baseUrl: "http://localhost/" });
      mockFetch.mockReturnValue(mockOk({ service: "gate-x", status: "ok", ts: "" }));
      void c.health();
      expect(mockFetch).toHaveBeenCalledWith("http://localhost/api/health", expect.any(Object));
    });
  });

  describe("health()", () => {
    it("calls GET /api/health and returns result", async () => {
      const resp = { service: "gate-x", status: "ok", ts: "2026-01-01T00:00:00.000Z" };
      mockFetch.mockReturnValue(mockOk(resp));
      const result = await client.health();
      expect(result).toEqual(resp);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/health",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer test-key" }) }),
      );
    });
  });

  describe("evaluations", () => {
    it("create() sends POST with body", async () => {
      const eval_ = { id: "e1", title: "Test", status: "draft" };
      mockFetch.mockReturnValue(mockOk(eval_, 201));
      const result = await client.evaluations.create({ title: "Test", gateType: "ax_bd" });
      expect(result).toEqual(eval_);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/gate/ax-bd/evaluations",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ title: "Test", gateType: "ax_bd" }) }),
      );
    });

    it("list() includes query params", async () => {
      mockFetch.mockReturnValue(mockOk({ items: [], total: 0, limit: 5, offset: 0 }));
      await client.evaluations.list({ status: "approved", limit: 5, offset: 10 });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/gate/ax-bd/evaluations?status=approved&limit=5&offset=10",
        expect.any(Object),
      );
    });

    it("list() with no opts has no query string", async () => {
      mockFetch.mockReturnValue(mockOk({ items: [], total: 0, limit: 20, offset: 0 }));
      await client.evaluations.list();
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/gate/ax-bd/evaluations",
        expect.any(Object),
      );
    });

    it("updateStatus() sends PATCH with status + reason", async () => {
      mockFetch.mockReturnValue(mockOk({ id: "e1", status: "approved" }));
      await client.evaluations.updateStatus("e1", "approved", "LGTM");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/gate/ax-bd/evaluations/e1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "approved", reason: "LGTM" }),
        }),
      );
    });

    it("updateStatus() omits reason when not provided", async () => {
      mockFetch.mockReturnValue(mockOk({ id: "e1", status: "rejected" }));
      await client.evaluations.updateStatus("e1", "rejected");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: JSON.stringify({ status: "rejected" }) }),
      );
    });

    it("get() calls GET /evaluations/:id", async () => {
      mockFetch.mockReturnValue(mockOk({ id: "e1" }));
      await client.evaluations.get("e1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/gate/ax-bd/evaluations/e1",
        expect.any(Object),
      );
    });

    it("getHistory() calls /evaluations/:id/history", async () => {
      mockFetch.mockReturnValue(mockOk([]));
      await client.evaluations.getHistory("e1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/gate/ax-bd/evaluations/e1/history",
        expect.any(Object),
      );
    });

    it("createKpi() sends POST to /evaluations/:id/kpis", async () => {
      const kpi = { id: "k1", evalId: "e1", name: "Revenue", target: "1M" };
      mockFetch.mockReturnValue(mockOk(kpi, 201));
      const result = await client.evaluations.createKpi("e1", { name: "Revenue", target: "1M" });
      expect(result).toEqual(kpi);
    });

    it("listKpis() calls GET /evaluations/:id/kpis", async () => {
      mockFetch.mockReturnValue(mockOk([]));
      await client.evaluations.listKpis("e1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/gate/ax-bd/evaluations/e1/kpis",
        expect.any(Object),
      );
    });

    it("updateKpi() sends PATCH to /evaluations/:id/kpis/:kpiId", async () => {
      mockFetch.mockReturnValue(mockOk({ id: "k1" }));
      await client.evaluations.updateKpi("e1", "k1", { status: "met" });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/gate/ax-bd/evaluations/e1/kpis/k1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  describe("gatePackage", () => {
    it("create() sends POST /gate-package/:bizItemId", async () => {
      mockFetch.mockReturnValue(mockOk({ id: "gp1" }, 201));
      await client.gatePackage.create("biz1", { gateType: "ax_bd" });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/gate/gate-package/biz1",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("get() calls GET /gate-package/:bizItemId", async () => {
      mockFetch.mockReturnValue(mockOk({ id: "gp1" }));
      await client.gatePackage.get("biz1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/gate/gate-package/biz1",
        expect.any(Object),
      );
    });

    it("download() calls GET /gate-package/:bizItemId/download", async () => {
      mockFetch.mockReturnValue(mockOk({ downloadUrl: "https://..." }));
      await client.gatePackage.download("biz1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/gate/gate-package/biz1/download",
        expect.any(Object),
      );
    });

    it("updateStatus() sends PATCH /gate-package/:bizItemId/status", async () => {
      mockFetch.mockReturnValue(mockOk({ id: "gp1" }));
      await client.gatePackage.updateStatus("biz1", "approved");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/gate/gate-package/biz1/status",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "approved" }) }),
      );
    });
  });

  describe("ogd", () => {
    it("run() sends POST /ogd/run", async () => {
      mockFetch.mockReturnValue(mockOk({ jobId: "j1", status: "queued", iterations: 0, createdAt: "", updatedAt: "" }));
      await client.ogd.run({ content: "test content", maxIterations: 3 });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/ogd/run",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("getStatus() calls GET /ogd/status/:jobId", async () => {
      mockFetch.mockReturnValue(mockOk({ jobId: "j1", status: "completed", iterations: 2, createdAt: "", updatedAt: "" }));
      await client.ogd.getStatus("j1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/ogd/status/j1",
        expect.any(Object),
      );
    });
  });

  describe("error handling", () => {
    it("throws GateXRequestError on 4xx", async () => {
      mockFetch.mockReturnValue(mockError(401, { error: "Unauthorized" }));
      await expect(client.health()).rejects.toThrow(GateXRequestError);
      await expect(client.health()).rejects.toMatchObject({ status: 401, error: "Unauthorized" });
    });

    it("throws GateXRequestError on 5xx", async () => {
      mockFetch.mockReturnValue(mockError(500, { error: "Internal Server Error" }));
      await expect(client.health()).rejects.toThrow(GateXRequestError);
    });

    it("includes details in error when present", async () => {
      mockFetch.mockReturnValue(mockError(400, { error: "Bad Request", details: { field: "title" } }));
      try {
        await client.health();
      } catch (e) {
        expect(e).toBeInstanceOf(GateXRequestError);
        expect((e as GateXRequestError).details).toEqual({ field: "title" });
      }
    });
  });
});
