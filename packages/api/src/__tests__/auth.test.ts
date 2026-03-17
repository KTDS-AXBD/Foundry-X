import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv } from "./helpers/test-app.js";

describe("auth routes (D1)", () => {
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    env = createTestEnv();
  });

  // ─── Signup ───

  it("POST /api/auth/signup creates user and returns tokens", async () => {
    const res = await app.request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "new@test.com", name: "New User", password: "Pass1234" }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.user.email).toBe("new@test.com");
    expect(data.user.name).toBe("New User");
    expect(data.user.role).toBe("member");
    expect(data).toHaveProperty("accessToken");
    expect(data).toHaveProperty("refreshToken");
    expect(data).toHaveProperty("expiresIn");
  });

  it("POST /api/auth/signup rejects duplicate email", async () => {
    // First signup
    await app.request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "dup@test.com", name: "User", password: "Pass1234" }),
      },
      env,
    );
    // Duplicate
    const res = await app.request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "dup@test.com", name: "User2", password: "Pass1234" }),
      },
      env,
    );
    expect(res.status).toBe(409);
    const data = (await res.json()) as any;
    expect(data.error).toContain("already registered");
  });

  it("POST /api/auth/signup validates request body", async () => {
    const res = await app.request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bad" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  // ─── Login ───

  it("POST /api/auth/login returns tokens for valid credentials", async () => {
    // Setup: create user
    await app.request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "login@test.com", name: "Login User", password: "Pass1234" }),
      },
      env,
    );

    const res = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "login@test.com", password: "Pass1234" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.user.email).toBe("login@test.com");
    expect(data).toHaveProperty("accessToken");
    expect(data).toHaveProperty("refreshToken");
  });

  it("POST /api/auth/login rejects wrong password", async () => {
    await app.request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "wrong@test.com", name: "User", password: "Pass1234" }),
      },
      env,
    );

    const res = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "wrong@test.com", password: "WrongPass" }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login rejects unknown email", async () => {
    const res = await app.request(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nobody@test.com", password: "Pass1234" }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  // ─── Refresh ───

  it("POST /api/auth/refresh returns new token pair", async () => {
    const signupRes = await app.request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "refresh@test.com", name: "User", password: "Pass1234" }),
      },
      env,
    );
    const signupData = (await signupRes.json()) as any;

    const res = await app.request(
      "/api/auth/refresh",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: signupData.refreshToken }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("accessToken");
    expect(data).toHaveProperty("refreshToken");
  });

  it("POST /api/auth/refresh rejects invalid token", async () => {
    const res = await app.request(
      "/api/auth/refresh",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: "invalid.token.here" }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });
});
