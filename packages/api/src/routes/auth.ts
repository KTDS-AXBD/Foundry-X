import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { verify } from "hono/jwt";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../utils/crypto.js";
import { createTokenPair } from "../middleware/auth.js";
import type { JwtPayload } from "../middleware/auth.js";
import { getDb } from "../db/index.js";
import { users, refreshTokens } from "../db/schema.js";
import type { Env } from "../env.js";
import {
  SignupSchema,
  LoginSchema,
  RefreshSchema,
  AuthResponseSchema,
  TokenPairSchema,
} from "../schemas/auth.js";
import { ErrorSchema, validationHook } from "../schemas/common.js";

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
    return c.json({ error: "Email already registered" }, 409);
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

  const secret = c.env.JWT_SECRET ?? "dev-secret";
  const { _refreshJti, ...tokens } = await createTokenPair(
    { id, email, role: "member" },
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
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const secret = c.env.JWT_SECRET ?? "dev-secret";
  const { _refreshJti, ...tokens } = await createTokenPair(
    { id: user.id, email: user.email, role: user.role },
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
    return c.json({ error: "Invalid or expired refresh token" }, 401);
  }

  const db = getDb(c.env.DB);

  const [user] = await db.select().from(users).where(eq(users.id, payload.sub));
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  if (payload.jti) {
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.jti, payload.jti));
    if (stored?.revokedAt) {
      return c.json({ error: "Refresh token revoked" }, 401);
    }
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(refreshTokens.jti, payload.jti));
  }

  const { _refreshJti, ...tokens } = await createTokenPair(
    { id: user.id, email: user.email, role: user.role },
    secret,
  );

  await db.insert(refreshTokens).values({
    jti: _refreshJti,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  });

  return c.json(tokens);
});
