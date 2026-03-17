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
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wiki", label: "Wiki", icon: BookOpen },
  { href: "/architecture", label: "Architecture", icon: Blocks },
  { href: "/workspace", label: "Workspace", icon: FolderKanban },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/tokens", label: "Tokens", icon: Coins },
];

function NavLinks({ onSelect }: { onSelect?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
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
      })}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-2 border-b bg-background px-4 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="size-9" />}>
            <Menu className="size-5" />
            <span className="sr-only">Toggle menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle className="text-base font-bold">Foundry-X</SheetTitle>
            </SheetHeader>
            <div className="p-3">
              <NavLinks onSelect={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        <span className="text-sm font-bold">Foundry-X</span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile spacer */}
      <div className="h-14 lg:hidden" />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:bg-card">
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-base font-bold">Foundry-X</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <NavLinks />
        </div>
      </aside>
    </>
  );
}
