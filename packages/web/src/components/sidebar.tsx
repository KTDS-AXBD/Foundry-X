"use client";

import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
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
  Target,
  Library,
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
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Navigation Structure — AX BD 프로세스 6단계 기반 그룹               */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  stageColor?: string; // 프로세스 단계 그룹에만 사용 — AXIS 색상 뱃지
}

const topItems: NavItem[] = [
  { href: "/getting-started", label: "시작하기", icon: Rocket },
  { href: "/dashboard", label: "홈", icon: LayoutDashboard },
];

/* ── 프로세스 6단계: 수집→발굴→형상화→검증/공유→제품화→GTM ── */

const processGroups: NavGroup[] = [
  {
    key: "collect",
    label: "1. 수집",
    icon: Inbox,
    stageColor: "bg-axis-blue",
    items: [
      { href: "/sr", label: "SR 목록", icon: ClipboardList },
      { href: "/discovery/collection", label: "수집 채널", icon: Radio },
      { href: "/ir-proposals", label: "IR Bottom-up", icon: ArrowUpFromLine },
    ],
  },
  {
    key: "discover",
    label: "2. 발굴",
    icon: Search,
    stageColor: "bg-axis-violet",
    items: [
      { href: "/ax-bd/discovery", label: "Discovery 프로세스", icon: Map },
      { href: "/ax-bd/ideas", label: "아이디어 관리", icon: Lightbulb },
      { href: "/ax-bd/bmc", label: "BMC", icon: Blocks },
      { href: "/discovery-progress", label: "진행률", icon: BarChart3 },
    ],
  },
  {
    key: "shape",
    label: "3. 형상화",
    icon: PenTool,
    stageColor: "bg-axis-warm",
    items: [
      { href: "/spec-generator", label: "Spec 생성", icon: FileText },
      { href: "/ax-bd", label: "사업제안서", icon: FileSignature },
      { href: "/offering-packs", label: "Offering Pack", icon: Package },
    ],
  },
  {
    key: "validate",
    label: "4. 검증/공유",
    icon: CheckCircle,
    stageColor: "bg-axis-green",
    items: [
      { href: "/pipeline", label: "파이프라인", icon: GitBranch },
    ],
  },
  {
    key: "productize",
    label: "5. 제품화",
    icon: Rocket,
    stageColor: "bg-axis-indigo",
    items: [
      { href: "/mvp-tracking", label: "MVP 추적", icon: Target },
    ],
  },
  {
    key: "gtm",
    label: "6. GTM",
    icon: TrendingUp,
    stageColor: "bg-axis-rose",
    items: [
      { href: "/projects", label: "프로젝트 현황", icon: FolderKanban },
    ],
  },
];

const knowledgeGroup: NavGroup = {
  key: "knowledge",
  label: "지식",
  icon: BookOpen,
  items: [
    { href: "/wiki", label: "지식베이스", icon: BookOpen },
    { href: "/methodologies", label: "방법론 관리", icon: Library },
  ],
};

const adminGroup: NavGroup = {
  key: "admin",
  label: "관리",
  icon: Settings,
  items: [
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/agents", label: "에이전트", icon: Bot },
    { href: "/tokens", label: "토큰 비용", icon: Coins },
    { href: "/architecture", label: "아키텍처", icon: Blocks },
    { href: "/workspace", label: "내 작업", icon: FolderKanban },
    { href: "/settings/jira", label: "설정", icon: Settings },
  ],
};

const externalGroup: NavGroup = {
  key: "external",
  label: "외부 서비스",
  icon: Link2,
  items: [
    { href: "/discovery", label: "Discovery-X", icon: Search },
    { href: "/foundry", label: "AI Foundry", icon: FlaskConical },
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

  const allGroups = [...processGroups, knowledgeGroup, adminGroup, externalGroup];

  // 활성 경로가 포함된 그룹은 자동 펼침
  useEffect(() => {
    for (const group of allGroups) {
      if (group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))) {
        if (!openGroups.has(group.key)) {
          toggle(group.key);
        }
      }
    }
    // pathname 변경 시에만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <nav className="flex flex-col gap-0.5">
      {/* 시작하기 + 홈 */}
      {topItems.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          pathname={pathname}
          onSelect={onSelect}
        />
      ))}

      {/* 구분선 */}
      <div className="my-2 border-t border-border/40" />

      {/* 프로세스 6단계 */}
      {processGroups.map((group) => (
        <CollapsibleGroup
          key={group.key}
          group={group}
          pathname={pathname}
          isOpen={openGroups.has(group.key)}
          onToggle={() => toggle(group.key)}
          onSelect={onSelect}
        />
      ))}

      {/* 구분선 */}
      <div className="my-2 border-t border-border/40" />

      {/* 지식 */}
      <CollapsibleGroup
        group={knowledgeGroup}
        pathname={pathname}
        isOpen={openGroups.has(knowledgeGroup.key)}
        onToggle={() => toggle(knowledgeGroup.key)}
        onSelect={onSelect}
      />

      {/* 관리 */}
      <CollapsibleGroup
        group={adminGroup}
        pathname={pathname}
        isOpen={openGroups.has(adminGroup.key)}
        onToggle={() => toggle(adminGroup.key)}
        onSelect={onSelect}
      />

      {/* 구분선 */}
      <div className="my-2 border-t border-border/40" />

      {/* 외부 서비스 */}
      <CollapsibleGroup
        group={externalGroup}
        pathname={pathname}
        isOpen={openGroups.has(externalGroup.key)}
        onToggle={() => toggle(externalGroup.key)}
        onSelect={onSelect}
      />

      {/* 도움말 */}
      <NavLink
        item={{ href: "/getting-started", label: "도움말", icon: HelpCircle }}
        pathname={pathname}
        onSelect={onSelect}
      />
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
