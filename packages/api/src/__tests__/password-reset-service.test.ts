import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PasswordResetService } from "../modules/auth/services/password-reset-service.js";

describe("PasswordResetService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: PasswordResetService;

  beforeEach(async () => {
    db = createMockD1();
    // password_reset_tokens table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token);
    `);

    // Seed user
    const now = new Date().toISOString();
    await db.prepare(
      "INSERT OR IGNORE INTO users (id, email, name, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind("user_1", "test@example.com", "Test User", "member", "hashed_pw", now, now).run();

    // Seed refresh token
    await db.prepare(
      "INSERT OR IGNORE INTO refresh_tokens (jti, user_id, expires_at) VALUES (?, ?, ?)"
    ).bind("jti_1", "user_1", new Date(Date.now() + 86400000).toISOString()).run();

    svc = new PasswordResetService(db as unknown as D1Database);
  });

  describe("createToken", () => {
    it("creates a valid UUID token", async () => {
      const token = await svc.createToken("user_1");
      expect(token).toBeTruthy();
      // UUID format
      expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it("invalidates previous tokens", async () => {
      const token1 = await svc.createToken("user_1");
      await svc.createToken("user_1");

      const result = await svc.validateToken(token1);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("already_used");
    });
  });

  describe("validateToken", () => {
    it("validates a fresh token", async () => {
      const token = await svc.createToken("user_1");
      const result = await svc.validateToken(token);
      expect(result.valid).toBe(true);
      expect(result.userId).toBe("user_1");
    });

    it("rejects unknown token", async () => {
      const result = await svc.validateToken("00000000-0000-0000-0000-000000000000");
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("not_found");
    });

    it("rejects expired token", async () => {
      const token = await svc.createToken("user_1");

      // Manually expire the token
      await db.prepare(
        "UPDATE password_reset_tokens SET expires_at = ? WHERE token = ?"
      ).bind(new Date(Date.now() - 1000).toISOString(), token).run();

      const result = await svc.validateToken(token);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("expired");
    });

    it("rejects used token", async () => {
      const token = await svc.createToken("user_1");

      // Mark as used
      await db.prepare(
        "UPDATE password_reset_tokens SET used_at = ? WHERE token = ?"
      ).bind(new Date().toISOString(), token).run();

      const result = await svc.validateToken(token);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("already_used");
    });
  });

  describe("resetPassword", () => {
    it("resets password and marks token used", async () => {
      const token = await svc.createToken("user_1");
      const result = await svc.resetPassword(token, "new_password_123");
      expect(result.userId).toBe("user_1");

      // Token should now be used
      const validation = await svc.validateToken(token);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe("already_used");
    });

    it("updates password hash in users table", async () => {
      const token = await svc.createToken("user_1");
      await svc.resetPassword(token, "new_password_123");

      const user = await db.prepare(
        "SELECT password_hash FROM users WHERE id = ?"
      ).bind("user_1").first<{ password_hash: string }>();
      expect(user!.password_hash).not.toBe("hashed_pw");
    });

    it("revokes all refresh tokens", async () => {
      const token = await svc.createToken("user_1");
      await svc.resetPassword(token, "new_password_123");

      const rt = await db.prepare(
        "SELECT revoked_at FROM refresh_tokens WHERE user_id = ?"
      ).bind("user_1").first<{ revoked_at: string | null }>();
      expect(rt!.revoked_at).toBeTruthy();
    });

    it("throws for invalid token", async () => {
      await expect(
        svc.resetPassword("00000000-0000-0000-0000-000000000000", "pw")
      ).rejects.toThrow("not_found");
    });

    it("throws for expired token", async () => {
      const token = await svc.createToken("user_1");
      await db.prepare(
        "UPDATE password_reset_tokens SET expires_at = ? WHERE token = ?"
      ).bind(new Date(Date.now() - 1000).toISOString(), token).run();

      await expect(svc.resetPassword(token, "pw")).rejects.toThrow("expired");
    });
  });
});
