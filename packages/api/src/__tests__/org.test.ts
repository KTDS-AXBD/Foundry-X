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
    "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test User', 'admin', datetime('now'), datetime('now'))"
  );
  seedDb(
    "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')"
  );
});

describe("POST /api/orgs — Create org", () => {
  it("creates org successfully", async () => {
    const headers = await createAuthHeaders();
    const res = await req("POST", "/api/orgs", {
      headers,
      body: { name: "New Org", slug: "new-org" },
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.name).toBe("New Org");
    expect(data.slug).toBe("new-org");
    expect(data.plan).toBe("free");
  });

  it("auto-generates slug from name", async () => {
    const headers = await createAuthHeaders();
    const res = await req("POST", "/api/orgs", {
      headers,
      body: { name: "My Cool Team" },
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.slug).toBe("my-cool-team");
  });

  it("handles duplicate slug with suffix", async () => {
    const headers = await createAuthHeaders();
    await req("POST", "/api/orgs", { headers, body: { name: "A", slug: "dup-slug" } });
    const res = await req("POST", "/api/orgs", { headers, body: { name: "B", slug: "dup-slug" } });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.slug).toBe("dup-slug-2");
  });
});

describe("GET /api/orgs — List my orgs", () => {
  it("returns org list", async () => {
    const headers = await createAuthHeaders();
    const res = await req("GET", "/api/orgs", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any[];
    expect(data.length).toBeGreaterThanOrEqual(1);
  });
});

describe("GET /api/orgs/:orgId — Get org detail", () => {
  it("returns org for member", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("GET", "/api/orgs/org_test", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.id).toBe("org_test");
  });

  it("returns 403 for non-member", async () => {
    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('other-user', 'other@example.com', 'Other', 'member', datetime('now'), datetime('now'))"
    );
    const headers = await createAuthHeaders({ sub: "other-user", email: "other@example.com", orgId: "org_test", orgRole: "member" });
    const res = await req("GET", "/api/orgs/org_test", { headers });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/orgs/:orgId — Update org", () => {
  it("owner can update", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("PATCH", "/api/orgs/org_test", {
      headers,
      body: { name: "Updated Org" },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.name).toBe("Updated Org");
  });

  it("member cannot update", async () => {
    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('member-user', 'member@example.com', 'Member', 'member', datetime('now'), datetime('now'))"
    );
    seedDb(
      "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'member-user', 'member')"
    );
    const headers = await createAuthHeaders({ sub: "member-user", email: "member@example.com", role: "member", orgId: "org_test", orgRole: "member" });
    const res = await req("PATCH", "/api/orgs/org_test", {
      headers,
      body: { name: "Hacked" },
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/orgs/:orgId/members — List members", () => {
  it("returns member list", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("GET", "/api/orgs/org_test/members", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any[];
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].role).toBe("owner");
  });
});

describe("PATCH /api/orgs/:orgId/members/:userId — Update role", () => {
  beforeEach(() => {
    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('target-user', 'target@example.com', 'Target', 'member', datetime('now'), datetime('now'))"
    );
    seedDb(
      "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'target-user', 'member')"
    );
  });

  it("owner can change member role", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("PATCH", "/api/orgs/org_test/members/target-user", {
      headers,
      body: { role: "admin" },
    });
    expect(res.status).toBe(200);
  });

  it("admin cannot change roles", async () => {
    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('admin-user', 'admin@example.com', 'Admin', 'member', datetime('now'), datetime('now'))"
    );
    seedDb(
      "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'admin-user', 'admin')"
    );
    const headers = await createAuthHeaders({ sub: "admin-user", email: "admin@example.com", orgId: "org_test", orgRole: "admin" });
    const res = await req("PATCH", "/api/orgs/org_test/members/target-user", {
      headers,
      body: { role: "viewer" },
    });
    expect(res.status).toBe(403);
  });

  it("cannot change owner role", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("PATCH", "/api/orgs/org_test/members/test-user", {
      headers,
      body: { role: "admin" },
    });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/orgs/:orgId/members/:userId — Remove member", () => {
  beforeEach(() => {
    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('removable-user', 'removable@example.com', 'Removable', 'member', datetime('now'), datetime('now'))"
    );
    seedDb(
      "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'removable-user', 'member')"
    );
  });

  it("owner can remove member", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("DELETE", "/api/orgs/org_test/members/removable-user", { headers });
    expect(res.status).toBe(200);
  });

  it("cannot remove owner", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("DELETE", "/api/orgs/org_test/members/test-user", { headers });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/orgs/:orgId/invitations — Create invitation", () => {
  it("admin can invite", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("POST", "/api/orgs/org_test/invitations", {
      headers,
      body: { email: "newuser@example.com", role: "member" },
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.email).toBe("newuser@example.com");
    expect(data.token).toBeTruthy();
  });

  it("rejects if already a member", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("POST", "/api/orgs/org_test/invitations", {
      headers,
      body: { email: "test@example.com", role: "member" },
    });
    expect(res.status).toBe(409);
  });

  it("rejects duplicate pending invitation", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    await req("POST", "/api/orgs/org_test/invitations", {
      headers,
      body: { email: "dup@example.com", role: "member" },
    });
    const res = await req("POST", "/api/orgs/org_test/invitations", {
      headers,
      body: { email: "dup@example.com", role: "admin" },
    });
    expect(res.status).toBe(409);
  });

  it("member cannot invite", async () => {
    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('member-inv', 'member-inv@example.com', 'Member', 'member', datetime('now'), datetime('now'))"
    );
    seedDb(
      "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'member-inv', 'member')"
    );
    const headers = await createAuthHeaders({ sub: "member-inv", email: "member-inv@example.com", orgId: "org_test", orgRole: "member" });
    const res = await req("POST", "/api/orgs/org_test/invitations", {
      headers,
      body: { email: "someone@example.com", role: "member" },
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/orgs/:orgId/invitations — List invitations", () => {
  it("admin can list", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("GET", "/api/orgs/org_test/invitations", { headers });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/auth/invitations/:token/accept — Accept invitation", () => {
  it("accepts valid invitation", async () => {
    const ownerHeaders = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const createRes = await req("POST", "/api/orgs/org_test/invitations", {
      headers: ownerHeaders,
      body: { email: "invited@example.com", role: "member" },
    });
    const invitation = await createRes.json() as any;

    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('invited-user', 'invited@example.com', 'Invited', 'member', datetime('now'), datetime('now'))"
    );
    const invitedHeaders = await createAuthHeaders({ sub: "invited-user", email: "invited@example.com", role: "member", orgId: "", orgRole: "member" });
    const res = await req("POST", `/api/auth/invitations/${invitation.token}/accept`, {
      headers: invitedHeaders,
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.accessToken).toBeTruthy();
  });

  it("rejects expired invitation", async () => {
    seedDb(
      "INSERT INTO org_invitations (id, org_id, email, role, token, expires_at, invited_by) VALUES ('inv-expired', 'org_test', 'exp@example.com', 'member', 'expired-token', '2020-01-01T00:00:00Z', 'test-user')"
    );
    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('exp-user', 'exp@example.com', 'Expired', 'member', datetime('now'), datetime('now'))"
    );
    const headers = await createAuthHeaders({ sub: "exp-user", email: "exp@example.com", role: "member", orgId: "", orgRole: "member" });
    const res = await req("POST", "/api/auth/invitations/expired-token/accept", { headers });
    expect(res.status).toBe(410);
  });

  it("rejects email mismatch", async () => {
    const ownerHeaders = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const createRes = await req("POST", "/api/orgs/org_test/invitations", {
      headers: ownerHeaders,
      body: { email: "correct@example.com", role: "member" },
    });
    const invitation = await createRes.json() as any;

    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('wrong-user', 'wrong@example.com', 'Wrong', 'member', datetime('now'), datetime('now'))"
    );
    const headers = await createAuthHeaders({ sub: "wrong-user", email: "wrong@example.com", role: "member", orgId: "", orgRole: "member" });
    const res = await req("POST", `/api/auth/invitations/${invitation.token}/accept`, { headers });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/auth/switch-org — Switch organization", () => {
  it("switches org and gets new token", async () => {
    const headers = await createAuthHeaders();
    const createRes = await req("POST", "/api/orgs", {
      headers,
      body: { name: "Second Org", slug: "second-org" },
    });
    const newOrg = await createRes.json() as any;

    const res = await req("POST", "/api/auth/switch-org", {
      headers,
      body: { orgId: newOrg.id },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.accessToken).toBeTruthy();
    expect(data.refreshToken).toBeTruthy();
  });

  it("rejects non-member org", async () => {
    seedDb(
      "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_other', 'Other Org', 'other-org')"
    );
    const headers = await createAuthHeaders();
    const res = await req("POST", "/api/auth/switch-org", {
      headers,
      body: { orgId: "org_other" },
    });
    expect(res.status).toBe(403);
  });
});
