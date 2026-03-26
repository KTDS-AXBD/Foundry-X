/**
 * Sprint 67: F210 — 비밀번호 재설정 Zod 스키마
 */
import { z } from "@hono/zod-openapi";

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
}).openapi("ForgotPasswordRequest");

export const ForgotPasswordResponseSchema = z.object({
  message: z.string(),
}).openapi("ForgotPasswordResponse");

export const ResetTokenValidationSchema = z.object({
  valid: z.boolean(),
  reason: z.enum(["not_found", "expired", "already_used"]).optional(),
}).openapi("ResetTokenValidation");

export const ResetPasswordSchema = z.object({
  token: z.string().uuid(),
  newPassword: z.string().min(8).max(128),
}).openapi("ResetPasswordRequest");

export const ResetPasswordResponseSchema = z.object({
  message: z.string(),
}).openapi("ResetPasswordResponse");
