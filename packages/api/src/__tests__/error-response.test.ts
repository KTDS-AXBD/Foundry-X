import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";
import { errorResponse, ERROR_CODES } from "../schemas/error.js";

let env: ReturnType<typeof createTestEnv>;

function req(method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) {
  const url = `http://localhost${path}`;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  };
  if (opts?.body) init.body = JSON.stringify(opts.body);

  // Import index to ensure globalOnError is registered
  return import("../index.js").then(() => app.request(url, init, env));
}

function seedDb(sql: string) {
  (env.DB as any).prepare(sql).run();
}

describe("ErrorResponse — F128", () => {
  beforeEach(() => {
    env = createTestEnv();
    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, password_hash, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', 'hash', datetime('now'), datetime('now'))",
    );
  });

  // ─── errorResponse helper unit tests ───

  it("errorResponse returns correct shape with default message", () => {
    const mockC = {
      json: (data: unknown, status: number) => ({ data, status }) as any,
    };
    const result = errorResponse(mockC, 401, "AUTH_001") as any;
    expect(result.data).toEqual({
      error: "Token expired",
      errorCode: "AUTH_001",
    });
    expect(result.status).toBe(401);
  });

  it("errorResponse allows custom message", () => {
    const mockC = {
      json: (data: unknown, status: number) => ({ data, status }) as any,
    };
    const result = errorResponse(mockC, 409, "AUTH_004", "Email already exists") as any;
    expect(result.data).toEqual({
      error: "Email already exists",
      errorCode: "AUTH_004",
    });
  });

  it("errorResponse includes details when provided", () => {
    const mockC = {
      json: (data: unknown, status: number) => ({ data, status }) as any,
    };
    const result = errorResponse(mockC, 400, "VALIDATION_001", undefined, { field: "email" }) as any;
    expect(result.data).toEqual({
      error: "Required field missing",
      errorCode: "VALIDATION_001",
      details: { field: "email" },
    });
  });

  it("ERROR_CODES has all expected entries", () => {
    expect(ERROR_CODES.AUTH_001).toBe("Token expired");
    expect(ERROR_CODES.AUTH_003).toBe("Invalid credentials");
    expect(ERROR_CODES.VALIDATION_001).toBe("Required field missing");
    expect(ERROR_CODES.RESOURCE_001).toBe("Not found");
    expect(ERROR_CODES.INTEGRATION_003).toBe("LLM service unavailable");
    expect(ERROR_CODES.INTERNAL_001).toBe("Unexpected error");
  });

  // ─── Backward-compatible error format in auth.ts ───

  it("POST /auth/signup — duplicate email returns errorCode alongside error string", async () => {
    const res = await req("POST", "/api/auth/signup", {
      body: { email: "test@example.com", name: "Test", password: "password123" },
    });

    expect(res.status).toBe(409);
    const data = (await res.json()) as any;
    // Backward compat: error is still a string
    expect(typeof data.error).toBe("string");
    expect(data.error).toContain("already registered");
    // New: errorCode field
    expect(data.errorCode).toBe("AUTH_004");
  });

  it("POST /auth/login — invalid credentials returns errorCode", async () => {
    const res = await req("POST", "/api/auth/login", {
      body: { email: "wrong@example.com", password: "wrong" },
    });

    expect(res.status).toBe(401);
    const data = (await res.json()) as any;
    expect(data.error).toBe("Invalid credentials");
    expect(data.errorCode).toBe("AUTH_003");
  });
});
