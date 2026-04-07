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
  FileOutput,
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
  FileOutput,
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

/* ── Loader (SSOT: content/navigation/sidebar.json) ── */
// sidebar.json이 없으면 빌드 에러 — fallback 없이 즉시 감지
import sidebarData from "../../content/navigation/sidebar.json";

export function loadSidebarConfig(): SidebarConfig {
  return sidebarData as SidebarConfig;
}
