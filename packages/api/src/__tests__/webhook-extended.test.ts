import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv } from "./helpers/test-app.js";

let env: ReturnType<typeof createTestEnv>;

function req(method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) {
  const url = `http://localhost${path}`;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  };
  if (opts?.body) init.body = JSON.stringify(opts.body);
  return app.request(url, init, env);
}

function execDb(sql: string) {
  (env.DB as any).exec(sql);
}

beforeEach(() => {
  env = createTestEnv();
  // Ensure agent_tasks has github_issue_number column (added in migration 0012 but not in mock-d1 base schema)
  execDb("ALTER TABLE agent_tasks ADD COLUMN github_issue_number INTEGER DEFAULT NULL");
  execDb("CREATE INDEX IF NOT EXISTS idx_tasks_github ON agent_tasks(github_issue_number)");
});

describe("POST /api/webhook/git — Extended webhook tests", () => {
  it("이벤트 타입 없이 push body → 200", async () => {
    const res = await req("POST", "/api/webhook/git", {
      body: {
        ref: "refs/heads/master",
        commits: [{ modified: ["docs/test.md"], added: [] }],
      },
    });
    expect(res.status).toBe(200);
  });

  it("PR 이벤트 invalid body → 400", async () => {
    const res = await req("POST", "/api/webhook/git", {
      headers: { "x-github-event": "pull_request" },
      body: {},
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toContain("Invalid PR event payload");
  });

  it("Issue 이벤트 → syncIssueToTask 호출", async () => {
    const res = await req("POST", "/api/webhook/git", {
      headers: { "x-github-event": "issues" },
      body: {
        action: "opened",
        issue: {
          number: 999,
          title: "[Test] Issue",
          body: "Test body",
          state: "open",
          labels: [],
        },
        repository: { full_name: "KTDS-AXBD/Foundry-X" },
      },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.event).toBe("issues");
  });

  it("지원하지 않는 이벤트 → push fallback 동작", async () => {
    const res = await req("POST", "/api/webhook/git", {
      headers: { "x-github-event": "deployment" },
      body: {
        ref: "refs/heads/master",
        commits: [{ modified: ["README.md"], added: [] }],
      },
    });
    // deployment falls through to push handler
    expect(res.status).toBe(200);
  });
});
