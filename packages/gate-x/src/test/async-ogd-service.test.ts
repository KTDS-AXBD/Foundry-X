import { describe, it, expect, vi } from "vitest";
import { AsyncOgdService } from "../services/async-ogd-service.js";
import type { GateEnv } from "../env.js";

function makeEnv(
  stubOverrides: { initStatus?: number; jobStatus?: number; jobBody?: unknown } = {},
) {
  const initBody = { id: "job-1", evaluationId: "eval-1", orgId: "org-1", status: "PENDING", phase: 0, maxPhases: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const jobBody = stubOverrides.jobBody ?? { ...initBody, status: "RUNNING" };

  const stub = {
    fetch: vi.fn().mockImplementation((req: Request) => {
      const url = new URL(req.url);
      if (url.pathname === "/init") {
        return Promise.resolve(new Response(JSON.stringify(initBody), { status: stubOverrides.initStatus ?? 201 }));
      }
      if (url.pathname === "/job") {
        if (stubOverrides.jobStatus === 404) {
          return Promise.resolve(new Response(JSON.stringify({ error: "not found" }), { status: 404 }));
        }
        return Promise.resolve(new Response(JSON.stringify(jobBody), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    }),
  };

  const env = {
    OGD_COORDINATOR: {
      idFromName: vi.fn().mockReturnValue("do-id"),
      get: vi.fn().mockReturnValue(stub),
    },
    OGD_QUEUE: {
      send: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as GateEnv;

  return { env, stub };
}

describe("AsyncOgdService", () => {
  it("submitJob enqueues first phase message", async () => {
    const { env } = makeEnv();
    const svc = new AsyncOgdService(env);
    const job = await svc.submitJob("eval-1", "org-1", 3);

    expect(job.status).toBe("PENDING");
    // Queue.send가 1번 호출됐는지
    expect(env.OGD_QUEUE.send).toHaveBeenCalledTimes(1);
  });

  it("submitJob throws when DO init fails", async () => {
    const { env } = makeEnv({ initStatus: 500 });
    const svc = new AsyncOgdService(env);
    await expect(svc.submitJob("eval-1", "org-1")).rejects.toThrow("Failed to initialize OGD job");
  });

  it("getJob returns job from DO", async () => {
    const { env } = makeEnv();
    const svc = new AsyncOgdService(env);
    const job = await svc.getJob("job-1");
    expect(job).not.toBeNull();
    expect(job?.status).toBe("RUNNING");
  });

  it("getJob returns null when DO 404", async () => {
    const { env } = makeEnv({ jobStatus: 404 });
    const svc = new AsyncOgdService(env);
    const job = await svc.getJob("missing");
    expect(job).toBeNull();
  });

  it("getResult returns null when job not DONE", async () => {
    const { env } = makeEnv();
    const svc = new AsyncOgdService(env);
    const result = await svc.getResult("job-1");
    expect(result).toBeNull();
  });

  it("getResult returns result string when DONE", async () => {
    const { env } = makeEnv({
      jobBody: { status: "DONE", result: "final answer", phase: 3, maxPhases: 3 },
    });
    const svc = new AsyncOgdService(env);
    const result = await svc.getResult("job-done");
    expect(result).toBe("final answer");
  });
});
