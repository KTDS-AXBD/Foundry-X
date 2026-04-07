"use client";

import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Menu,
  LogIn,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadSidebarConfig, getIcon } from "@/lib/navigation-loader";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { OrgSwitcher } from "@/components/feature/OrgSwitcher";
import { useUserRole } from "@/hooks/useUserRole";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Navigation Structure — AX BD 프로세스 6단계 기반 그룹               */
/* ------------------------------------------------------------------ */

export type Visibility = "all" | "admin" | "conditional";

export interface VisibilityContext {
  isAdmin: boolean;
  onboardingComplete: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  visibility?: Visibility;
  condition?: (ctx: VisibilityContext) => boolean;
}

interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  stageColor?: string; // 프로세스 단계 그룹에만 사용 — AXIS 색상 뱃지
  visibility?: Visibility;
  condition?: (ctx: VisibilityContext) => boolean;
  collapsed?: boolean;
  badge?: string;
}

export function isVisible(
  entry: { visibility?: Visibility; condition?: (ctx: VisibilityContext) => boolean },
  ctx: VisibilityContext,
): boolean {
  if (!entry.visibility || entry.visibility === "all") return true;
  if (entry.visibility === "admin") return ctx.isAdmin;
  if (entry.visibility === "conditional" && entry.condition) return entry.condition(ctx);
  return true;
}

/* ------------------------------------------------------------------ */
/*  CMS-driven Navigation (SSOT: content/navigation/sidebar.json)      */
/*  sidebar.json이 없으면 빌드 에러 → drift 즉시 감지                    */
/* ------------------------------------------------------------------ */

const cmsNav = loadSidebarConfig()!;

function cmsItemToNav(item: { href: string; label: string; iconKey: string }): NavItem {
  return { href: item.href, label: item.label, icon: getIcon(item.iconKey) };
}

function sortAndFilter<T extends { visible?: boolean; sortOrder?: number }>(items: T[]): T[] {
  return items
    .filter((i) => i.visible !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

const topItems: NavItem[] = sortAndFilter(cmsNav.topItems).map(cmsItemToNav);

const processGroups: NavGroup[] = sortAndFilter(cmsNav.processGroups).map((g) => ({
  key: g.key,
  label: g.label,
  icon: getIcon(g.iconKey ?? g.items[0]?.iconKey ?? "HelpCircle"),
  stageColor: g.stageColor,
  collapsed: g.collapsed,
  badge: g.badge,
  items: sortAndFilter(g.items).map(cmsItemToNav),
}));

const memberBottomItems: NavItem[] = sortAndFilter(cmsNav.bottomItems).map(cmsItemToNav);

const adminGroups: NavGroup[] = sortAndFilter(cmsNav.adminGroups ?? []).map((g) => ({
  key: g.key,
  label: g.label,
  icon: getIcon(g.iconKey ?? "Settings"),
  visibility: "admin" as Visibility,
  badge: g.badge,
  items: sortAndFilter(g.items).map(cmsItemToNav),
}));

/* ------------------------------------------------------------------ */
/*  Collapsible Group State (localStorage 영속)                        */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "fx-sidebar-groups";

function useGroupState() {
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(["discover", "shape", "validate", "productize"]), // 수집/GTM 제외 (collapsed 그룹)
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setOpenGroups(new Set(JSON.parse(saved)));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback((key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  return { openGroups, toggle };
}

/* ------------------------------------------------------------------ */
/*  Nav Components                                                     */
/* ------------------------------------------------------------------ */

function NavLink({
  item,
  pathname,
  onSelect,
}: {
  item: NavItem;
  pathname: string;
  onSelect?: () => void;
}) {
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      to={item.href}
      onClick={onSelect}
      data-tour={item.href.replace("/", "")}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <item.icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function CollapsibleGroup({
  group,
  pathname,
  isOpen,
  onToggle,
  onSelect,
}: {
  group: NavGroup;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect?: () => void;
}) {
  const hasActive = group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  const isCollapsed = group.collapsed && !hasActive;

  return (
    <div data-tour={`group-${group.key}`}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          hasActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
      >
        {group.stageColor ? (
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
              group.stageColor,
            )}
          >
            {group.label.charAt(0)}
          </span>
        ) : (
          <group.icon className="size-4 shrink-0" />
        )}
        <span className="flex-1 text-left">{group.label}</span>
        {group.badge && (
          <span className="ml-auto mr-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {group.badge}
          </span>
        )}
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200",
            isOpen && "rotate-90",
          )}
        />
      </button>
      {isOpen && !isCollapsed && (
        <div className={cn(
          "ml-4 flex flex-col gap-0.5 border-l pl-2",
          group.stageColor && hasActive
            ? `border-l-2 ${group.stageColor.replace("bg-", "border-")}`
            : "border-border/40",
        )}>
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
      {isOpen && isCollapsed && (
        <div className="ml-4 px-3 py-2 text-xs text-muted-foreground">
          준비 중이에요
        </div>
      )}
    </div>
  );
}

function NavLinks({ onSelect }: { onSelect?: () => void }) {
  const { pathname } = useLocation();
  const { openGroups, toggle } = useGroupState();
  const { isAdmin } = useUserRole();

  const onboardingComplete = useMemo(() => {
    try {
      return localStorage.getItem("onboarding_progress") === "100";
    } catch {
      return false;
    }
  }, []);

  const ctx: VisibilityContext = useMemo(
    () => ({ isAdmin, onboardingComplete }),
    [isAdmin, onboardingComplete],
  );

  const filteredTopItems = useMemo(
    () => topItems.filter((item) => isVisible(item, ctx)),
    [ctx],
  );

  const filteredProcessGroups = useMemo(
    () => processGroups
      .filter((g) => isVisible(g, ctx))
      .map((g) => ({ ...g, items: g.items.filter((item) => isVisible(item, ctx)) })),
    [ctx],
  );

  const filteredAdminGroups = useMemo(
    () => adminGroups.filter((g) => isVisible(g, ctx)),
    [ctx],
  );

  const allVisibleGroups = useMemo(
    () => [...filteredProcessGroups, ...filteredAdminGroups],
    [filteredProcessGroups, filteredAdminGroups],
  );

  // 활성 경로가 포함된 그룹은 자동 펼침
  useEffect(() => {
    for (const group of allVisibleGroups) {
      if (group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))) {
        if (!openGroups.has(group.key)) {
          toggle(group.key);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <nav className="flex flex-col gap-0.5">
      {/* 상단: 대시보드 + 시작하기 */}
      {filteredTopItems.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onSelect={onSelect} />
      ))}

      <div className="my-2 border-t border-border/40" />

      {/* 프로세스 6단계 (collapsed/badge 지원) */}
      {filteredProcessGroups.map((group) => (
        <CollapsibleGroup
          key={group.key}
          group={group}
          pathname={pathname}
          isOpen={openGroups.has(group.key)}
          onToggle={() => toggle(group.key)}
          onSelect={onSelect}
        />
      ))}

      <div className="my-2 border-t border-border/40" />

      {/* 하단 고정: 위키 + 설정 (Member + Admin 공통) */}
      {memberBottomItems.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onSelect={onSelect} />
      ))}

      {/* Admin 전용 관리 그룹 */}
      {isAdmin && (
        <>
          <div className="my-2 border-t border-border/40" />
          {filteredAdminGroups.map((group) => (
            <CollapsibleGroup
              key={group.key}
              group={group}
              pathname={pathname}
              isOpen={openGroups.has(group.key)}
              onToggle={() => toggle(group.key)}
              onSelect={onSelect}
            />
          ))}
        </>
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Auth Section (변경 없음)                                           */
/* ------------------------------------------------------------------ */

function AuthSection() {
  const { user, isAuthenticated, logout, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <LogIn className="size-4 shrink-0" />
        로그인
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{user?.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={logout}
        title="로그아웃"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar Shell                                                      */
/* ------------------------------------------------------------------ */

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-2 border-b bg-background px-4 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9">
              <Menu className="size-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle className="text-base font-bold font-display">
                Foundry-X
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-auto p-3">
              <OrgSwitcher />
              <NavLinks onSelect={() => setOpen(false)} />
            </div>
            <div className="border-t p-3">
              <AuthSection />
            </div>
          </SheetContent>
        </Sheet>
        <Link to="/dashboard" className="text-sm font-bold font-display">
          Foundry-X
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile spacer */}
      <div className="h-14 lg:hidden" />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:bg-card">
        <div className="flex h-14 items-center border-b px-4">
          <Link to="/dashboard" className="text-base font-bold font-display">
            Foundry-X
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <OrgSwitcher />
          <NavLinks />
        </div>
        <div className="border-t p-3">
          <AuthSection />
        </div>
      </aside>
    </>
  );
}
