import { useMemo } from "react";

interface UserRoleInfo {
  role: "admin" | "member" | "viewer";
  isAdmin: boolean;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function useUserRole(): UserRoleInfo {
  return useMemo(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return { role: "member" as const, isAdmin: false };

    const payload = decodeJwtPayload(token);
    const role = (payload?.role as string) ?? "member";

    if (role === "admin" || role === "member" || role === "viewer") {
      return { role, isAdmin: role === "admin" };
    }

    return { role: "member" as const, isAdmin: false };
  }, []);
}
