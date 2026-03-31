import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

describe("admin bulk-signup (F251)", () => {
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    env = createTestEnv();
  });

  async function bulkSignup(
    body: Record<string, unknown>,
    authOverrides?: Parameters<typeof createAuthHeaders>[0],
  ) {
    const headers = {
      "Content-Type": "application/json",
      ...(await createAuthHeaders(authOverrides)),
    };
    return app.request("/api/admin/bulk-signup", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }, env);
  }

  it("creates multiple accounts successfully", async () => {
    const res = await bulkSignup({
      orgId: "org_test",
      accounts: [
        { email: "alice@test.com", name: "Alice", role: "admin" },
        { email: "bob@test.com", name: "Bob", role: "member" },
        { email: "carol@test.com", name: "Carol" },
      ],
      defaultPassword: "TempPass123!",
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.created).toBe(3);
    expect(data.skipped).toBe(0);
    expect(data.failed).toBe(0);
    expect(data.details).toHaveLength(3);
    expect(data.details[0].status).toBe("created");
    expect(data.details[0].tempPassword).toBe("TempPass123!");
  });

  it("skips already-member users", async () => {
    // First create a user
    await bulkSignup({
      orgId: "org_test",
      accounts: [{ email: "existing@test.com", name: "Existing", role: "member" }],
      defaultPassword: "TempPass123!",
    });

    // Try again — should skip
    const res = await bulkSignup({
      orgId: "org_test",
      accounts: [{ email: "existing@test.com", name: "Existing", role: "member" }],
      defaultPassword: "TempPass123!",
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.skipped).toBe(1);
    expect(data.details[0].status).toBe("skipped");
    expect(data.details[0].reason).toBe("already_member");
  });

  it("rejects non-admin users with 403", async () => {
    // Create a member-only user in the org (tenantGuard reads role from DB)
    const db = env.DB as any;
    await db.exec("INSERT OR IGNORE INTO users (id, email, name, role, password_hash, auth_provider, created_at, updated_at) VALUES ('member-user', 'member@test.com', 'Member', 'member', 'hash', 'email', '2026-01-01', '2026-01-01')");
    await db.exec("INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'member-user', 'member')");

    const res = await bulkSignup(
      {
        orgId: "org_test",
        accounts: [{ email: "test@test.com", name: "Test" }],
      },
      { sub: "member-user", email: "member@test.com", role: "member", orgRole: "member" },
    );

    expect(res.status).toBe(403);
  });

  it("rejects empty accounts array", async () => {
    const res = await bulkSignup({
      orgId: "org_test",
      accounts: [],
    });

    expect(res.status).toBe(400);
  });

  it("rejects invalid email format", async () => {
    const res = await bulkSignup({
      orgId: "org_test",
      accounts: [{ email: "not-an-email", name: "Bad" }],
    });

    expect(res.status).toBe(400);
  });

  it("adds existing user to org when not a member", async () => {
    // Create user in a different context (direct signup)
    await app.request("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "solo@test.com", name: "Solo User", password: "Pass1234!" }),
    }, env);

    // Bulk signup to org — user exists but not in org_test
    const res = await bulkSignup({
      orgId: "org_test",
      accounts: [{ email: "solo@test.com", name: "Solo User", role: "member" }],
      defaultPassword: "TempPass123!",
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.created).toBe(1);
    expect(data.details[0].reason).toBe("added_to_org");
  });
});
