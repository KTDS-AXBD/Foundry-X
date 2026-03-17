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
