import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

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

function seedDb(sql: string) {
  (env.DB as any).prepare(sql).run();
}

beforeEach(() => {
  env = createTestEnv();
  seedDb(
    "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test User', 'admin', datetime('now'), datetime('now'))",
  );
  seedDb(
    "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')",
  );
});

describe("DELETE /api/orgs/:orgId/invitations/:id — Invitation deletion", () => {
  async function createInvitation(headers: Record<string, string>) {
    const res = await req("POST", "/api/orgs/org_test/invitations", {
      headers,
      body: { email: "inv@example.com", role: "member" },
    });
    const data = (await res.json()) as any;
    return data.id as string;
  }

  it("owner가 초대 삭제 성공", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const invId = await createInvitation(headers);

    const res = await req("DELETE", `/api/orgs/org_test/invitations/${invId}`, { headers });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.ok).toBe(true);
  });

  it("admin이 초대 삭제 성공", async () => {
    const ownerHeaders = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const invId = await createInvitation(ownerHeaders);

    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('admin-user', 'admin@example.com', 'Admin', 'member', datetime('now'), datetime('now'))",
    );
    seedDb(
      "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'admin-user', 'admin')",
    );
    const adminHeaders = await createAuthHeaders({ sub: "admin-user", email: "admin@example.com", orgId: "org_test", orgRole: "admin" });

    const res = await req("DELETE", `/api/orgs/org_test/invitations/${invId}`, { headers: adminHeaders });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.ok).toBe(true);
  });

  it("member는 초대 삭제 불가 → 403", async () => {
    const ownerHeaders = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const invId = await createInvitation(ownerHeaders);

    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('member-user', 'member@example.com', 'Member', 'member', datetime('now'), datetime('now'))",
    );
    seedDb(
      "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'member-user', 'member')",
    );
    const memberHeaders = await createAuthHeaders({ sub: "member-user", email: "member@example.com", orgId: "org_test", orgRole: "member" });

    const res = await req("DELETE", `/api/orgs/org_test/invitations/${invId}`, { headers: memberHeaders });
    expect(res.status).toBe(403);
  });

  it("존재하지 않는 초대 → 404", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });

    const res = await req("DELETE", "/api/orgs/org_test/invitations/nonexistent", { headers });
    expect(res.status).toBe(404);
  });
});
