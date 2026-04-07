"use client";

import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Blocks,
  ClipboardList,
  Bot,
  Coins,
  BarChart3,
  Menu,
  Search,
  LogIn,
  LogOut,
  Rocket,
  FileText,
  FolderKanban,
  ChevronRight,
  Inbox,
  TrendingUp,
  Settings,
  Map,
  Radio,
  ArrowUpFromLine,
  PenTool,
  FileSignature,
  Package,
  CheckCircle,
  GitBranch,
  Target,
  Library,
  Users,
  ClipboardCheck,
  Code,
  Send,
  Activity,
  FlaskConical,
  FileOutput,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadSidebarConfig, getIcon } from "@/lib/navigation-loader";
import type { SidebarConfig } from "@/lib/navigation-loader";
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

const DEFAULT_TOP_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/getting-started", label: "시작하기", icon: Rocket },
];

/* ── 프로세스 6단계: 수집→발굴→형상화→검증/공유→제품화→GTM ── */

const DEFAULT_PROCESS_GROUPS: NavGroup[] = [
  {
    key: "collect",
    label: "1. 수집",
    icon: Inbox,
    stageColor: "bg-axis-blue",
    collapsed: true,
    badge: "이관 예정",
    items: [
      { href: "/collection/field", label: "Field 수집", icon: Radio },
      { href: "/collection/ideas", label: "IDEA Portal", icon: ArrowUpFromLine },
      { href: "/collection/screening", label: "스크리닝", icon: ClipboardList },
    ],
  },
  {
    key: "discover",
    label: "2. 발굴",
    icon: Search,
    stageColor: "bg-axis-violet",
    items: [
      { href: "/discovery", label: "발굴", icon: Map },
      { href: "/discovery/report", label: "평가 결과서", icon: ClipboardCheck },
    ],
  },
  {
    key: "shape",
    label: "3. 형상화",
    icon: PenTool,
    stageColor: "bg-axis-warm",
    items: [
      { href: "/shaping/business-plan", label: "사업기획서", icon: FileSignature },
      { href: "/shaping/offerings", label: "Offerings", icon: FileOutput },
      { href: "/shaping/offering", label: "Offering Pack", icon: Package },
      { href: "/shaping/prd", label: "PRD", icon: FileText },
      { href: "/shaping/prototype", label: "Prototype", icon: Code },
    ],
  },
  {
    key: "validate",
    label: "4. 검증",
    icon: CheckCircle,
    stageColor: "bg-axis-green",
    items: [
      { href: "/validation", label: "검증", icon: CheckCircle },
      { href: "/validation/share", label: "산출물 공유", icon: Users },
    ],
  },
  {
    key: "productize",
    label: "5. 제품화",
    icon: Rocket,
    stageColor: "bg-axis-indigo",
    items: [
      { href: "/product", label: "제품화", icon: Target },
      { href: "/product/offering-pack", label: "Offering Pack", icon: Package },
    ],
  },
  {
    key: "gtm",
    label: "6. GTM",
    icon: TrendingUp,
    stageColor: "bg-axis-rose",
    collapsed: true,
    badge: "이관 예정",
    items: [
      { href: "/gtm/outreach", label: "대고객 선제안", icon: Send },
      { href: "/gtm/pipeline", label: "파이프라인", icon: GitBranch },
    ],
  },
];

const DEFAULT_ADMIN_GROUPS: NavGroup[] = [
  {
    key: "admin-auth",
    label: "Auth 서비스",
    icon: Users,
    visibility: "admin",
    badge: "modules/auth",
    items: [
      { href: "/tokens", label: "토큰/모델", icon: Coins },
      { href: "/workspace", label: "워크스페이스", icon: FolderKanban },
    ],
  },
  {
    key: "admin-portal",
    label: "Portal 서비스",
    icon: LayoutDashboard,
    visibility: "admin",
    badge: "modules/portal",
    items: [
      { href: "/nps-dashboard", label: "NPS 대시보드", icon: BarChart3 },
      { href: "/dashboard/metrics", label: "운영 지표", icon: TrendingUp },
      { href: "/projects", label: "프로젝트", icon: FolderKanban },
    ],
  },
  {
    key: "admin-gate",
    label: "Gate 서비스",
    icon: CheckCircle,
    visibility: "admin",
    badge: "modules/gate",
    items: [
      { href: "/orchestration", label: "오케스트레이션", icon: Activity },
    ],
  },
  {
    key: "admin-launch",
    label: "Launch 서비스",
    icon: Rocket,
    visibility: "admin",
    badge: "modules/launch",
    items: [
      { href: "/prototype-dashboard", label: "Prototype", icon: FlaskConical },
      { href: "/builder-quality", label: "Quality", icon: BarChart3 },
    ],
  },
  {
    key: "admin-core",
    label: "Core (Foundry-X)",
    icon: GitBranch,
    visibility: "admin",
    badge: "core",
    items: [
      { href: "/agents", label: "에이전트", icon: Bot },
      { href: "/architecture", label: "아키텍처", icon: Blocks },
      { href: "/methodologies", label: "방법론", icon: Library },
    ],
  },
];

const DEFAULT_MEMBER_BOTTOM_ITEMS: NavItem[] = [
  { href: "/wiki", label: "위키", icon: BookOpen },
  { href: "/settings", label: "설정", icon: Settings },
];

/* ------------------------------------------------------------------ */
/*  CMS-driven Navigation (TinaCMS content → NavItem/NavGroup)         */
/* ------------------------------------------------------------------ */

const cmsNav: SidebarConfig | null = loadSidebarConfig();

function cmsItemToNav(item: { href: string; label: string; iconKey: string }): NavItem {
  return { href: item.href, label: item.label, icon: getIcon(item.iconKey) };
}

const topItems: NavItem[] = cmsNav
  ? cmsNav.topItems
      .filter((i) => i.visible !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(cmsItemToNav)
  : DEFAULT_TOP_ITEMS;

const processGroups: NavGroup[] = cmsNav
  ? cmsNav.processGroups
      .filter((g) => g.visible !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((g) => ({
        key: g.key,
        label: g.label,
        icon: getIcon(g.iconKey ?? g.items[0]?.iconKey ?? "HelpCircle"),
        stageColor: g.stageColor,
        collapsed: g.collapsed,
        badge: g.badge,
        items: g.items
          .filter((i) => i.visible !== false)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map(cmsItemToNav),
      }))
  : DEFAULT_PROCESS_GROUPS;

const memberBottomItems: NavItem[] = cmsNav
  ? cmsNav.bottomItems
      .filter((i) => i.visible !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(cmsItemToNav)
  : DEFAULT_MEMBER_BOTTOM_ITEMS;

const adminGroups: NavGroup[] = cmsNav?.adminGroups
  ? cmsNav.adminGroups
      .filter((g) => g.visible !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((g) => ({
        key: g.key,
        label: g.label,
        icon: getIcon(g.iconKey ?? "Settings"),
        visibility: "admin" as Visibility,
        items: g.items
          .filter((i) => i.visible !== false)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map(cmsItemToNav),
      }))
  : DEFAULT_ADMIN_GROUPS;

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
