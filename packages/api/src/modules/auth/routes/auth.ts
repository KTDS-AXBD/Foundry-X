import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { verify } from "hono/jwt";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../../../utils/crypto.js";
import { createTokenPair } from "../../../middleware/auth.js";
import type { JwtPayload } from "../../../middleware/auth.js";
import { getDb } from "../../../db/index.js";
import { users, refreshTokens } from "../../../db/schema.js";
import type { Env } from "../../../env.js";
import {
  SignupSchema,
  LoginSchema,
  RefreshSchema,
  AuthResponseSchema,
  TokenPairSchema,
  GoogleAuthSchema,
  InvitationInfoResponseSchema,
  SetupPasswordSchema,
  SetupPasswordResponseSchema,
} from "../schemas/auth.js";
import { ErrorSchema, validationHook } from "../../../schemas/common.js";
import {
  ForgotPasswordSchema,
  ForgotPasswordResponseSchema,
  ResetTokenValidationSchema,
  ResetPasswordSchema,
  ResetPasswordResponseSchema,
} from "../schemas/password-reset.js";
import { PasswordResetService } from "../services/password-reset-service.js";
import { EmailService } from "../services/email-service.js";
import { SwitchOrgSchema, InvitationTokenSchema } from "../../../schemas/org.js";
import { OrgService, OrgError } from "../../../services/org.js";

export const authRoute = new OpenAPIHono<{ Bindings: Env }>({
  defaultHook: validationHook as any,
});

// ─── POST /auth/signup ───

const signup = createRoute({
  method: "post",
  path: "/auth/signup",
  tags: ["Auth"],
  summary: "Create a new account",
  request: {
    body: {
      content: { "application/json": { schema: SignupSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: AuthResponseSchema } },
      description: "Account created with tokens",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Email already registered",
    },
  },
});

authRoute.openapi(signup, async (c) => {
  const { email, name, password } = c.req.valid("json");
  const db = getDb(c.env.DB);

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    return c.json({ error: "Email already registered", errorCode: "AUTH_004" }, 409);
  }

  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(users).values({
    id,
    email,
    name,
    passwordHash,
    role: "member",
    createdAt: now,
    updatedAt: now,
  });

  // Auto-create personal org for new user
  const orgId = `org_${id.slice(0, 8)}`;
  const orgSlug = (email.split("@")[0] ?? "user").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES (?, ?, ?)"
  ).bind(orgId, `${name}'s Org`, orgSlug).run();
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES (?, ?, 'owner')"
  ).bind(orgId, id).run();

  const secret = c.env.JWT_SECRET ?? "dev-secret";
  const { _refreshJti, ...tokens } = await createTokenPair(
    { id, email, role: "member", orgId, orgRole: "owner" },
    secret,
  );

  await db.insert(refreshTokens).values({
    jti: _refreshJti,
    userId: id,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  });

  return c.json(
    { user: { id, email, name, role: "member" as const }, ...tokens },
    201,
  );
});

// ─── POST /auth/login ───

const login = createRoute({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Login with email and password",
  request: {
    body: {
      content: { "application/json": { schema: LoginSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: AuthResponseSchema } },
      description: "Login successful with tokens",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid credentials",
    },
  },
});

authRoute.openapi(login, async (c) => {
  const { email, password } = c.req.valid("json");
  const db = getDb(c.env.DB);

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user?.passwordHash) {
    return c.json({ error: "Invalid credentials", errorCode: "AUTH_003" }, 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid credentials", errorCode: "AUTH_003" }, 401);
  }

  // Resolve active organization — pick first membership
  const orgMembership = await c.env.DB.prepare(
    "SELECT om.org_id, om.role FROM org_members om LEFT JOIN (SELECT org_id, COUNT(*) as cnt FROM org_members GROUP BY org_id) oc ON om.org_id = oc.org_id WHERE om.user_id = ? ORDER BY oc.cnt DESC, om.joined_at ASC LIMIT 1"
  ).bind(user.id).first<{ org_id: string; role: string }>();

  const orgId = orgMembership?.org_id ?? "";
  const orgRole = (orgMembership?.role ?? "member") as "owner" | "admin" | "member" | "viewer";

  const secret = c.env.JWT_SECRET ?? "dev-secret";
  const { _refreshJti, ...tokens } = await createTokenPair(
    { id: user.id, email: user.email, role: user.role, orgId, orgRole },
    secret,
  );

  await db.insert(refreshTokens).values({
    jti: _refreshJti,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  });

  return c.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    ...tokens,
  });
});

// ─── POST /auth/refresh ───

const refresh = createRoute({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Refresh access token",
  request: {
    body: {
      content: { "application/json": { schema: RefreshSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: TokenPairSchema } },
      description: "New token pair",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid or expired refresh token",
    },
  },
});

authRoute.openapi(refresh, async (c) => {
  const { refreshToken } = c.req.valid("json");
  const secret = c.env.JWT_SECRET ?? "dev-secret";

  let payload: JwtPayload;
  try {
    payload = (await verify(refreshToken, secret, "HS256")) as unknown as JwtPayload;
  } catch {
    return c.json({ error: "Invalid or expired refresh token", errorCode: "AUTH_001" }, 401);
  }

  const db = getDb(c.env.DB);

  const [user] = await db.select().from(users).where(eq(users.id, payload.sub));
  if (!user) {
    return c.json({ error: "User not found", errorCode: "RESOURCE_001" }, 401);
  }

  if (payload.jti) {
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.jti, payload.jti));
    if (stored?.revokedAt) {
      return c.json({ error: "Refresh token revoked", errorCode: "AUTH_001" }, 401);
    }
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(refreshTokens.jti, payload.jti));
  }

  // Resolve org for refreshed token
  const orgMembership = await c.env.DB.prepare(
    "SELECT om.org_id, om.role FROM org_members om LEFT JOIN (SELECT org_id, COUNT(*) as cnt FROM org_members GROUP BY org_id) oc ON om.org_id = oc.org_id WHERE om.user_id = ? ORDER BY oc.cnt DESC, om.joined_at ASC LIMIT 1"
  ).bind(user.id).first<{ org_id: string; role: string }>();

  const { _refreshJti, ...tokens } = await createTokenPair(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: orgMembership?.org_id ?? "",
      orgRole: (orgMembership?.role ?? "member") as "owner" | "admin" | "member" | "viewer",
    },
    secret,
  );

  await db.insert(refreshTokens).values({
    jti: _refreshJti,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  });

  return c.json(tokens);
});

// ─── POST /auth/switch-org ───

const switchOrg = createRoute({
  method: "post",
  path: "/auth/switch-org",
  tags: ["Auth"],
  summary: "Switch active organization (requires login)",
  request: {
    body: { content: { "application/json": { schema: SwitchOrgSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: TokenPairSchema } }, description: "New token pair for switched org" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Not a member" },
  },
});

authRoute.openapi(switchOrg, async (c) => {
  const { orgId } = c.req.valid("json");

  // Verify JWT manually (this is a public route but requires auth)
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Authorization required" }, 401);
  }
  const secret = c.env.JWT_SECRET ?? "dev-secret";
  let payload: JwtPayload;
  try {
    payload = (await verify(authHeader.slice(7), secret, "HS256")) as unknown as JwtPayload;
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }

  const member = await c.env.DB.prepare(
    "SELECT role FROM org_members WHERE org_id = ? AND user_id = ?"
  ).bind(orgId, payload.sub).first();

  if (!member) {
    return c.json({ error: "Not a member of this organization", errorCode: "AUTH_002" }, 403);
  }

  const db = getDb(c.env.DB);
  const { _refreshJti, ...tokens } = await createTokenPair({
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    orgId,
    orgRole: (member as Record<string, unknown>).role as "owner" | "admin" | "member" | "viewer",
  }, secret);

  await db.insert(refreshTokens).values({
    jti: _refreshJti,
    userId: payload.sub,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  });

  return c.json(tokens);
});

// ─── POST /auth/invitations/:token/accept ───

const acceptInvitation = createRoute({
  method: "post",
  path: "/auth/invitations/{token}/accept",
  tags: ["Auth"],
  summary: "Accept an organization invitation",
  request: { params: InvitationTokenSchema },
  responses: {
    200: { content: { "application/json": { schema: TokenPairSchema } }, description: "Joined org, new token pair" },
    403: { content: { "application/json": { schema: ErrorSchema } }, description: "Email mismatch" },
    410: { content: { "application/json": { schema: ErrorSchema } }, description: "Expired" },
  },
});

authRoute.openapi(acceptInvitation, async (c) => {
  const { token } = c.req.valid("param");

  // Verify JWT manually
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Authorization required" }, 401);
  }
  const secret = c.env.JWT_SECRET ?? "dev-secret";
  let payload: JwtPayload;
  try {
    payload = (await verify(authHeader.slice(7), secret, "HS256")) as unknown as JwtPayload;
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }

  const orgService = new OrgService(c.env.DB);
  try {
    const { orgId, role } = await orgService.acceptInvitation(token, payload.sub, payload.email);

    const db = getDb(c.env.DB);
    const { _refreshJti, ...tokens } = await createTokenPair({
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      orgId,
      orgRole: role,
    }, secret);

    await db.insert(refreshTokens).values({
      jti: _refreshJti,
      userId: payload.sub,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    });

    return c.json(tokens);
  } catch (e) {
    if (e instanceof OrgError) return c.json({ error: e.message }, e.status as any);
    throw e;
  }
});

// ─── GET /auth/invitations/:token/info ───

const invitationInfo = createRoute({
  method: "get",
  path: "/auth/invitations/{token}/info",
  tags: ["Auth"],
  summary: "Get invitation token info (public)",
  request: { params: InvitationTokenSchema },
  responses: {
    200: { content: { "application/json": { schema: InvitationInfoResponseSchema } }, description: "Valid invitation" },
    404: { content: { "application/json": { schema: InvitationInfoResponseSchema } }, description: "Not found" },
    409: { content: { "application/json": { schema: InvitationInfoResponseSchema } }, description: "Already accepted" },
    410: { content: { "application/json": { schema: InvitationInfoResponseSchema } }, description: "Expired" },
  },
});

authRoute.openapi(invitationInfo, async (c) => {
  const { token } = c.req.valid("param");
  const orgService = new OrgService(c.env.DB);
  const info = await orgService.getInvitationInfo(token);

  if (!info.valid) {
    const statusMap = { not_found: 404, expired: 410, already_accepted: 409 } as const;
    return c.json(info, statusMap[info.reason!] as any);
  }

  return c.json(info);
});

// ─── POST /auth/setup-password ───

const setupPassword = createRoute({
  method: "post",
  path: "/auth/setup-password",
  tags: ["Auth"],
  summary: "Setup password for invited user (public)",
  request: {
    body: { content: { "application/json": { schema: SetupPasswordSchema } } },
  },
  responses: {
    201: { content: { "application/json": { schema: SetupPasswordResponseSchema } }, description: "Account created" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Invitation not found" },
    409: { content: { "application/json": { schema: ErrorSchema } }, description: "Email already registered" },
    410: { content: { "application/json": { schema: ErrorSchema } }, description: "Invitation expired" },
  },
});

authRoute.openapi(setupPassword, async (c) => {
  const { token, name, password } = c.req.valid("json");
  const db = getDb(c.env.DB);

  // 1. Validate invitation token
  const inv = await c.env.DB.prepare(
    "SELECT id, org_id, email, role, expires_at, accepted_at FROM org_invitations WHERE token = ?"
  ).bind(token).first();

  if (!inv) return c.json({ error: "Invitation not found", errorCode: "AUTH_006" }, 404);
  if (inv.accepted_at) return c.json({ error: "Invitation already accepted", errorCode: "AUTH_006" }, 409);

  const expiresAt = new Date(inv.expires_at as string);
  if (expiresAt < new Date()) return c.json({ error: "Invitation has expired", errorCode: "AUTH_006" }, 410);

  const invEmail = inv.email as string;

  // 2. Check email duplicate
  const [existing] = await db.select().from(users).where(eq(users.email, invEmail));
  if (existing) return c.json({ error: "Email already registered. Please login and accept the invitation.", errorCode: "AUTH_004" }, 409);

  // 3. Create account
  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await db.insert(users).values({
    id: userId,
    email: invEmail,
    name,
    passwordHash,
    role: "member",
    createdAt: now,
    updatedAt: now,
  });

  // 4. Auto-create personal org
  const personalOrgId = `org_${userId.slice(0, 8)}`;
  const orgSlug = invEmail.split("@")[0]!.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES (?, ?, ?)"
  ).bind(personalOrgId, `${name}'s Org`, orgSlug).run();
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES (?, ?, 'owner')"
  ).bind(personalOrgId, userId).run();

  // 5. Accept invitation — add to org
  const orgService = new OrgService(c.env.DB);
  const { orgId } = await orgService.acceptInvitation(token, userId, invEmail);

  // 6. Get org name
  const org = await c.env.DB.prepare("SELECT name FROM organizations WHERE id = ?").bind(orgId).first();
  const orgName = (org?.name as string) ?? "";

  // 7. Create token pair (orgId = invited org)
  const orgRole = inv.role as "admin" | "member" | "viewer";
  const secret = c.env.JWT_SECRET ?? "dev-secret";
  const { _refreshJti, ...tokens } = await createTokenPair(
    { id: userId, email: invEmail, role: "member", orgId, orgRole },
    secret,
  );

  await db.insert(refreshTokens).values({
    jti: _refreshJti,
    userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  });

  return c.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, orgId, orgName }, 201);
});

// ─── POST /auth/google ───

interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

const googleAuth = createRoute({
  method: "post",
  path: "/auth/google",
  tags: ["Auth"],
  summary: "Login or signup with Google ID Token",
  request: {
    body: { content: { "application/json": { schema: GoogleAuthSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: AuthResponseSchema } }, description: "Google auth successful" },
    401: { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid Google token" },
  },
});

authRoute.openapi(googleAuth, async (c) => {
  const { credential, invitationToken } = c.req.valid("json");
  const clientId = c.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: "Google OAuth not configured", errorCode: "AUTH_005" }, 500 as any);
  }

  // Verify Google ID Token via Google's tokeninfo endpoint
  const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
  if (!verifyRes.ok) {
    return c.json({ error: "Invalid Google token", errorCode: "AUTH_005" }, 401);
  }
  const googleUser = await verifyRes.json() as GoogleTokenPayload;

  // Verify audience matches our client ID
  const tokenData = googleUser as GoogleTokenPayload & { aud?: string };
  if (tokenData.aud !== clientId) {
    return c.json({ error: "Token audience mismatch", errorCode: "AUTH_005" }, 401);
  }

  if (!googleUser.email_verified) {
    return c.json({ error: "Google email not verified", errorCode: "AUTH_005" }, 401);
  }

  const db = getDb(c.env.DB);

  // Check if user exists
  const [existing] = await db.select().from(users).where(eq(users.email, googleUser.email));

  let userId: string;
  let userName: string;
  let userRole: "admin" | "member" | "viewer" = "member";

  if (existing) {
    // Existing user — update provider info if needed
    userId = existing.id;
    userName = existing.name;
    userRole = existing.role as "admin" | "member" | "viewer";
    if (!existing.authProvider || existing.authProvider === "email") {
      await c.env.DB.prepare(
        "UPDATE users SET auth_provider = 'google', provider_id = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(googleUser.sub, existing.id).run();
    }
  } else {
    // New user — create account
    userId = crypto.randomUUID();
    userName = googleUser.name;
    const now = new Date().toISOString();
    await db.insert(users).values({
      id: userId,
      email: googleUser.email,
      name: userName,
      role: "member",
      authProvider: "google",
      providerId: googleUser.sub,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-create personal org
    const orgId = `org_${userId.slice(0, 8)}`;
    const orgSlug = googleUser.email.split("@")[0]!.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES (?, ?, ?)"
    ).bind(orgId, `${userName}'s Org`, orgSlug).run();
    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES (?, ?, 'owner')"
    ).bind(orgId, userId).run();
  }

  // Accept invitation if token provided
  let invitedOrgId: string | undefined;
  let invitedOrgRole: "admin" | "member" | "viewer" | undefined;
  if (invitationToken) {
    try {
      const orgService = new OrgService(c.env.DB);
      const result = await orgService.acceptInvitation(invitationToken, userId, googleUser.email);
      invitedOrgId = result.orgId;
      invitedOrgRole = result.role as "admin" | "member" | "viewer";
    } catch {
      // Invitation errors are non-fatal for Google auth — user still logs in
    }
  }

  // Resolve org membership — prefer invited org if available
  let resolvedOrgId = invitedOrgId;
  let resolvedOrgRole: "owner" | "admin" | "member" | "viewer" = invitedOrgRole ?? "member";

  if (!resolvedOrgId) {
    const orgMembership = await c.env.DB.prepare(
      "SELECT om.org_id, om.role FROM org_members om LEFT JOIN (SELECT org_id, COUNT(*) as cnt FROM org_members GROUP BY org_id) oc ON om.org_id = oc.org_id WHERE om.user_id = ? ORDER BY oc.cnt DESC, om.joined_at ASC LIMIT 1"
    ).bind(userId).first<{ org_id: string; role: string }>();
    resolvedOrgId = orgMembership?.org_id ?? "";
    resolvedOrgRole = (orgMembership?.role ?? "member") as "owner" | "admin" | "member" | "viewer";
  }

  const secret = c.env.JWT_SECRET ?? "dev-secret";
  const { _refreshJti, ...tokens } = await createTokenPair({
    id: userId,
    email: googleUser.email,
    role: userRole,
    orgId: resolvedOrgId,
    orgRole: resolvedOrgRole,
  }, secret);

  await db.insert(refreshTokens).values({
    jti: _refreshJti,
    userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  });

  return c.json({
    user: { id: userId, email: googleUser.email, name: userName, role: userRole },
    ...tokens,
  });
});

// ─── Sprint 67: F210 Password Reset ───

// POST /auth/forgot-password
const forgotPassword = createRoute({
  method: "post",
  path: "/auth/forgot-password",
  tags: ["Auth"],
  summary: "Request password reset email",
  request: {
    body: { content: { "application/json": { schema: ForgotPasswordSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: ForgotPasswordResponseSchema } }, description: "Reset email sent (always 200 to prevent user enumeration)" },
  },
});

authRoute.openapi(forgotPassword, async (c) => {
  const { email } = c.req.valid("json");
  const db = getDb(c.env.DB);

  // Always return 200 to prevent user enumeration
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    return c.json({ message: "If this email is registered, a reset link has been sent." });
  }

  const resetService = new PasswordResetService(c.env.DB);
  const token = await resetService.createToken(user.id);

  const resetUrl = `https://fx.minu.best/auth/reset-password/${token}`;
  const emailService = new EmailService(c.env.RESEND_API_KEY);
  await emailService.send({
    to: email,
    subject: "[Foundry-X] 비밀번호 재설정",
    html: `<p>안녕하세요, ${user.name}님.</p>
      <p>비밀번호 재설정을 요청하셨습니다.</p>
      <p><a href="${resetUrl}">비밀번호 재설정하기</a></p>
      <p>이 링크는 1시간 후 만료됩니다.</p>
      <p>요청하지 않으셨다면 이 이메일을 무시하세요.</p>`,
  });

  return c.json({ message: "If this email is registered, a reset link has been sent." });
});

// GET /auth/reset-password/:token
const validateResetToken = createRoute({
  method: "get",
  path: "/auth/reset-password/{token}",
  tags: ["Auth"],
  summary: "Validate password reset token",
  request: {
    params: z.object({ token: z.string().uuid() }),
  },
  responses: {
    200: { content: { "application/json": { schema: ResetTokenValidationSchema } }, description: "Token valid" },
    410: { content: { "application/json": { schema: ResetTokenValidationSchema } }, description: "Token expired or used" },
  },
});

authRoute.openapi(validateResetToken, async (c) => {
  const { token } = c.req.valid("param");
  const resetService = new PasswordResetService(c.env.DB);
  const result = await resetService.validateToken(token);

  if (!result.valid) {
    return c.json({ valid: false, reason: result.reason }, 410);
  }
  return c.json({ valid: true });
});

// POST /auth/reset-password
const resetPassword = createRoute({
  method: "post",
  path: "/auth/reset-password",
  tags: ["Auth"],
  summary: "Reset password with token",
  request: {
    body: { content: { "application/json": { schema: ResetPasswordSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: ResetPasswordResponseSchema } }, description: "Password reset successful" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid or expired token" },
  },
});

authRoute.openapi(resetPassword, async (c) => {
  const { token, newPassword } = c.req.valid("json");
  const resetService = new PasswordResetService(c.env.DB);

  try {
    await resetService.resetPassword(token, newPassword);
    return c.json({ message: "Password has been reset successfully. Please login with your new password." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: `Invalid or expired token: ${msg}`, errorCode: "AUTH_007" }, 400);
  }
});

// ─── POST /auth/cleanup-tokens ───

const cleanupTokens = createRoute({
  method: "post",
  path: "/auth/cleanup-tokens",
  tags: ["Auth"],
  summary: "Cleanup expired and revoked refresh tokens (admin only)",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ deleted: z.number() }) } },
      description: "Number of deleted tokens",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Admin only",
    },
  },
});

authRoute.openapi(cleanupTokens, async (c) => {
  // Verify JWT — admin only
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Authorization required" }, 401);
  }
  const secret = c.env.JWT_SECRET ?? "dev-secret";
  let payload: JwtPayload;
  try {
    payload = (await verify(authHeader.slice(7), secret, "HS256")) as unknown as JwtPayload;
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
  if (payload.role !== "admin") {
    return c.json({ error: "Admin only", errorCode: "AUTH_002" }, 403);
  }

  const result = await c.env.DB.prepare(
    "DELETE FROM refresh_tokens WHERE expires_at < datetime('now') OR revoked_at IS NOT NULL"
  ).run();

  return c.json({ deleted: result.meta?.changes ?? 0 });
});
