import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock GateXClient before importing CLI
const mockHealth = vi.fn();
const mockEvalList = vi.fn();
const mockEvalCreate = vi.fn();
const mockEvalUpdateStatus = vi.fn();
const mockEvalGet = vi.fn();
const mockGpGet = vi.fn();
const mockOgdRun = vi.fn();

vi.mock("../client.js", () => ({
  GateXClient: vi.fn().mockImplementation(() => ({
    health: mockHealth,
    evaluations: {
      list: mockEvalList,
      create: mockEvalCreate,
      updateStatus: mockEvalUpdateStatus,
      get: mockEvalGet,
    },
    gatePackage: { get: mockGpGet },
    ogd: { run: mockOgdRun },
  })),
}));

// CLI arg runner helper — dynamically requires the CLI module with mocked process.argv
async function runCli(args: string[]) {
  const originalArgv = process.argv;
  const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  process.argv = ["node", "gate-x", ...args];

  try {
    vi.resetModules();
    await import("../../bin/gate-x.js");
    return { consoleSpy, errorSpy };
  } finally {
    process.argv = originalArgv;
  }
}

describe("gate-x CLI", () => {
  beforeEach(() => {
    process.env["GATEX_API_KEY"] = "test-key";
    process.env["GATEX_BASE_URL"] = "http://localhost:8787";
  });

  afterEach(() => {
    delete process.env["GATEX_API_KEY"];
    delete process.env["GATEX_BASE_URL"];
    vi.clearAllMocks();
  });

  it("gate-x health — calls client.health() and prints JSON", async () => {
    const healthResp = { service: "gate-x", status: "ok", ts: "2026-01-01T00:00:00.000Z" };
    mockHealth.mockResolvedValue(healthResp);
    const { consoleSpy } = await runCli(["health"]);
    expect(mockHealth).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(healthResp));
  });

  it("gate-x eval list — calls evaluations.list()", async () => {
    const listResp = { items: [], total: 0, limit: 20, offset: 0 };
    mockEvalList.mockResolvedValue(listResp);
    const { consoleSpy } = await runCli(["eval", "list"]);
    expect(mockEvalList).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(listResp));
  });

  it("gate-x eval list --status approved --limit 5 — passes opts correctly", async () => {
    mockEvalList.mockResolvedValue({ items: [], total: 0, limit: 5, offset: 0 });
    await runCli(["eval", "list", "--status", "approved", "--limit", "5"]);
    expect(mockEvalList).toHaveBeenCalledWith({ status: "approved", limit: 5, offset: 0 });
  });

  it("gate-x eval create -- creates with title+gate-type", async () => {
    const evalResp = { id: "e1", title: "T1", status: "draft" };
    mockEvalCreate.mockResolvedValue(evalResp);
    const { consoleSpy } = await runCli(["eval", "create", "--title", "T1", "--gate-type", "ax_bd"]);
    expect(mockEvalCreate).toHaveBeenCalledWith({ title: "T1", gateType: "ax_bd" });
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(evalResp));
  });

  it("gate-x eval status <id> approved — calls updateStatus()", async () => {
    mockEvalUpdateStatus.mockResolvedValue({ id: "e1", status: "approved" });
    await runCli(["eval", "status", "e1", "approved"]);
    expect(mockEvalUpdateStatus).toHaveBeenCalledWith("e1", "approved", undefined);
  });

  it("gate-x gate-package get <bizItemId> — calls gatePackage.get()", async () => {
    const gp = { id: "gp1", bizItemId: "b1" };
    mockGpGet.mockResolvedValue(gp);
    const { consoleSpy } = await runCli(["gate-package", "get", "b1"]);
    expect(mockGpGet).toHaveBeenCalledWith("b1");
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(gp));
  });

  it("gate-x ogd run --content '...' — calls ogd.run()", async () => {
    mockOgdRun.mockResolvedValue({ jobId: "j1", status: "queued" });
    await runCli(["ogd", "run", "--content", "hello world"]);
    expect(mockOgdRun).toHaveBeenCalledWith(
      expect.objectContaining({ content: "hello world", maxIterations: 3 }),
    );
  });

  it("GATEX_API_KEY env var is used when --api-key not set", async () => {
    const { GateXClient } = await import("../client.js");
    mockHealth.mockResolvedValue({ service: "gate-x", status: "ok", ts: "" });
    await runCli(["health"]);
    expect(vi.mocked(GateXClient)).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "test-key" }),
    );
  });
});
