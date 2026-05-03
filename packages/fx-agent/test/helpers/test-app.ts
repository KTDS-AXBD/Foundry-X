import { sign } from "hono/jwt";
import { createMockD1 } from "./mock-d1.js";

const TEST_SECRET = "dev-secret";

class MockKVNamespace {
  private store = new Map<string, { value: string; expiration?: number }>();

  async get(key: string, _type?: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiration && Date.now() / 1000 > entry.expiration) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    const expiration = opts?.expirationTtl ? Date.now() / 1000 + opts.expirationTtl : undefined;
    this.store.set(key, { value, expiration });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export function createTestEnv() {
  const mockDb = createMockD1();
  void mockDb.exec("INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'test-user', 'owner')");
  return {
    DB: mockDb as unknown as D1Database,
    JWT_SECRET: TEST_SECRET,
    GITHUB_TOKEN: "",
    GITHUB_REPO: "KTDS-AXBD/Foundry-X",
    CACHE: new MockKVNamespace() as unknown as KVNamespace,
    AI: {} as Ai,
  };
}

export async function createAuthHeaders(
  payload?: { sub?: string; email?: string; role?: "admin" | "member" | "viewer"; orgId?: string; orgRole?: "owner" | "admin" | "member" | "viewer" },
) {
  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    {
      sub: payload?.sub ?? "test-user",
      email: payload?.email ?? "test@example.com",
      role: payload?.role ?? "admin",
      orgId: payload?.orgId ?? "org_test",
      orgRole: payload?.orgRole ?? "owner",
      iat: now,
      exp: now + 3600,
    },
    TEST_SECRET,
  );
  return { Authorization: `Bearer ${token}` };
}
