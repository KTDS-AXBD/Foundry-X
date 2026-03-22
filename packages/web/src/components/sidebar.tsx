"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Blocks,
  FolderKanban,
  Bot,
  Coins,
  BarChart3,
  Menu,
  Search,
  FlaskConical,
  LogIn,
  LogOut,
} from "lucide-react";
import { useEffect } from "react";
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

const fxNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wiki", label: "Wiki", icon: BookOpen },
  { href: "/architecture", label: "Architecture", icon: Blocks },
  { href: "/workspace", label: "Workspace", icon: FolderKanban },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/tokens", label: "Tokens", icon: Coins },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const serviceNavItems = [
  { href: "/discovery", label: "Discovery-X", icon: Search },
  { href: "/foundry", label: "AI Foundry", icon: FlaskConical },
];

function NavLinks({ onSelect }: { onSelect?: () => void }) {
  const pathname = usePathname();

  const renderItems = (items: typeof fxNavItems) =>
    items.map((item) => {
      const active = pathname === item.href;
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onSelect}
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
    });

  return (
    <nav className="flex flex-col gap-1">
      {renderItems(fxNavItems)}
      <span className="mt-3 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        Services
      </span>
      {renderItems(serviceNavItems)}
    </nav>
  );
}

function AuthSection() {
  const { user, isAuthenticated, logout, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
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
          <SheetContent side="left" className="w-60 p-0">
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle className="text-base font-bold">Foundry-X</SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 flex-col p-3">
              <OrgSwitcher />
              <NavLinks onSelect={() => setOpen(false)} />
              <div className="mt-auto border-t pt-3">
                <AuthSection />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/dashboard" className="text-sm font-bold">Foundry-X</Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile spacer */}
      <div className="h-14 lg:hidden" />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:bg-card">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/dashboard" className="text-base font-bold">Foundry-X</Link>
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
