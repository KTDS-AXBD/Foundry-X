/** Sprint 26: F108 SSO 공유 타입 */

export interface ServiceAccess {
  id: "foundry-x" | "discovery-x" | "ai-foundry";
  role: "admin" | "member" | "viewer";
}

export interface HubTokenPayload {
  sub: string;
  email: string;
  role: "admin" | "member" | "viewer";
  orgId: string;
  orgRole: "owner" | "admin" | "member" | "viewer";
  services: ServiceAccess[];
  iat: number;
  exp: number;
}

/** Sprint 30: F124 postMessage 프로토콜 타입 */

export type FoundryToSubAppMessage =
  | { type: "FX_SSO_TOKEN"; token: string; serviceId: string }
  | { type: "FX_CONTEXT_SYNC"; projectId: string; orgId: string }
  | { type: "FX_THEME_SYNC"; theme: "light" | "dark" };

export type SubAppToFoundryMessage =
  | { type: "FX_READY" }
  | { type: "FX_NAVIGATE"; path: string }
  | { type: "FX_ERROR"; message: string };
