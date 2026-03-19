"use client";

import { create } from "zustand";

export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  createdAt: string;
}

interface OrgState {
  activeOrgId: string | null;
  orgs: OrgInfo[];
  isLoading: boolean;
  setOrgs: (orgs: OrgInfo[]) => void;
  setActiveOrg: (orgId: string) => void;
  fetchOrgs: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export const useOrgStore = create<OrgState>((set, get) => ({
  activeOrgId: null,
  orgs: [],
  isLoading: false,

  setOrgs: (orgs) => set({ orgs }),
  setActiveOrg: (orgId) => set({ activeOrgId: orgId }),

  fetchOrgs: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${BASE_URL}/orgs`, { headers: authHeaders() });
      if (!res.ok) { set({ isLoading: false }); return; }
      const orgs = await res.json() as OrgInfo[];
      set({ orgs, isLoading: false });
      if (!get().activeOrgId && orgs.length > 0) {
        set({ activeOrgId: orgs[0].id });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  switchOrg: async (orgId) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/switch-org`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ orgId }),
      });
      if (!res.ok) return;
      const data = await res.json() as { accessToken: string; refreshToken: string };
      localStorage.setItem("token", data.accessToken);
      set({ activeOrgId: orgId });
      window.location.reload();
    } catch {
      // switch failed
    }
  },
}));
