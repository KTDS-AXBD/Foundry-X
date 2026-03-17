/**
 * Test app factory — creates a Hono app with mock D1 bindings for integration testing.
 */
import { createMockD1 } from "./mock-d1.js";
import { createAccessToken } from "../../middleware/auth.js";

const TEST_SECRET = "dev-secret";

export function createTestEnv() {
  const mockDb = createMockD1();
  return {
    DB: mockDb as unknown as D1Database,
    JWT_SECRET: TEST_SECRET,
    GITHUB_TOKEN: "",
    GITHUB_REPO: "KTDS-AXBD/Foundry-X",
  };
}

export async function createAuthHeaders(
  payload?: { sub?: string; email?: string; role?: "admin" | "member" | "viewer" },
) {
  const token = await createAccessToken(
    {
      sub: payload?.sub ?? "test-user",
      email: payload?.email ?? "test@example.com",
      role: payload?.role ?? "admin",
    },
    TEST_SECRET,
  );
  return { Authorization: `Bearer ${token}` };
}
