// F569 패턴: harness-kit createAuthMiddleware 적용
import { createAuthMiddleware } from "@foundry-x/harness-kit";

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

export const authMiddleware = createAuthMiddleware({
  serviceName: "fx-modules",
  serviceId: "foundry-x",
  corsOrigins: [],
  publicPaths: [
    "/api/portal/health",
    "/api/gate/health",
    "/api/launch/health",
  ],
});
