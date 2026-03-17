import { Hono } from "hono";
import { jwt, sign } from "hono/jwt";
import type { MiddlewareHandler } from "hono";

export interface JwtPayload {
  sub: string;
  email: string;
  role: "admin" | "member" | "viewer";
  iat: number;
  exp: number;
  jti?: string;
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
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
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();
  return sign({ sub: userId, jti, iat: now, exp: now + 7 * 24 * 3600 }, secret);
}

export async function createTokenPair(
  user: { id: string; email: string; role: "admin" | "member" | "viewer" },
  secret: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const [accessToken, refreshToken] = await Promise.all([
    createAccessToken({ sub: user.id, email: user.email, role: user.role }, secret),
    createRefreshToken(user.id, secret),
  ]);
  return { accessToken, refreshToken, expiresIn: 3600 };
}
