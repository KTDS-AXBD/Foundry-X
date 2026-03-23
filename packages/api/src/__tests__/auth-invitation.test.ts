import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

describe("Auth Invitation endpoints", () => {
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

  function seedDb(sql: string, ...bindings: unknown[]) {
    if (bindings.length > 0) {
      (env.DB as any).prepare(sql).bind(...bindings).run();
    } else {
      (env.DB as any).prepare(sql).run();
    }
  }

  const VALID_TOKEN = "11111111-1111-1111-1111-111111111111";
  const EXPIRED_TOKEN = "22222222-2222-2222-2222-222222222222";
  const ACCEPTED_TOKEN = "33333333-3333-3333-3333-333333333333";

  beforeEach(() => {
    env = createTestEnv();
    // Seed org and invitations
    seedDb("INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_inv', 'Invite Org', 'invite-org')");

    // Valid invitation (expires in 7 days)
    const futureDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    seedDb(
      "INSERT INTO org_invitations (id, org_id, email, role, token, expires_at, invited_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      "inv-1", "org_inv", "invited@test.com", "member", VALID_TOKEN, futureDate, "admin-user",
    );

    // Expired invitation
    const pastDate = new Date(Date.now() - 1000).toISOString();
    seedDb(
      "INSERT INTO org_invitations (id, org_id, email, role, token, expires_at, invited_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      "inv-2", "org_inv", "expired@test.com", "member", EXPIRED_TOKEN, pastDate, "admin-user",
    );

    // Already accepted invitation
    seedDb(
      "INSERT INTO org_invitations (id, org_id, email, role, token, expires_at, accepted_at, invited_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      "inv-3", "org_inv", "accepted@test.com", "member", ACCEPTED_TOKEN, futureDate, new Date().toISOString(), "admin-user",
    );
  });

  // ─── GET /auth/invitations/:token/info ───

  describe("GET /api/auth/invitations/:token/info", () => {
    it("returns valid invitation info", async () => {
      const res = await req("GET", `/api/auth/invitations/${VALID_TOKEN}/info`);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.valid).toBe(true);
      expect(data.email).toBe("invited@test.com");
      expect(data.orgName).toBe("Invite Org");
      expect(data.orgSlug).toBe("invite-org");
      expect(data.role).toBe("member");
      expect(data.expiresAt).toBeDefined();
    });

    it("returns 404 for unknown token", async () => {
      const res = await req("GET", "/api/auth/invitations/99999999-9999-9999-9999-999999999999/info");
      expect(res.status).toBe(404);
      const data = (await res.json()) as any;
      expect(data.valid).toBe(false);
      expect(data.reason).toBe("not_found");
    });

    it("returns 410 for expired token", async () => {
      const res = await req("GET", `/api/auth/invitations/${EXPIRED_TOKEN}/info`);
      expect(res.status).toBe(410);
      const data = (await res.json()) as any;
      expect(data.valid).toBe(false);
      expect(data.reason).toBe("expired");
    });

    it("returns 409 for already accepted token", async () => {
      const res = await req("GET", `/api/auth/invitations/${ACCEPTED_TOKEN}/info`);
      expect(res.status).toBe(409);
      const data = (await res.json()) as any;
      expect(data.valid).toBe(false);
      expect(data.reason).toBe("already_accepted");
    });
  });

  // ─── POST /auth/setup-password ───

  describe("POST /api/auth/setup-password", () => {
    it("creates account and returns tokens", async () => {
      const res = await req("POST", "/api/auth/setup-password", {
        body: { token: VALID_TOKEN, name: "홍길동", password: "SecureP@ss123" },
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.orgId).toBe("org_inv");
      expect(data.orgName).toBe("Invite Org");
    });

    it("returns 404 for unknown token", async () => {
      const res = await req("POST", "/api/auth/setup-password", {
        body: { token: "99999999-9999-9999-9999-999999999999", name: "Test", password: "Pass12345" },
      });
      expect(res.status).toBe(404);
    });

    it("returns 410 for expired token", async () => {
      const res = await req("POST", "/api/auth/setup-password", {
        body: { token: EXPIRED_TOKEN, name: "Test", password: "Pass12345" },
      });
      expect(res.status).toBe(410);
    });

    it("returns 409 for duplicate email (user already exists)", async () => {
      // Create user with same email first
      seedDb(
        "INSERT INTO users (id, email, name, role, created_at, updated_at) VALUES (?, ?, ?, 'member', datetime('now'), datetime('now'))",
        "existing-user", "invited@test.com", "Existing User",
      );

      const res = await req("POST", "/api/auth/setup-password", {
        body: { token: VALID_TOKEN, name: "Test", password: "Pass12345" },
      });
      expect(res.status).toBe(409);
      const data = (await res.json()) as any;
      expect(data.error).toContain("already registered");
    });

    it("returns 400 for short password", async () => {
      const res = await req("POST", "/api/auth/setup-password", {
        body: { token: VALID_TOKEN, name: "Test", password: "short" },
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing name", async () => {
      const res = await req("POST", "/api/auth/setup-password", {
        body: { token: VALID_TOKEN, name: "", password: "Pass12345" },
      });
      expect(res.status).toBe(400);
    });

    it("marks invitation as accepted after setup", async () => {
      await req("POST", "/api/auth/setup-password", {
        body: { token: VALID_TOKEN, name: "New User", password: "Pass12345" },
      });

      // Try to use same token again — should be 409 (already accepted)
      const res = await req("GET", `/api/auth/invitations/${VALID_TOKEN}/info`);
      expect(res.status).toBe(409);
      const data = (await res.json()) as any;
      expect(data.reason).toBe("already_accepted");
    });
  });

  // ─── POST /auth/google with invitationToken ───

  describe("POST /api/auth/google with invitationToken", () => {
    it("accepts invitation when invitationToken is not provided (existing behavior)", async () => {
      // Just verify the schema accepts the field as optional
      // Note: actual Google token verification requires a real token,
      // so we test that the endpoint returns 500 (GOOGLE_CLIENT_ID not set)
      // or 401 (invalid token) depending on env config
      const res = await req("POST", "/api/auth/google", {
        body: { credential: "fake-token" },
      });
      // Without GOOGLE_CLIENT_ID, returns 500
      expect([401, 500]).toContain(res.status);
    });

    it("schema accepts optional invitationToken", async () => {
      const res = await req("POST", "/api/auth/google", {
        body: { credential: "fake-token", invitationToken: VALID_TOKEN },
      });
      // Verifies that adding invitationToken doesn't cause a validation error
      // (will fail at Google verification, not schema validation)
      expect([401, 500]).toContain(res.status);
    });
  });
});
