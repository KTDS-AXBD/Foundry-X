import { describe, it, expect, beforeEach } from "vitest";
import { OgdCoordinator } from "../durable-objects/ogd-coordinator.js";
import type { OgdJob } from "../durable-objects/ogd-coordinator.js";

/** DO state mock */
function makeDoState() {
  const store = new Map<string, unknown>();
  return {
    storage: {
      get: <T>(key: string) => Promise.resolve(store.get(key) as T | undefined),
      put: (key: string, val: unknown) => { store.set(key, val); return Promise.resolve(); },
    },
  } as unknown as DurableObjectState;
}

function makeCoordinator() {
  return new OgdCoordinator(makeDoState());
}

async function req(coordinator: OgdCoordinator, method: string, path: string, body?: unknown) {
  const r = new Request(`http://do${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const res = await coordinator.fetch(r);
  const json = await res.json() as Record<string, unknown>;
  return { status: res.status, body: json };
}

describe("OgdCoordinator", () => {
  it("returns 404 when job not initialized", async () => {
    const c = makeCoordinator();
    const { status } = await req(c, "GET", "/job");
    expect(status).toBe(404);
  });

  it("initializes job with PENDING status", async () => {
    const c = makeCoordinator();
    const { status, body } = await req(c, "POST", "/init", {
      id: "job-1",
      evaluationId: "eval-1",
      orgId: "org-1",
      maxPhases: 3,
    });
    expect(status).toBe(201);
    expect(body.status).toBe("PENDING");
    expect(body.phase).toBe(0);
    expect(body.id).toBe("job-1");
  });

  it("transitions PENDING → RUNNING on start", async () => {
    const c = makeCoordinator();
    await req(c, "POST", "/init", { id: "j", evaluationId: "e", orgId: "o", maxPhases: 3 });
    const { body } = await req(c, "POST", "/start");
    expect(body.status).toBe("RUNNING");
  });

  it("increments phase on advance (not done)", async () => {
    const c = makeCoordinator();
    await req(c, "POST", "/init", { id: "j", evaluationId: "e", orgId: "o", maxPhases: 3 });
    await req(c, "POST", "/start");
    const { body } = await req(c, "POST", "/advance", {});
    expect(body.phase).toBe(1);
    expect(body.status).toBe("RUNNING");
  });

  it("transitions to DONE when all phases complete", async () => {
    const c = makeCoordinator();
    await req(c, "POST", "/init", { id: "j", evaluationId: "e", orgId: "o", maxPhases: 2 });
    await req(c, "POST", "/start");
    // phase 0 → 1 → 2 (= maxPhases, so DONE)
    await req(c, "POST", "/advance", {});
    const { body } = await req(c, "POST", "/advance", { result: "final output" });
    expect(body.status).toBe("DONE");
    expect(body.result).toBe("final output");
  });

  it("transitions to FAILED on fail", async () => {
    const c = makeCoordinator();
    await req(c, "POST", "/init", { id: "j", evaluationId: "e", orgId: "o", maxPhases: 3 });
    await req(c, "POST", "/start");
    const { body } = await req(c, "POST", "/fail", { error: "LLM timeout" });
    expect(body.status).toBe("FAILED");
    expect(body.error).toBe("LLM timeout");
  });

  it("returns 405 for unknown method", async () => {
    const c = makeCoordinator();
    const { status } = await req(c, "DELETE", "/job");
    expect(status).toBe(405);
  });

  it("GET /job returns current state after init", async () => {
    const c = makeCoordinator();
    await req(c, "POST", "/init", { id: "j", evaluationId: "e", orgId: "o", maxPhases: 3 });
    const { body } = await req(c, "GET", "/job");
    expect((body as unknown as OgdJob).id).toBe("j");
    expect((body as unknown as OgdJob).status).toBe("PENDING");
  });
});
