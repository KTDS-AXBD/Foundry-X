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
