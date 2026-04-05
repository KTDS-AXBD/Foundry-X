import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { isVisible } from "../components/sidebar";
import type { Visibility, VisibilityContext } from "../components/sidebar";

/* ------------------------------------------------------------------ */
/*  T-01 ~ T-04: isVisible 유틸 함수 단위 테스트                        */
/* ------------------------------------------------------------------ */

describe("isVisible", () => {
  const adminCtx: VisibilityContext = { isAdmin: true, onboardingComplete: false };
  const memberCtx: VisibilityContext = { isAdmin: false, onboardingComplete: false };

  it("T-01: visibility 'all'은 항상 true", () => {
    expect(isVisible({ visibility: "all" }, memberCtx)).toBe(true);
    expect(isVisible({ visibility: "all" }, adminCtx)).toBe(true);
    expect(isVisible({}, memberCtx)).toBe(true); // default (undefined)
  });

  it("T-02: visibility 'admin' + isAdmin=false → false", () => {
    expect(isVisible({ visibility: "admin" }, memberCtx)).toBe(false);
  });

  it("T-03: visibility 'admin' + isAdmin=true → true", () => {
    expect(isVisible({ visibility: "admin" }, adminCtx)).toBe(true);
  });

  it("T-04: visibility 'conditional' + condition 결과", () => {
    const entry = {
      visibility: "conditional" as Visibility,
      condition: (ctx: VisibilityContext) => !ctx.onboardingComplete,
    };
    expect(isVisible(entry, { isAdmin: false, onboardingComplete: false })).toBe(true);
    expect(isVisible(entry, { isAdmin: false, onboardingComplete: true })).toBe(false);
  });

  it("conditional without condition function returns true", () => {
    expect(isVisible({ visibility: "conditional" }, memberCtx)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  T-05 ~ T-10: Sidebar 렌더링 통합 테스트                             */
/* ------------------------------------------------------------------ */

// Mock useUserRole
vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: vi.fn(() => ({ role: "member", isAdmin: false })),
}));

// Mock auth-store
vi.mock("@/lib/stores/auth-store", () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
    hydrate: vi.fn(),
  })),
}));

// Mock OrgSwitcher
vi.mock("@/components/feature/OrgSwitcher", () => ({
  OrgSwitcher: () => <div data-testid="org-switcher" />,
}));

// Mock ThemeToggle
vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

// Mock Sheet components
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock button
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

import { useUserRole } from "@/hooks/useUserRole";
import { Sidebar } from "../components/sidebar";

const mockedUseUserRole = vi.mocked(useUserRole);

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe("Sidebar role-based visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("T-05: Member 로그인 시 관리 그룹 미노출", () => {
    mockedUseUserRole.mockReturnValue({ role: "member", isAdmin: false });
    renderSidebar();
    expect(screen.queryByText("토큰 비용")).not.toBeInTheDocument();
    expect(screen.queryByText("에이전트")).not.toBeInTheDocument();
    expect(screen.queryByText("아키텍처")).not.toBeInTheDocument();
  });

  it("T-06: Admin 로그인 시 관리 그룹 헤더 노출", () => {
    mockedUseUserRole.mockReturnValue({ role: "admin", isAdmin: true });
    renderSidebar();
    // F322: 외부 서비스 그룹 제거, 관리 그룹만 검증
    expect(screen.getAllByText("관리").length).toBeGreaterThan(0);
  });

  it("T-07: F322 — 수집 그룹은 collapsed+TBD (items visible:false)", () => {
    mockedUseUserRole.mockReturnValue({ role: "admin", isAdmin: true });
    renderSidebar();
    // 수집 그룹 헤더는 존재하지만, items는 collapsed 상태로 DOM에 없음
    expect(screen.getAllByText("1. 수집").length).toBeGreaterThan(0);
  });

  it("T-08: F322 — GTM 그룹도 collapsed+TBD", () => {
    mockedUseUserRole.mockReturnValue({ role: "admin", isAdmin: true });
    renderSidebar();
    expect(screen.getAllByText("6. GTM").length).toBeGreaterThan(0);
  });

  it("T-09: 리브랜딩 — 'PRD' 존재 (Spec 생성 대신)", () => {
    mockedUseUserRole.mockReturnValue({ role: "admin", isAdmin: true });
    renderSidebar();
    expect(screen.getAllByText("PRD").length).toBeGreaterThan(0);
    expect(screen.queryByText("Spec 생성")).not.toBeInTheDocument();
  });

  it("T-10: F322 — Member: 지식/외부 서비스 그룹 제거됨, Admin 그룹 미노출", () => {
    mockedUseUserRole.mockReturnValue({ role: "member", isAdmin: false });
    renderSidebar();
    // F322: 지식/외부 서비스 그룹 제거
    expect(screen.queryByText("지식")).not.toBeInTheDocument();
    expect(screen.queryByText("외부 서비스")).not.toBeInTheDocument();
    // Admin 전용 그룹은 미노출
    expect(screen.queryByText("관리")).not.toBeInTheDocument();
  });

  it("Member: 하단에 위키+설정 표시", () => {
    mockedUseUserRole.mockReturnValue({ role: "member", isAdmin: false });
    renderSidebar();
    // F322: 하단 고정 = 위키 + 설정 (도움말은 Help Agent 위젯으로 전환)
    expect(screen.getAllByText("위키").length).toBeGreaterThan(0);
    expect(screen.getAllByText("설정").length).toBeGreaterThan(0);
  });

  it("Admin: 하단 위키+설정도 표시됨 (공통)", () => {
    mockedUseUserRole.mockReturnValue({ role: "admin", isAdmin: true });
    renderSidebar();
    // F322: 하단 bottomItems는 Member/Admin 공통
    expect(screen.getAllByText("위키").length).toBeGreaterThan(0);
    expect(screen.getAllByText("설정").length).toBeGreaterThan(0);
  });
});
