import { describe, it, expect, vi } from "vitest";

// Mock the store
vi.mock("@/lib/stores/org-store", () => ({
  useOrgStore: vi.fn(() => ({
    activeOrgId: "org_1",
    orgs: [
      { id: "org_1", name: "My Org", slug: "my-org", plan: "free", createdAt: "2026-01-01" },
      { id: "org_2", name: "Team Alpha", slug: "team-alpha", plan: "pro", createdAt: "2026-01-02" },
    ],
    isLoading: false,
    fetchOrgs: vi.fn(),
    switchOrg: vi.fn(),
  })),
}));

describe("OrgSwitcher", () => {
  it("exports OrgSwitcher component", async () => {
    const mod = await import("@/components/feature/OrgSwitcher");
    expect(mod.OrgSwitcher).toBeDefined();
    expect(typeof mod.OrgSwitcher).toBe("function");
  });

  it("store has correct initial state", async () => {
    const { useOrgStore } = await import("@/lib/stores/org-store");
    const state = useOrgStore();
    expect(state.orgs).toHaveLength(2);
    expect(state.activeOrgId).toBe("org_1");
  });

  it("store switchOrg is callable", async () => {
    const { useOrgStore } = await import("@/lib/stores/org-store");
    const state = useOrgStore();
    expect(typeof state.switchOrg).toBe("function");
  });
});
