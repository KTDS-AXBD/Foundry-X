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

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

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

      // JWT에서 현재 orgId 파싱
      const token = getToken();
      let jwtOrgId: string | null = null;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          jwtOrgId = payload.orgId ?? null;
        } catch { /* invalid token */ }
      }

      const current = get().activeOrgId;
      if (jwtOrgId && orgs.some((o) => o.id === jwtOrgId)) {
        // JWT의 orgId가 유효하면 그것을 사용
        set({ activeOrgId: jwtOrgId });
      } else if (jwtOrgId && !orgs.some((o) => o.id === jwtOrgId) && orgs.length > 0) {
        // JWT orgId가 멤버십에 없음 (제거됨) → 첫 번째 org로 전환
        void get().switchOrg(orgs[0].id);
      } else if (!current && orgs.length > 0) {
        // API 응답이 멤버 수 DESC로 정렬되어 있으므로 첫 번째가 팀 Org
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
