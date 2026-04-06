import { verify } from "hono/jwt";
import { createHubToken, type ServiceAccess } from "../../../middleware/auth.js";

export class SsoService {
  async createHubToken(
    userId: string,
    email: string,
    role: "admin" | "member" | "viewer",
    orgId: string,
    orgRole: "owner" | "admin" | "member" | "viewer",
    db: D1Database,
    secret: string,
  ): Promise<{ hubToken: string; expiresIn: number }> {
    // org_services에서 활성 서비스 조회
    const rows = await db
      .prepare("SELECT service_id FROM org_services WHERE org_id = ? AND enabled = 1")
      .bind(orgId)
      .all<{ service_id: string }>();

    const services: ServiceAccess[] = (rows.results ?? []).map((r) => ({
      id: r.service_id as ServiceAccess["id"],
      role: orgRole === "owner" ? "admin" : (orgRole as ServiceAccess["role"]),
    }));

    const hubToken = await createHubToken(
      { sub: userId, email, role, orgId, orgRole },
      services,
      secret,
    );

    return { hubToken, expiresIn: 3600 };
  }

  async verifyHubToken(
    token: string,
    secret: string,
  ): Promise<{
    valid: boolean;
    payload?: {
      sub: string;
      email: string;
      role: "admin" | "member" | "viewer";
      orgId: string;
      orgRole: "owner" | "admin" | "member" | "viewer";
      services: ServiceAccess[];
    };
  }> {
    try {
      const decoded = await verify(token, secret, "HS256") as Record<string, unknown>;
      if (!decoded.services || !Array.isArray(decoded.services)) {
        return { valid: false };
      }
      return {
        valid: true,
        payload: {
          sub: decoded.sub as string,
          email: decoded.email as string,
          role: decoded.role as "admin" | "member" | "viewer",
          orgId: decoded.orgId as string,
          orgRole: decoded.orgRole as "owner" | "admin" | "member" | "viewer",
          services: decoded.services as ServiceAccess[],
        },
      };
    } catch {
      return { valid: false };
    }
  }

  async getOrgServices(
    orgId: string,
    db: D1Database,
  ): Promise<Array<{ orgId: string; serviceId: "foundry-x" | "discovery-x" | "ai-foundry"; enabled: boolean; config: Record<string, unknown> | null; createdAt: string }>> {
    const rows = await db
      .prepare("SELECT org_id, service_id, enabled, config, created_at FROM org_services WHERE org_id = ?")
      .bind(orgId)
      .all<{ org_id: string; service_id: string; enabled: number; config: string | null; created_at: string }>();

    return (rows.results ?? []).map((r) => ({
      orgId: r.org_id,
      serviceId: r.service_id as "foundry-x" | "discovery-x" | "ai-foundry",
      enabled: r.enabled === 1,
      config: r.config ? JSON.parse(r.config) : null,
      createdAt: r.created_at,
    }));
  }

  async updateOrgService(
    orgId: string,
    serviceId: "foundry-x" | "discovery-x" | "ai-foundry",
    enabled: boolean | undefined,
    config: Record<string, unknown> | undefined,
    db: D1Database,
  ): Promise<{ orgId: string; serviceId: "foundry-x" | "discovery-x" | "ai-foundry"; enabled: boolean; config: Record<string, unknown> | null; createdAt: string }> {
    // Upsert: INSERT OR REPLACE
    const existing = await db
      .prepare("SELECT enabled, config, created_at FROM org_services WHERE org_id = ? AND service_id = ?")
      .bind(orgId, serviceId)
      .first<{ enabled: number; config: string | null; created_at: string }>();

    const newEnabled = enabled !== undefined ? (enabled ? 1 : 0) : (existing?.enabled ?? 1);
    const newConfig = config !== undefined ? JSON.stringify(config) : (existing?.config ?? null);
    const createdAt = existing?.created_at ?? new Date().toISOString().replace("T", " ").slice(0, 19);

    await db
      .prepare("INSERT OR REPLACE INTO org_services (org_id, service_id, enabled, config, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(orgId, serviceId, newEnabled, newConfig, createdAt)
      .run();

    return {
      orgId,
      serviceId,
      enabled: newEnabled === 1,
      config: newConfig ? JSON.parse(newConfig) : null,
      createdAt,
    };
  }
}
