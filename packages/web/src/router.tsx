import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { LandingLayout } from "@/layouts/LandingLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    element: <LandingLayout />,
    children: [
      { index: true, lazy: () => import("@/routes/landing") },
    ],
  },
  { path: "login", lazy: () => import("@/routes/login") },
  { path: "invite", lazy: () => import("@/routes/invite") },
  {
    element: <ProtectedRoute />,
    children: [{
    element: <AppLayout />,
    children: [
      { path: "dashboard", lazy: () => import("@/routes/dashboard") },
      { path: "agents", lazy: () => import("@/routes/agents") },
      { path: "analytics", lazy: () => import("@/routes/analytics") },
      { path: "architecture", lazy: () => import("@/routes/architecture") },
      { path: "discovery", lazy: () => import("@/routes/discovery") },
      { path: "discovery/collection", lazy: () => import("@/routes/discovery-collection") },
      { path: "discovery-progress", lazy: () => import("@/routes/discovery-progress") },
      { path: "foundry", lazy: () => import("@/routes/foundry") },
      { path: "getting-started", lazy: () => import("@/routes/getting-started") },
      { path: "ir-proposals", lazy: () => import("@/routes/ir-proposals") },
      { path: "methodologies", lazy: () => import("@/routes/methodologies") },
      { path: "mvp-tracking", lazy: () => import("@/routes/mvp-tracking") },
      { path: "offering-packs", lazy: () => import("@/routes/offering-packs") },
      { path: "offering-packs/givc-pitch", lazy: () => import("@/routes/offering-pack-givc-pitch") },
      { path: "offering-packs/:id", lazy: () => import("@/routes/offering-pack-detail") },
      { path: "pipeline", lazy: () => import("@/routes/pipeline") },
      { path: "projects", lazy: () => import("@/routes/projects") },
      { path: "settings/jira", lazy: () => import("@/routes/settings-jira") },
      { path: "spec-generator", lazy: () => import("@/routes/spec-generator") },
      { path: "sr", lazy: () => import("@/routes/sr") },
      { path: "sr/:id", lazy: () => import("@/routes/sr-detail") },
      { path: "tokens", lazy: () => import("@/routes/tokens") },
      { path: "wiki", lazy: () => import("@/routes/wiki") },
      { path: "workspace", lazy: () => import("@/routes/workspace") },
      { path: "workspace/org/members", lazy: () => import("@/routes/workspace-org-members") },
      { path: "workspace/org/settings", lazy: () => import("@/routes/workspace-org-settings") },
      { path: "ax-bd", lazy: () => import("@/routes/ax-bd/index") },
      { path: "ax-bd/discovery", lazy: () => import("@/routes/ax-bd/discovery") },
      { path: "ax-bd/discovery/:id", lazy: () => import("@/routes/ax-bd/discovery-detail") },
      { path: "ax-bd/bmc", lazy: () => import("@/routes/ax-bd/bmc") },
      { path: "ax-bd/bmc/new", lazy: () => import("@/routes/ax-bd/bmc-new") },
      { path: "ax-bd/ideas", lazy: () => import("@/routes/ax-bd/ideas") },
      { path: "ax-bd/ideas/:id", lazy: () => import("@/routes/ax-bd/idea-detail") },
      { path: "ax-bd/bmc/:id", lazy: () => import("@/routes/ax-bd/bmc-detail") },
      { path: "ax-bd/bdp/:bizItemId", lazy: () => import("@/routes/ax-bd/bdp-detail") },
      { path: "ax-bd/process-guide", lazy: () => import("@/routes/ax-bd/process-guide") },
      { path: "ax-bd/skill-catalog", lazy: () => import("@/routes/ax-bd/skill-catalog") },
      { path: "team-shared", lazy: () => import("@/routes/team-shared") },
      { path: "settings/nps", lazy: () => import("@/routes/nps-dashboard") },
    ],
  }],
  },
]);
