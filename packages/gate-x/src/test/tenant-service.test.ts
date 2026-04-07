import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import {
  createTenant,
  getTenant,
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "../services/tenant-service.js";

function makeTenantRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "tenant-1",
    name: "KT DS BD팀",
    slug: "kt-ds-bd",
    plan: "free",
    is_active: 1,
    created_by: "user-1",
    created_at: "2026-04-07T00:00:00.000Z",
    updated_at: "2026-04-07T00:00:00.000Z",
    ...overrides,
  };
}

function makeMemberRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "member-1",
    tenant_id: "tenant-1",
    user_id: "user-2",
    email: "member@example.com",
    role: "member",
    is_active: 1,
    invited_by: "user-1",
    created_at: "2026-04-07T00:00:00.000Z",
    updated_at: "2026-04-07T00:00:00.000Z",
    ...overrides,
  };
}

function makeDb(overrides: Partial<{ firstResult: unknown; allResults: unknown[]; changes: number }> = {}) {
  const firstResult = overrides.firstResult ?? null;
  const allResults = overrides.allResults ?? [];
  const changes = overrides.changes ?? 1;
  const stmt = {
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ meta: { changes } }),
    first: vi.fn().mockResolvedValue(firstResult),
    all: vi.fn().mockResolvedValue({ results: allResults }),
  };
  return { prepare: vi.fn().mockReturnValue(stmt) } as unknown as D1Database;
}

describe("tenantService", () => {
  describe("createTenant", () => {
    it("creates and returns tenant", async () => {
      // slug 중복 체크 → null, 그 후 SELECT → row 반환
      const stmt = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
        first: vi.fn()
          .mockResolvedValueOnce(null)        // slug 중복 체크: 없음
          .mockResolvedValueOnce(makeTenantRow()), // INSERT 후 SELECT
        all: vi.fn().mockResolvedValue({ results: [] }),
      };
      const db = { prepare: vi.fn().mockReturnValue(stmt) } as unknown as D1Database;

      const tenant = await createTenant(
        { name: "KT DS BD팀", slug: "kt-ds-bd", plan: "free" },
        "user-1",
        db,
      );

      expect(tenant.name).toBe("KT DS BD팀");
      expect(tenant.slug).toBe("kt-ds-bd");
      expect(tenant.plan).toBe("free");
      expect(tenant.isActive).toBe(true);
    });

    it("throws if slug already exists", async () => {
      const db = makeDb({ firstResult: makeTenantRow() }); // slug 중복 존재
      await expect(
        createTenant({ name: "Other", slug: "kt-ds-bd", plan: "free" }, "user-1", db),
      ).rejects.toThrow("already exists");
    });
  });

  describe("getTenant", () => {
    it("returns null if not found", async () => {
      const db = makeDb({ firstResult: null });
      const result = await getTenant("tenant-x", db);
      expect(result).toBeNull();
    });

    it("returns tenant when found", async () => {
      const db = makeDb({ firstResult: makeTenantRow() });
      const result = await getTenant("tenant-1", db);
      expect(result?.id).toBe("tenant-1");
      expect(result?.slug).toBe("kt-ds-bd");
    });
  });

  describe("listMembers", () => {
    it("returns members list", async () => {
      const db = makeDb({ allResults: [makeMemberRow()] });
      const members = await listMembers("tenant-1", db);
      expect(members).toHaveLength(1);
      expect(members[0]!.role).toBe("member");
      expect(members[0]!.email).toBe("member@example.com");
    });

    it("returns empty when no members", async () => {
      const db = makeDb({ allResults: [] });
      const members = await listMembers("tenant-1", db);
      expect(members).toEqual([]);
    });
  });

  describe("inviteMember", () => {
    it("throws on duplicate invitation", async () => {
      const db = makeDb({ firstResult: { id: "member-1" } }); // 이미 존재
      await expect(
        inviteMember("tenant-1", { userId: "user-2", email: "m@example.com", role: "member" }, "user-1", db),
      ).rejects.toThrow("already invited");
    });

    it("creates member when not duplicate", async () => {
      const stmt = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
        first: vi.fn()
          .mockResolvedValueOnce(null)           // 중복 체크: 없음
          .mockResolvedValueOnce(makeMemberRow()), // INSERT 후 SELECT
        all: vi.fn().mockResolvedValue({ results: [] }),
      };
      const db = { prepare: vi.fn().mockReturnValue(stmt) } as unknown as D1Database;

      const member = await inviteMember(
        "tenant-1",
        { userId: "user-2", email: "member@example.com", role: "member" },
        "user-1",
        db,
      );

      expect(member.tenantId).toBe("tenant-1");
      expect(member.email).toBe("member@example.com");
      expect(member.role).toBe("member");
    });
  });

  describe("updateMemberRole", () => {
    it("returns updated member with new role", async () => {
      const db = makeDb({ firstResult: makeMemberRow({ role: "tenant_admin" }) });
      const result = await updateMemberRole("tenant-1", "member-1", "tenant_admin", db);
      expect(result?.role).toBe("tenant_admin");
    });

    it("returns null when member not found", async () => {
      const db = makeDb({ firstResult: null });
      const result = await updateMemberRole("tenant-1", "member-x", "tenant_admin", db);
      expect(result).toBeNull();
    });
  });

  describe("removeMember", () => {
    it("returns true when removed", async () => {
      const db = makeDb({ changes: 1 });
      const ok = await removeMember("tenant-1", "member-1", db);
      expect(ok).toBe(true);
    });

    it("returns false when not found", async () => {
      const db = makeDb({ changes: 0 });
      const ok = await removeMember("tenant-1", "member-x", db);
      expect(ok).toBe(false);
    });
  });
});
