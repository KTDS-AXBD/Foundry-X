import { Hono } from "hono";
import { verify } from "hono/jwt";
import { hashPassword, verifyPassword } from "../utils/crypto.js";
import { createTokenPair } from "../middleware/auth.js";
import type { JwtPayload } from "../middleware/auth.js";

type Bindings = { JWT_SECRET: string; DB: unknown };
type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "admin" | "member" | "viewer";
};

// TODO: replace with D1
const users = new Map<string, User>();

export const authRoute = new Hono<{ Bindings: Bindings }>();

authRoute.post("/auth/signup", async (c) => {
  const body = await c.req.json<{ email?: string; name?: string; password?: string }>();

  if (!body.email || !body.name || !body.password) {
    return c.json({ error: "email, name, password are required" }, 400);
  }

  if (users.has(body.email)) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const passwordHash = await hashPassword(body.password);
  const id = crypto.randomUUID();
  const user: User = {
    id,
    email: body.email,
    name: body.name,
    passwordHash,
    role: "member",
  };
  users.set(body.email, user);

  const secret = c.env?.JWT_SECRET ?? "dev-secret";
  const tokens = await createTokenPair(
    { id: user.id, email: user.email, role: user.role },
    secret,
  );

  return c.json({ user: { id, email: user.email, name: user.name, role: user.role }, ...tokens }, 201);
});

authRoute.post("/auth/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();

  if (!body.email || !body.password) {
    return c.json({ error: "email and password are required" }, 400);
  }

  const user = users.get(body.email);
  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const secret = c.env?.JWT_SECRET ?? "dev-secret";
  const tokens = await createTokenPair(
    { id: user.id, email: user.email, role: user.role },
    secret,
  );

  return c.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, ...tokens });
});

authRoute.post("/auth/refresh", async (c) => {
  const body = await c.req.json<{ refreshToken?: string }>();

  if (!body.refreshToken) {
    return c.json({ error: "refreshToken is required" }, 400);
  }

  const secret = c.env?.JWT_SECRET ?? "dev-secret";

  let payload: JwtPayload;
  try {
    payload = (await verify(body.refreshToken, secret, "HS256")) as unknown as JwtPayload;
  } catch {
    return c.json({ error: "Invalid or expired refresh token" }, 401);
  }

  const userEntry = [...users.values()].find((u) => u.id === payload.sub);
  if (!userEntry) {
    return c.json({ error: "User not found" }, 401);
  }

  const tokens = await createTokenPair(
    { id: userEntry.id, email: userEntry.email, role: userEntry.role },
    secret,
  );

  return c.json(tokens);
});
