"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Anvil } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { href: "#process", label: "BDP 프로세스" },
  { href: "#features", label: "핵심 기능" },
  { href: "#agents", label: "AI 에이전트" },
  { href: "#architecture", label: "아키텍처" },
  { href: "#roadmap", label: "로드맵" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-axis-primary/10 bg-background/80 backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-axis-primary/10">
            <Anvil className="size-4 text-axis-primary" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            Foundry-X
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-axis-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="axis-glow inline-flex h-9 items-center rounded-lg bg-axis-primary px-4 text-sm font-semibold text-white transition-all hover:bg-axis-primary-hover"
          >
            Dashboard
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden"
          aria-label="Toggle menu"
        >
          {open ? (
            <X className="size-5 text-foreground" />
          ) : (
            <Menu className="size-5 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-3 border-t border-border/50 pt-3">
              <ThemeToggle />
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="axis-glow inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-axis-primary text-sm font-semibold text-white"
              >
                Dashboard
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
