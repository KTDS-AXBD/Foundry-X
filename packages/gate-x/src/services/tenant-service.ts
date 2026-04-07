import type { D1Database } from "@cloudflare/workers-types";
import { randomUUID } from "crypto";
import type { Tenant, TenantMember, TenantRole } from "../types/tenant.js";
import type {
  CreateTenantInput,
  InviteMemberInput,
} from "../schemas/tenant-schema.js";

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TenantMemberRow {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string;
  role: string;
  is_active: number;
  invited_by: string;
  created_at: string;
  updated_at: string;
}

function toTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan as Tenant["plan"],
    isActive: row.is_active === 1,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMember(row: TenantMemberRow): TenantMember {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    email: row.email,
    role: row.role as TenantRole,
    isActive: row.is_active === 1,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createTenant(
  data: CreateTenantInput,
  createdBy: string,
  db: D1Database,
): Promise<Tenant> {
  const id = randomUUID();
  const now = new Date().toISOString();

  // slug 중복 체크
  const existing = await db
    .prepare("SELECT id FROM tenants WHERE slug = ?")
    .bind(data.slug)
    .first<{ id: string }>();
  if (existing) throw new Error(`Tenant slug '${data.slug}' already exists`);

  await db
    .prepare(
      `INSERT INTO tenants (id, name, slug, plan, is_active, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
    )
    .bind(id, data.name, data.slug, data.plan ?? "free", createdBy, now, now)
    .run();

  const row = await db
    .prepare("SELECT * FROM tenants WHERE id = ?")
    .bind(id)
    .first<TenantRow>();

  if (!row) throw new Error("Tenant creation failed");
  return toTenant(row);
}

export async function getTenant(
  id: string,
  db: D1Database,
): Promise<Tenant | null> {
  const row = await db
    .prepare("SELECT * FROM tenants WHERE id = ? AND is_active = 1")
    .bind(id)
    .first<TenantRow>();

  return row ? toTenant(row) : null;
}

export async function listMembers(
  tenantId: string,
  db: D1Database,
): Promise<TenantMember[]> {
  const { results } = await db
    .prepare(
      "SELECT * FROM tenant_members WHERE tenant_id = ? AND is_active = 1 ORDER BY created_at",
    )
    .bind(tenantId)
    .all<TenantMemberRow>();

  return (results ?? []).map(toMember);
}

export async function inviteMember(
  tenantId: string,
  data: InviteMemberInput,
  invitedBy: string,
  db: D1Database,
): Promise<TenantMember> {
  // 중복 초대 방지
  const existing = await db
    .prepare(
      "SELECT id FROM tenant_members WHERE tenant_id = ? AND user_id = ?",
    )
    .bind(tenantId, data.userId)
    .first<{ id: string }>();
  if (existing) throw new Error("Member already invited to this tenant");

  const id = randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO tenant_members (id, tenant_id, user_id, email, role, is_active, invited_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    )
    .bind(id, tenantId, data.userId, data.email, data.role ?? "member", invitedBy, now, now)
    .run();

  const row = await db
    .prepare("SELECT * FROM tenant_members WHERE id = ?")
    .bind(id)
    .first<TenantMemberRow>();

  if (!row) throw new Error("Member invitation failed");
  return toMember(row);
}

export async function updateMemberRole(
  tenantId: string,
  memberId: string,
  role: TenantRole,
  db: D1Database,
): Promise<TenantMember | null> {
  const now = new Date().toISOString();
  await db
    .prepare(
      "UPDATE tenant_members SET role = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
    )
    .bind(role, now, memberId, tenantId)
    .run();

  const row = await db
    .prepare("SELECT * FROM tenant_members WHERE id = ? AND tenant_id = ?")
    .bind(memberId, tenantId)
    .first<TenantMemberRow>();

  return row ? toMember(row) : null;
}

export async function removeMember(
  tenantId: string,
  memberId: string,
  db: D1Database,
): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      "UPDATE tenant_members SET is_active = 0, updated_at = ? WHERE id = ? AND tenant_id = ?",
    )
    .bind(now, memberId, tenantId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export const tenantService = {
  create: createTenant,
  get: getTenant,
  listMembers,
  invite: inviteMember,
  updateRole: updateMemberRole,
  removeMember,
};
