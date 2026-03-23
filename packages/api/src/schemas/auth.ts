import { z } from "@hono/zod-openapi";

export const SignupSchema = z
  .object({
    email: z.string().email("Valid email is required"),
    name: z.string().min(1, "name is required"),
    password: z.string().min(1, "password is required"),
  })
  .openapi("SignupRequest");

export const LoginSchema = z
  .object({
    email: z.string().email("Valid email is required"),
    password: z.string().min(1, "password is required"),
  })
  .openapi("LoginRequest");

export const RefreshSchema = z
  .object({
    refreshToken: z.string().min(1, "refreshToken is required"),
  })
  .openapi("RefreshRequest");

const UserInfoSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(["admin", "member", "viewer"]),
});

export const AuthResponseSchema = z
  .object({
    user: UserInfoSchema,
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
  })
  .openapi("AuthResponse");

export const TokenPairSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
  })
  .openapi("TokenPair");

export const GoogleAuthSchema = z
  .object({
    credential: z.string().min(1, "Google credential is required"),
    invitationToken: z.string().uuid().optional(),
  })
  .openapi("GoogleAuthRequest");

export const InvitationInfoResponseSchema = z
  .object({
    valid: z.boolean(),
    email: z.string().optional(),
    orgName: z.string().optional(),
    orgSlug: z.string().optional(),
    role: z.enum(["admin", "member", "viewer"]).optional(),
    expiresAt: z.string().optional(),
    reason: z.enum(["not_found", "expired", "already_accepted"]).optional(),
  })
  .openapi("InvitationInfoResponse");

export const SetupPasswordSchema = z
  .object({
    token: z.string().uuid(),
    name: z.string().min(1).max(100),
    password: z.string().min(8).max(128),
  })
  .openapi("SetupPasswordRequest");

export const SetupPasswordResponseSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
    orgId: z.string(),
    orgName: z.string(),
  })
  .openapi("SetupPasswordResponse");
