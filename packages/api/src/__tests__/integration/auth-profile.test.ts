import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../../app.js";
import { createTestEnv } from "../helpers/test-app.js";

describe("integration: auth → profile", () => {
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    env = createTestEnv();
  });

  it("register → login → get profile flow", async () => {
    // Step 1: Register
    const signupRes = await app.request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "flow@test.com", name: "Flow User", password: "Pass1234" }),
      },
      env,
    );
    expect(signupRes.status).toBe(201);
    const signupData = (await signupRes.json()) as any;
    expect(signupData.user.email).toBe("flow@test.com");

    // Step 2: Login with same credentials
    const loginRes = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "flow@test.com", password: "Pass1234" }),
      },
      env,
    );
    expect(loginRes.status).toBe(200);
    const loginData = (await loginRes.json()) as any;
    const accessToken = loginData.accessToken;

    // Step 3: Access protected profile endpoint
    const profileRes = await app.request(
      "/api/profile",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      env,
    );
    expect(profileRes.status).toBe(200);
  });

  it("unauthenticated profile access returns 401", async () => {
    const res = await app.request("/api/profile", {}, env);
    expect(res.status).toBe(401);
  });

  it("expired/invalid token returns 401", async () => {
    const res = await app.request(
      "/api/profile",
      { headers: { Authorization: "Bearer invalid.token.here" } },
      env,
    );
    expect(res.status).toBe(401);
  });
});
