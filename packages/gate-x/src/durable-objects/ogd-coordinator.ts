/** OgdCoordinator — Durable Object for managing O-G-D pipeline job state */

export interface OgdJob {
  id: string;
  evaluationId: string;
  orgId: string;
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  phase: number;
  maxPhases: number;
  result?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export class OgdCoordinator {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "GET" && path === "/job") {
      return this.handleGetJob();
    }

    if (request.method === "POST") {
      switch (path) {
        case "/init":
          return this.handleInit(request);
        case "/start":
          return this.handleStart();
        case "/advance":
          return this.handleAdvance(request);
        case "/fail":
          return this.handleFail(request);
        default:
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
      }
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleGetJob(): Promise<Response> {
    const job = await this.state.storage.get<OgdJob>("job");
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(job), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleInit(request: Request): Promise<Response> {
    const body = await request.json<{
      id: string;
      evaluationId: string;
      orgId: string;
      maxPhases: number;
    }>();

    const now = new Date().toISOString();
    const job: OgdJob = {
      id: body.id,
      evaluationId: body.evaluationId,
      orgId: body.orgId,
      status: "PENDING",
      phase: 0,
      maxPhases: body.maxPhases,
      createdAt: now,
      updatedAt: now,
    };

    await this.state.storage.put("job", job);
    return new Response(JSON.stringify(job), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleStart(): Promise<Response> {
    const job = await this.state.storage.get<OgdJob>("job");
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updated: OgdJob = {
      ...job,
      status: "RUNNING",
      updatedAt: new Date().toISOString(),
    };
    await this.state.storage.put("job", updated);
    return new Response(JSON.stringify(updated), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleAdvance(request: Request): Promise<Response> {
    const job = await this.state.storage.get<OgdJob>("job");
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request
      .json<{ result?: string }>()
      .catch(() => ({ result: undefined }));
    const nextPhase = job.phase + 1;
    const isDone = nextPhase >= job.maxPhases;

    const updated: OgdJob = {
      ...job,
      phase: nextPhase,
      status: isDone ? "DONE" : "RUNNING",
      result: isDone ? (body.result ?? undefined) : undefined,
      updatedAt: new Date().toISOString(),
    };
    await this.state.storage.put("job", updated);
    return new Response(JSON.stringify(updated), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleFail(request: Request): Promise<Response> {
    const job = await this.state.storage.get<OgdJob>("job");
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json<{ error: string }>();
    const updated: OgdJob = {
      ...job,
      status: "FAILED",
      error: body.error,
      updatedAt: new Date().toISOString(),
    };
    await this.state.storage.put("job", updated);
    return new Response(JSON.stringify(updated), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
