import { Hono } from "hono";
import { jwt, sign } from "hono/jwt";
import type { MiddlewareHandler } from "hono";

export interface JwtPayload {
  sub: string;
  email: string;
  role: "admin" | "member" | "viewer";
  orgId?: string;
  orgRole?: "owner" | "admin" | "member" | "viewer";
  iat: number;
  exp: number;
  jti?: string;
}

// Public paths that skip JWT verification
const PUBLIC_PATHS = [
  "/api/auth/",
  "/api/webhook/",
  "/api/slack/",
  "/api/openapi.json",
  "/api/docs",
];

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const path = c.req.path;
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return next();
  }
  const secret = c.env?.JWT_SECRET ?? "dev-secret";
  const handler = jwt({ secret, alg: "HS256" });
  return handler(c, next);
};

export async function createAccessToken(
  payload: Omit<JwtPayload, "iat" | "exp">,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ ...payload, iat: now, exp: now + 3600 }, secret);
}

export async function createRefreshToken(
  userId: string,
  secret: string,
): Promise<{ token: string; jti: string }> {
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();
  const token = await sign({ sub: userId, jti, iat: now, exp: now + 7 * 24 * 3600 }, secret);
  return { token, jti };
}

export async function createTokenPair(
  user: { id: string; email: string; role: "admin" | "member" | "viewer"; orgId?: string; orgRole?: "owner" | "admin" | "member" | "viewer" },
  secret: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; _refreshJti: string }> {
  const [accessToken, refreshResult] = await Promise.all([
    createAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId ?? "",
      orgRole: user.orgRole ?? "member",
    }, secret),
    createRefreshToken(user.id, secret),
  ]);
  return { accessToken, refreshToken: refreshResult.token, expiresIn: 3600, _refreshJti: refreshResult.jti };
}
