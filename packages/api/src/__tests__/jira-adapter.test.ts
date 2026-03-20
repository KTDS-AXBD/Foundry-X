import { describe, it, expect, vi, beforeEach } from "vitest";
import { JiraAdapter, JiraApiError } from "../services/jira-adapter.js";
import { JiraSyncService } from "../services/jira-sync.js";
import { createTestEnv } from "./helpers/test-app.js";

let env: ReturnType<typeof createTestEnv>;

function seedDb(sql: string) {
  (env.DB as any).prepare(sql).run();
}

function createSprint24Tables() {
  (env.DB as any).db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL,
      event_types TEXT NOT NULL,
      target_url TEXT NOT NULL,
      direction TEXT NOT NULL DEFAULT 'inbound',
      secret TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      config TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL,
      org_id TEXT NOT NULL DEFAULT '',
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      response_code INTEGER,
      response_body TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      next_retry_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
  `);
}

beforeEach(() => {
  env = createTestEnv();
  createSprint24Tables();
  vi.restoreAllMocks();
});

describe("JiraAdapter", () => {
  const adapter = new JiraAdapter("https://test.atlassian.net", "test@test.com", "token123");

  it("getProjects calls Jira API with Basic auth", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: "1", key: "FX", name: "Foundry-X" }]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const projects = await adapter.getProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0]!.key).toBe("FX");

    const [url, options] = mockFetch.mock.calls[0]!;
    expect(url).toBe("https://test.atlassian.net/rest/api/3/project");
    expect(options.headers.Authorization).toContain("Basic ");
  });

  it("getIssue parses Jira issue response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        key: "FX-42",
        fields: {
          summary: "Test issue",
          status: { name: "In Progress" },
          issuetype: { name: "Task" },
          assignee: { displayName: "Sinclair" },
          priority: { name: "High" },
          updated: "2026-03-20T10:00:00Z",
        },
      }),
    }));

    const issue = await adapter.getIssue("FX-42");
    expect(issue.key).toBe("FX-42");
    expect(issue.summary).toBe("Test issue");
    expect(issue.status).toBe("In Progress");
    expect(issue.assignee).toBe("Sinclair");
  });

  it("throws JiraApiError on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(adapter.getProjects()).rejects.toThrow(JiraApiError);
  });

  it("createIssue sends correct payload", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ key: "FX-43" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          key: "FX-43",
          fields: {
            summary: "New task",
            status: { name: "To Do" },
            issuetype: { name: "Task" },
            assignee: null,
            priority: null,
            updated: "2026-03-20T12:00:00Z",
          },
        }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const issue = await adapter.createIssue("FX", "New task", "Task");
    expect(issue.key).toBe("FX-43");

    // Verify the creation call
    const createCall = mockFetch.mock.calls[0]!;
    const body = JSON.parse(createCall[1].body);
    expect(body.fields.project.key).toBe("FX");
    expect(body.fields.summary).toBe("New task");
  });

  it("addComment sends ADF formatted body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    await adapter.addComment("FX-42", "Test comment");

    const [url, options] = mockFetch.mock.calls[0]!;
    expect(url).toContain("/comment");
    const body = JSON.parse(options.body);
    expect(body.body.type).toBe("doc");
  });
});

describe("JiraSyncService", () => {
  it("syncIssueToSpec records sync event", async () => {
    const mockAdapter = new JiraAdapter("https://test.atlassian.net", "test@test.com", "token123");
    const syncService = new JiraSyncService(mockAdapter, env.DB as unknown as D1Database, "org_test");

    const result = await syncService.syncIssueToSpec({
      key: "FX-1",
      summary: "Test",
      status: "To Do",
      type: "Task",
      assignee: null,
      priority: null,
      updated: "2026-03-20T10:00:00Z",
    });

    expect(result.synced).toBe(1);
    expect(result.errors).toHaveLength(0);
  });
});
