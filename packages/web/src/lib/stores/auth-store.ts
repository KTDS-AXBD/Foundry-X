"use client";

import { create } from "zustand";
import { BASE_URL } from "../api-client";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, name: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

/** JWT exp claim 추출 (서명 검증 없이 만료 시간만 확인) */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!));
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

/** 토큰 만료 5분 전에 자동 갱신을 스케줄링 */
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleTokenRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]!));
    if (typeof payload.exp !== "number") return;

    const msUntilExpiry = payload.exp * 1000 - Date.now();
    const refreshAt = msUntilExpiry - 5 * 60 * 1000; // 만료 5분 전

    if (refreshAt <= 0) {
      // 이미 5분 이내 → 즉시 갱신
      void refreshAccessToken();
      return;
    }

    refreshTimer = setTimeout(() => void refreshAccessToken(), refreshAt);
  } catch {
    // 파싱 실패 — 타이머 설정 안 함
  }
}

/** refreshToken으로 새 토큰 쌍을 발급받아 저장 */
async function refreshAccessToken(): Promise<boolean> {
  const rt = localStorage.getItem("refreshToken");
  if (!rt) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;

    const data = await res.json() as { accessToken: string; refreshToken: string; expiresIn: number };
    localStorage.setItem("token", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    scheduleTokenRefresh();
    return true;
  } catch {
    return false;
  }
}

// api-client에서 사용할 수 있도록 export
export { refreshAccessToken, scheduleTokenRefresh };

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as Record<string, string>).error || `로그인 실패 (${res.status})`);
      }
      const data = await res.json() as { user: User; accessToken: string; refreshToken: string };
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      scheduleTokenRefresh();
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  signup: async (email, name, password) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as Record<string, string>).error || `가입 실패 (${res.status})`);
      }
      const data = await res.json() as { user: User; accessToken: string; refreshToken: string };
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      scheduleTokenRefresh();
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  googleLogin: async (credential) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as Record<string, string>).error || `Google 로그인 실패 (${res.status})`);
      }
      const data = await res.json() as { user: User; accessToken: string; refreshToken: string };
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      scheduleTokenRefresh();
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: () => {
    if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    set({ user: null, isAuthenticated: false });
  },

  hydrate: () => {
    const token = localStorage.getItem("token");
    const userJson = localStorage.getItem("user");
    if (token && userJson) {
      if (isTokenExpired(token)) {
        // accessToken 만료 → refreshToken으로 갱신 시도
        void refreshAccessToken().then((ok) => {
          if (ok) {
            try {
              const user = JSON.parse(userJson) as User;
              set({ user, isAuthenticated: true });
              scheduleTokenRefresh();
            } catch {
              set({ user: null, isAuthenticated: false });
            }
          } else {
            // refresh도 실패 → 로그아웃
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            set({ user: null, isAuthenticated: false });
          }
        });
        return;
      }
      try {
        const user = JSON.parse(userJson) as User;
        set({ user, isAuthenticated: true });
        scheduleTokenRefresh();
      } catch {
        set({ user: null, isAuthenticated: false });
      }
    }
  },
}));
