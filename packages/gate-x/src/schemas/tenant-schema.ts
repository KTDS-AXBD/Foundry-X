import { z } from "zod";

export const CreateTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(50),
  plan: z.enum(["free", "pro", "enterprise"]).optional().default("free"),
});

export const InviteMemberSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["tenant_admin", "member"]).optional().default("member"),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(["tenant_admin", "member"]),
});

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;
