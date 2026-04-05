/**
 * Build-time navigation loader for TinaCMS-managed sidebar JSON.
 * Imports content/navigation/sidebar.json at build time (Vite static import).
 * Falls back to null if the file doesn't exist.
 */

import type { LucideIcon } from "lucide-react";
import {
  ArrowUpFromLine,
  BarChart3,
  Blocks,
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  Code,
  Coins,
  FileSignature,
  FileText,
  FlaskConical,
  FolderKanban,
  GitBranch,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Library,
  Lightbulb,
  Link2,
  Map,
  Network,
  Package,
  PenTool,
  Presentation,
  Radio,
  Rocket,
  Search,
  Send,
  Settings,
  Shield,
  Target,
  TestTubes,
  TrendingUp,
  Users,
} from "lucide-react";

/* ── Types ── */

export interface SidebarNavItem {
  href: string;
  label: string;
  iconKey: string;
  visible?: boolean;
  sortOrder?: number;
}

export interface SidebarNavGroup {
  key: string;
  label: string;
  iconKey?: string;
  stageColor?: string;
  sortOrder?: number;
  visible?: boolean;
  collapsed?: boolean;
  badge?: string;
  items: SidebarNavItem[];
}

export interface SidebarConfig {
  navId: string;
  topItems: SidebarNavItem[];
  processGroups: SidebarNavGroup[];
  bottomItems: SidebarNavItem[];
  adminGroups?: SidebarNavGroup[];
}

/* ── Icon registry ── */

const iconMap: Record<string, LucideIcon> = {
  ArrowUpFromLine,
  BarChart3,
  Blocks,
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  Code,
  Coins,
  FileSignature,
  FileText,
  FlaskConical,
  FolderKanban,
  GitBranch,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Library,
  Lightbulb,
  Link2,
  Map,
  Network,
  Package,
  PenTool,
  Presentation,
  Radio,
  Rocket,
  Search,
  Send,
  Settings,
  Shield,
  Target,
  TestTubes,
  TrendingUp,
  Users,
};

export function getIcon(key: string): LucideIcon {
  return iconMap[key] ?? HelpCircle;
}

/* ── Loader ── */

let sidebarData: SidebarConfig | null = null;
try {
  // Vite resolves this at build time — if the file doesn't exist, the build still succeeds
  // because we catch the error and fall back to null.
  const mod = await import("../../content/navigation/sidebar.json");
  sidebarData = mod.default as SidebarConfig;
} catch {
  sidebarData = null;
}

export function loadSidebarConfig(): SidebarConfig | null {
  return sidebarData;
}
