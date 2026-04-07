export type TenantPlan = "free" | "pro" | "enterprise";
export type TenantRole = "tenant_admin" | "member";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  email: string;
  role: TenantRole;
  isActive: boolean;
  invitedBy: string;
  createdAt: string;
  updatedAt: string;
}
