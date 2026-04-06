/**
 * Sprint 67: F210 — 비밀번호 재설정 토큰 관리 서비스
 * 토큰 1시간 만료, 1회 사용, 비밀번호 변경 시 refresh tokens 전체 폐기
 */

import { hashPassword } from "../../../utils/crypto.js";

export interface TokenValidation {
  valid: boolean;
  userId?: string;
  reason?: "not_found" | "expired" | "already_used";
}

export class PasswordResetService {
  constructor(private db: D1Database) {}

  async createToken(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();

    // Invalidate existing unused tokens for this user
    await this.db.prepare(
      "UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL"
    ).bind(now, userId).run();

    // Create new token
    await this.db.prepare(
      `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(id, userId, token, expiresAt, now).run();

    return token;
  }

  async validateToken(token: string): Promise<TokenValidation> {
    const row = await this.db.prepare(
      "SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE token = ?"
    ).bind(token).first<{ user_id: string; expires_at: string; used_at: string | null }>();

    if (!row) return { valid: false, reason: "not_found" };
    if (row.used_at) return { valid: false, reason: "already_used" };
    if (new Date(row.expires_at) < new Date()) return { valid: false, reason: "expired" };

    return { valid: true, userId: row.user_id };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ userId: string }> {
    const validation = await this.validateToken(token);
    if (!validation.valid || !validation.userId) {
      throw new Error(validation.reason ?? "Invalid token");
    }

    const userId = validation.userId;
    const passwordHash = await hashPassword(newPassword);
    const now = new Date().toISOString();

    // Update password
    await this.db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?"
    ).bind(passwordHash, now, userId).run();

    // Mark token as used
    await this.db.prepare(
      "UPDATE password_reset_tokens SET used_at = ? WHERE token = ?"
    ).bind(now, token).run();

    // Revoke all refresh tokens for this user
    await this.db.prepare(
      "UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL"
    ).bind(now, userId).run();

    return { userId };
  }
}
