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
  FlaskConical,
  LogIn,
  LogOut,
  Rocket,
  FileText,
  FolderKanban,
  ChevronRight,
  HelpCircle,
  Link2,
  Inbox,
  TrendingUp,
  Settings,
  Map,
  Lightbulb,
  Radio,
  ArrowUpFromLine,
  PenTool,
  FileSignature,
  Package,
  CheckCircle,
  GitBranch,
  Shield,
  Building2,
  CalendarDays,
  Target,
  Library,
  Users,
  Network,
  Presentation,
  ClipboardCheck,
  TestTubes,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

const topItems: NavItem[] = [
  {
    href: "/getting-started",
    label: "시작하기",
    icon: Rocket,
    visibility: "conditional",
    condition: (ctx) => !ctx.onboardingComplete,
  },
  { href: "/dashboard", label: "홈", icon: LayoutDashboard },
  { href: "/team-shared", label: "팀 공유", icon: Users },
  { href: "/ax-bd/demo", label: "데모 시나리오", icon: Presentation },
];

/* ── 프로세스 6단계: 수집→발굴→형상화→검증/공유→제품화→GTM ── */

const processGroups: NavGroup[] = [
  {
    key: "collect",
    label: "1. 수집",
    icon: Inbox,
    stageColor: "bg-axis-blue",
    items: [
      { href: "/collection/sr", label: "SR 목록", icon: ClipboardList },
      { href: "/collection/field", label: "Field 수집", icon: Radio },
      { href: "/collection/ideas", label: "IDEA Portal", icon: ArrowUpFromLine },
      { href: "/collection/agent", label: "Agent 수집", icon: Bot },
    ],
  },
  {
    key: "discover",
    label: "2. 발굴",
    icon: Search,
    stageColor: "bg-axis-violet",
    items: [
      { href: "/discovery/items", label: "Discovery", icon: Map },
      { href: "/discovery/ideas-bmc", label: "아이디어·BMC", icon: Lightbulb },
      { href: "/discovery/dashboard", label: "대시보드", icon: BarChart3 },
      { href: "/discovery/report", label: "평가 결과서", icon: ClipboardCheck },
    ],
  },
  {
    key: "shape",
    label: "3. 형상화",
    icon: PenTool,
    stageColor: "bg-axis-warm",
    items: [
      { href: "/shaping/prd", label: "PRD", icon: FileText },
      { href: "/shaping/proposal", label: "사업제안서", icon: FileSignature },
      { href: "/shaping/review", label: "형상화 리뷰", icon: ClipboardCheck },
      { href: "/shaping/offering", label: "Offering Pack", icon: Package },
    ],
  },
  {
    key: "validate",
    label: "4. 검증/공유",
    icon: CheckCircle,
    stageColor: "bg-axis-green",
    items: [
      { href: "/validation/pipeline", label: "파이프라인", icon: GitBranch },
      { href: "/validation/division", label: "본부 검증", icon: Shield },
      { href: "/validation/company", label: "전사 검증", icon: Building2 },
      { href: "/validation/meetings", label: "미팅 관리", icon: CalendarDays },
    ],
  },
  {
    key: "productize",
    label: "5. 제품화",
    icon: Rocket,
    stageColor: "bg-axis-indigo",
    items: [
      { href: "/product/mvp", label: "MVP 추적", icon: Target },
      { href: "/product/poc", label: "PoC 관리", icon: TestTubes },
    ],
  },
  {
    key: "gtm",
    label: "6. GTM",
    icon: TrendingUp,
    stageColor: "bg-axis-rose",
    items: [
      { href: "/gtm/projects", label: "프로젝트 현황", icon: FolderKanban },
    ],
  },
];

const knowledgeGroup: NavGroup = {
  key: "knowledge",
  label: "지식",
  icon: BookOpen,
  items: [
    { href: "/wiki", label: "지식베이스", icon: BookOpen, visibility: "admin" },
    { href: "/methodologies", label: "방법론 관리", icon: Library, visibility: "admin" },
    { href: "/ax-bd/skill-catalog", label: "스킬 카탈로그", icon: Library },
    { href: "/ax-bd/ontology", label: "Ontology", icon: Network, visibility: "admin" },
  ],
};

const adminGroup: NavGroup = {
  key: "admin",
  label: "관리",
  icon: Settings,
  visibility: "admin",
  items: [
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/agents", label: "에이전트", icon: Bot },
    { href: "/tokens", label: "토큰 비용", icon: Coins },
    { href: "/architecture", label: "아키텍처", icon: Blocks },
    { href: "/workspace", label: "내 작업", icon: FolderKanban },
    { href: "/settings/jira", label: "설정", icon: Settings },
  ],
};

const memberBottomItems: NavItem[] = [
  { href: "/getting-started", label: "도움말", icon: HelpCircle },
  { href: "/settings/jira", label: "설정", icon: Settings },
];

const externalGroup: NavGroup = {
  key: "external",
  label: "외부 서비스",
  icon: Link2,
  visibility: "admin",
  items: [
    { href: "/external/discovery-x", label: "Discovery-X", icon: Search },
    { href: "/external/foundry", label: "AI Foundry", icon: FlaskConical },
  ],
};

/* ------------------------------------------------------------------ */
/*  Collapsible Group State (localStorage 영속)                        */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "fx-sidebar-groups";

function useGroupState() {
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(["collect", "discover", "shape", "validate", "productize", "gtm"]), // 프로세스 6단계 기본 펼침
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
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200",
            isOpen && "rotate-90",
          )}
        />
      </button>
      {isOpen && (
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
      .map((g) => ({ ...g, items: g.items.filter((item) => isVisible(item, ctx)) }))
      .filter((g) => g.items.length > 0),
    [ctx],
  );

  const filteredKnowledge = useMemo(() => {
    if (!isVisible(knowledgeGroup, ctx)) return null;
    const items = knowledgeGroup.items.filter((item) => isVisible(item, ctx));
    return items.length > 0 ? { ...knowledgeGroup, items } : null;
  }, [ctx]);

  const filteredAdmin = useMemo(
    () => (isVisible(adminGroup, ctx) ? adminGroup : null),
    [ctx],
  );

  const filteredExternal = useMemo(
    () => (isVisible(externalGroup, ctx) ? externalGroup : null),
    [ctx],
  );

  const allVisibleGroups = useMemo(
    () => [
      ...filteredProcessGroups,
      ...(filteredKnowledge ? [filteredKnowledge] : []),
      ...(filteredAdmin ? [filteredAdmin] : []),
      ...(filteredExternal ? [filteredExternal] : []),
    ],
    [filteredProcessGroups, filteredKnowledge, filteredAdmin, filteredExternal],
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
      {/* 시작하기(조건부) + 홈 + 팀공유 + 데모 */}
      {filteredTopItems.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onSelect={onSelect} />
      ))}

      <div className="my-2 border-t border-border/40" />

      {/* 프로세스 6단계 */}
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

      {/* 지식 (필터링 후 아이템이 있을 때만) */}
      {filteredKnowledge && (
        <CollapsibleGroup
          group={filteredKnowledge}
          pathname={pathname}
          isOpen={openGroups.has(filteredKnowledge.key)}
          onToggle={() => toggle(filteredKnowledge.key)}
          onSelect={onSelect}
        />
      )}

      {/* 관리 (Admin 전용) */}
      {filteredAdmin && (
        <CollapsibleGroup
          group={filteredAdmin}
          pathname={pathname}
          isOpen={openGroups.has(filteredAdmin.key)}
          onToggle={() => toggle(filteredAdmin.key)}
          onSelect={onSelect}
        />
      )}

      {filteredExternal && (
        <>
          <div className="my-2 border-t border-border/40" />
          <CollapsibleGroup
            group={filteredExternal}
            pathname={pathname}
            isOpen={openGroups.has(filteredExternal.key)}
            onToggle={() => toggle(filteredExternal.key)}
            onSelect={onSelect}
          />
        </>
      )}

      {/* Member 하단: 도움말 + 설정 */}
      {!isAdmin && (
        <>
          <div className="my-2 border-t border-border/40" />
          {memberBottomItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onSelect={onSelect} />
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
