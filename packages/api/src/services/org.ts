type OrgRole = "owner" | "admin" | "member" | "viewer";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface OrgMember {
  orgId: string;
  userId: string;
  email: string;
  name: string;
  role: OrgRole;
  joinedAt: string;
}

type InvitationRole = "admin" | "member" | "viewer";

interface OrgInvitation {
  id: string;
  orgId: string;
  email: string;
  role: InvitationRole;
  token: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  invitedBy: string;
}

export class OrgService {
  constructor(private db: D1Database) {}

  // ─── Org CRUD ───

  async createOrg(userId: string, params: { name: string; slug?: string }): Promise<Organization> {
    const id = `org_${crypto.randomUUID().slice(0, 8)}`;
    const slug = params.slug ?? this.generateSlug(params.name);
    const uniqueSlug = await this.ensureUniqueSlug(slug);
    const now = new Date().toISOString();

    await this.db.prepare(
      "INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, params.name, uniqueSlug, now, now).run();

    await this.db.prepare(
      "INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, 'owner')"
    ).bind(id, userId).run();

    return {
      id,
      name: params.name,
      slug: uniqueSlug,
      plan: "free",
      settings: {},
      createdAt: now,
      updatedAt: now,
    };
  }

  async listMyOrgs(userId: string): Promise<Organization[]> {
    const result = await this.db.prepare(
      `SELECT o.id, o.name, o.slug, o.plan, o.settings, o.created_at, o.updated_at
       FROM organizations o
       JOIN org_members m ON o.id = m.org_id
       WHERE m.user_id = ?
       ORDER BY m.joined_at ASC`
    ).bind(userId).all();

    return (result.results ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      slug: r.slug as string,
      plan: r.plan as Organization["plan"],
      settings: typeof r.settings === "string" ? JSON.parse(r.settings) : (r.settings ?? {}),
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    }));
  }

  async getOrg(orgId: string): Promise<Organization | null> {
    const r = await this.db.prepare(
      "SELECT id, name, slug, plan, settings, created_at, updated_at FROM organizations WHERE id = ?"
    ).bind(orgId).first();

    if (!r) return null;
    return {
      id: r.id as string,
      name: r.name as string,
      slug: r.slug as string,
      plan: r.plan as Organization["plan"],
      settings: typeof r.settings === "string" ? JSON.parse(r.settings) : (r.settings ?? {}),
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }

  async updateOrg(orgId: string, patch: { name?: string; settings?: Record<string, unknown> }): Promise<Organization> {
    const now = new Date().toISOString();

    if (patch.name) {
      await this.db.prepare(
        "UPDATE organizations SET name = ?, updated_at = ? WHERE id = ?"
      ).bind(patch.name, now, orgId).run();
    }
    if (patch.settings) {
      await this.db.prepare(
        "UPDATE organizations SET settings = ?, updated_at = ? WHERE id = ?"
      ).bind(JSON.stringify(patch.settings), now, orgId).run();
    }

    const org = await this.getOrg(orgId);
    return org!;
  }

  // ─── Members ───

  async listMembers(orgId: string): Promise<OrgMember[]> {
    const result = await this.db.prepare(
      `SELECT m.org_id, m.user_id, u.email, u.name, m.role, m.joined_at
       FROM org_members m
       JOIN users u ON m.user_id = u.id
       WHERE m.org_id = ?
       ORDER BY m.joined_at ASC`
    ).bind(orgId).all();

    return (result.results ?? []).map((r: Record<string, unknown>) => ({
      orgId: r.org_id as string,
      userId: r.user_id as string,
      email: r.email as string,
      name: r.name as string,
      role: r.role as OrgRole,
      joinedAt: r.joined_at as string,
    }));
  }

  async getMemberRole(orgId: string, userId: string): Promise<OrgRole | null> {
    const r = await this.db.prepare(
      "SELECT role FROM org_members WHERE org_id = ? AND user_id = ?"
    ).bind(orgId, userId).first();
    return r ? (r.role as OrgRole) : null;
  }

  async updateMemberRole(orgId: string, targetUserId: string, newRole: OrgRole, actorUserId: string): Promise<void> {
    const targetRole = await this.getMemberRole(orgId, targetUserId);
    if (!targetRole) throw new OrgError("Member not found", 404);
    if (targetRole === "owner") throw new OrgError("Cannot change owner's role", 403);
    if (targetUserId === actorUserId) throw new OrgError("Cannot change your own role", 400);

    await this.db.prepare(
      "UPDATE org_members SET role = ? WHERE org_id = ? AND user_id = ?"
    ).bind(newRole, orgId, targetUserId).run();
  }

  async removeMember(orgId: string, targetUserId: string, actorUserId: string): Promise<void> {
    const targetRole = await this.getMemberRole(orgId, targetUserId);
    if (!targetRole) throw new OrgError("Member not found", 404);
    if (targetRole === "owner") throw new OrgError("Cannot remove the owner", 403);
    if (targetUserId === actorUserId) throw new OrgError("Cannot remove yourself", 400);

    await this.db.prepare(
      "DELETE FROM org_members WHERE org_id = ? AND user_id = ?"
    ).bind(orgId, targetUserId).run();
  }

  // ─── Invitations ───

  async createInvitation(orgId: string, params: { email: string; role: InvitationRole; invitedBy: string }): Promise<OrgInvitation> {
    // Check if already a member
    const existing = await this.db.prepare(
      `SELECT m.user_id FROM org_members m
       JOIN users u ON m.user_id = u.id
       WHERE m.org_id = ? AND u.email = ?`
    ).bind(orgId, params.email).first();
    if (existing) throw new OrgError("User is already a member", 409);

    // Check pending invitation
    const pending = await this.db.prepare(
      "SELECT id FROM org_invitations WHERE org_id = ? AND email = ? AND accepted_at IS NULL AND expires_at > datetime('now')"
    ).bind(orgId, params.email).first();
    if (pending) throw new OrgError("Invitation already pending for this email", 409);

    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await this.db.prepare(
      `INSERT INTO org_invitations (id, org_id, email, role, token, expires_at, created_at, invited_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, orgId, params.email, params.role, token, expiresAt, now.toISOString(), params.invitedBy).run();

    return {
      id,
      orgId,
      email: params.email,
      role: params.role,
      token,
      expiresAt,
      createdAt: now.toISOString(),
      acceptedAt: null,
      invitedBy: params.invitedBy,
    };
  }

  async listInvitations(orgId: string): Promise<OrgInvitation[]> {
    const result = await this.db.prepare(
      `SELECT id, org_id, email, role, token, expires_at, created_at, accepted_at, invited_by
       FROM org_invitations WHERE org_id = ? ORDER BY created_at DESC`
    ).bind(orgId).all();

    return (result.results ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      orgId: r.org_id as string,
      email: r.email as string,
      role: r.role as InvitationRole,
      token: r.token as string,
      expiresAt: r.expires_at as string,
      createdAt: r.created_at as string,
      acceptedAt: (r.accepted_at as string) ?? null,
      invitedBy: r.invited_by as string,
    }));
  }

  async acceptInvitation(token: string, userId: string, userEmail: string): Promise<{ orgId: string; role: OrgRole }> {
    const inv = await this.db.prepare(
      "SELECT id, org_id, email, role, expires_at, accepted_at FROM org_invitations WHERE token = ?"
    ).bind(token).first();

    if (!inv) throw new OrgError("Invitation not found", 404);
    if (inv.accepted_at) throw new OrgError("Invitation already accepted", 409);

    const expiresAt = new Date(inv.expires_at as string);
    if (expiresAt < new Date()) throw new OrgError("Invitation has expired", 410);

    if ((inv.email as string).toLowerCase() !== userEmail.toLowerCase()) {
      throw new OrgError("Email does not match invitation", 403);
    }

    // Add as member
    await this.db.prepare(
      "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES (?, ?, ?)"
    ).bind(inv.org_id, userId, inv.role).run();

    // Mark accepted
    await this.db.prepare(
      "UPDATE org_invitations SET accepted_at = datetime('now') WHERE id = ?"
    ).bind(inv.id).run();

    return { orgId: inv.org_id as string, role: inv.role as OrgRole };
  }

  async deleteInvitation(invitationId: string, orgId: string): Promise<void> {
    const result = await this.db.prepare(
      "DELETE FROM org_invitations WHERE id = ? AND org_id = ?"
    ).bind(invitationId, orgId).run();

    if (!result.meta?.changes) throw new OrgError("Invitation not found", 404);
  }

  // ─── Helpers ───

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await this.db.prepare(
        "SELECT id FROM organizations WHERE slug = ?"
      ).bind(slug).first();

      if (!existing) return slug;
      slug = `${baseSlug}-${suffix}`;
      suffix++;
      if (suffix > 100) throw new OrgError("Cannot generate unique slug", 500);
    }
  }
}

export class OrgError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "OrgError";
  }
}
