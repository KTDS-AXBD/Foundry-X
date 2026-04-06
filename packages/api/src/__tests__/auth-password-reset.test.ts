import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PasswordResetService } from "../modules/auth/services/password-reset-service.js";
import { EmailService } from "../modules/auth/services/email-service.js";

/**
 * Sprint 67: F210 — Password Reset 통합 테스트
 * auth route의 forgot-password / validate / reset-password 플로우
 */

describe("Password Reset Flow", () => {
  let db: ReturnType<typeof createMockD1>;
  let resetService: PasswordResetService;
  let emailService: EmailService;

  beforeEach(async () => {
    db = createMockD1();
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
    ).bind("user_1", "user@example.com", "Test", "member", "old_hash", now, now).run();

    // Seed refresh token
    await db.prepare(
      "INSERT OR IGNORE INTO refresh_tokens (jti, user_id, expires_at) VALUES (?, ?, ?)"
    ).bind("jti_active", "user_1", new Date(Date.now() + 86400000).toISOString()).run();

    resetService = new PasswordResetService(db as unknown as D1Database);
    emailService = new EmailService(); // log-only mode
  });

  describe("Full reset flow", () => {
    it("creates token → validates → resets password", async () => {
      // Step 1: Create token
      const token = await resetService.createToken("user_1");
      expect(token).toBeTruthy();

      // Step 2: Validate
      const validation = await resetService.validateToken(token);
      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe("user_1");

      // Step 3: Reset password
      const result = await resetService.resetPassword(token, "new_secure_password");
      expect(result.userId).toBe("user_1");

      // Step 4: Token should be invalidated
      const revalidation = await resetService.validateToken(token);
      expect(revalidation.valid).toBe(false);
      expect(revalidation.reason).toBe("already_used");
    });

    it("email service sends in log-only mode", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const result = await emailService.send({
        to: "user@example.com",
        subject: "Password Reset",
        html: "<p>Reset link</p>",
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("log-only");
      consoleSpy.mockRestore();
    });
  });

  describe("Security", () => {
    it("single-use: token cannot be used twice", async () => {
      const token = await resetService.createToken("user_1");
      await resetService.resetPassword(token, "pw1");
      await expect(resetService.resetPassword(token, "pw2")).rejects.toThrow("already_used");
    });

    it("expiration: expired token is rejected", async () => {
      const token = await resetService.createToken("user_1");
      await db.prepare(
        "UPDATE password_reset_tokens SET expires_at = ? WHERE token = ?"
      ).bind(new Date(Date.now() - 1000).toISOString(), token).run();
      await expect(resetService.resetPassword(token, "pw")).rejects.toThrow("expired");
    });

    it("refresh tokens are revoked after password reset", async () => {
      const token = await resetService.createToken("user_1");
      await resetService.resetPassword(token, "new_pw");

      const rt = await db.prepare(
        "SELECT revoked_at FROM refresh_tokens WHERE jti = ?"
      ).bind("jti_active").first<{ revoked_at: string | null }>();
      expect(rt!.revoked_at).toBeTruthy();
    });

    it("previous tokens invalidated when new token is requested", async () => {
      const token1 = await resetService.createToken("user_1");
      await resetService.createToken("user_1");
      const validation = await resetService.validateToken(token1);
      expect(validation.valid).toBe(false);
    });
  });
});
