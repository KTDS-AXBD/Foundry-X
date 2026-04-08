import { Navigate, createBrowserRouter, useParams } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { LandingLayout } from "@/layouts/LandingLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function RedirectDiscoveryDetail() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/discovery/items/${id}`} replace />;
}

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <LandingLayout />,
    hydrateFallbackElement: <Spinner />,
    children: [
      { index: true, lazy: () => import("@/routes/landing") },
    ],
  },
  { path: "login", lazy: () => import("@/routes/login"), hydrateFallbackElement: <Spinner /> },
  { path: "invite", lazy: () => import("@/routes/invite"), hydrateFallbackElement: <Spinner /> },
  {
    element: <ProtectedRoute />,
    hydrateFallbackElement: <Spinner />,
    children: [{
    element: <AppLayout />,
    children: [
      // ── 비프로세스 ──
      { path: "dashboard", lazy: () => import("@/routes/dashboard") },
      { path: "getting-started", lazy: () => import("@/routes/getting-started") },
      { path: "team-shared", lazy: () => import("@/routes/team-shared") },
      { path: "ax-bd/demo", lazy: () => import("@/routes/ax-bd/demo-scenario") },

      // ── Phase 13 v1.3 신규 경로 ──
      { path: "discovery", lazy: () => import("@/routes/discovery-unified") },
      { path: "shaping/business-plan", lazy: () => import("@/routes/ax-bd/index") },
      { path: "nps-dashboard", lazy: () => import("@/routes/nps-dashboard") },
      { path: "settings", lazy: () => import("@/routes/settings-jira") },

      // ── F434: 1/4/5/6단계 catch-all → /discovery 리다이렉트 ──
      { path: "collection/*", element: <Navigate to="/discovery" replace /> },
      { path: "validation/*", element: <Navigate to="/discovery" replace /> },
      { path: "product/*", element: <Navigate to="/discovery" replace /> },
      { path: "gtm/*", element: <Navigate to="/discovery" replace /> },

      // ── 2단계 발굴 (discovery) ──
      { path: "discovery/items", lazy: () => import("@/routes/ax-bd/discovery") },
      { path: "discovery/items/:id", lazy: () => import("@/routes/ax-bd/discovery-detail") },
      { path: "discovery/ideas-bmc", lazy: () => import("@/routes/ax-bd/ideas-bmc") },
      { path: "discovery/dashboard", lazy: () => import("@/routes/ax-bd/discover-dashboard") },
      { path: "discovery/progress", lazy: () => import("@/routes/discovery-progress") },
      { path: "discovery/report", lazy: () => import("@/routes/ax-bd/evaluation-report") },
      { path: "discovery/persona-eval/:itemId", lazy: () => import("@/routes/ax-bd/persona-eval") },
      { path: "discovery/items/:id/report", lazy: () => import("@/routes/ax-bd/discovery-report") },
      { path: "discovery/items/:bizItemId/prds", lazy: () => import("@/routes/prd-management") },

      // ── 3단계 형상화 (shaping) ──
      { path: "shaping/prd", lazy: () => import("@/routes/spec-generator") },
      { path: "shaping/proposal", lazy: () => import("@/routes/ax-bd/index") },
      { path: "shaping/prototype", lazy: () => import("@/routes/shaping-prototype") },
      { path: "shaping/review", lazy: () => import("@/routes/ax-bd/shaping") },
      { path: "shaping/review/:runId", lazy: () => import("@/routes/ax-bd/shaping-detail") },
      { path: "shaping/offerings", lazy: () => import("@/routes/offerings-list") },
      { path: "shaping/offerings/new", lazy: () => import("@/routes/offering-create-wizard") },
      { path: "shaping/offering", lazy: () => import("@/routes/offering-packs") },
      { path: "shaping/offering/givc-pitch", lazy: () => import("@/routes/offering-pack-givc-pitch") },
      { path: "shaping/offering/:id", lazy: () => import("@/routes/offering-pack-detail") },
      { path: "shaping/offering/:id/brief", lazy: () => import("@/routes/offering-brief") },
      { path: "shaping/offering/:id/edit", lazy: () => import("@/routes/offering-editor") },
      { path: "shaping/offering/:id/validate", lazy: () => import("@/routes/offering-validate") },
      { path: "shaping/offering/:id/tokens", lazy: () => import("@/routes/offering-tokens") },


      // ── ax-bd 하위 (현행 유지) ──
      { path: "ax-bd/ideas", lazy: () => import("@/routes/ax-bd/ideas") },
      { path: "ax-bd/ideas/:id", lazy: () => import("@/routes/ax-bd/idea-detail") },
      { path: "ax-bd/bmc", lazy: () => import("@/routes/ax-bd/bmc") },
      { path: "ax-bd/bmc/new", lazy: () => import("@/routes/ax-bd/bmc-new") },
      { path: "ax-bd/bmc/:id", lazy: () => import("@/routes/ax-bd/bmc-detail") },
      { path: "ax-bd/bdp/:bizItemId", lazy: () => import("@/routes/ax-bd/bdp-detail") },
      { path: "ax-bd/process-guide", lazy: () => import("@/routes/ax-bd/process-guide") },
      { path: "ax-bd/skill-catalog", lazy: () => import("@/routes/ax-bd/skill-catalog") },
      { path: "ax-bd/skill-catalog/:skillId", lazy: () => import("@/routes/ax-bd/skill-detail") },
      { path: "ax-bd/artifacts", lazy: () => import("@/routes/ax-bd/artifacts") },
      { path: "ax-bd/artifacts/:id", lazy: () => import("@/routes/ax-bd/artifact-detail") },
      { path: "ax-bd/progress", lazy: () => import("@/routes/ax-bd/progress") },
      { path: "ax-bd/ontology", lazy: () => import("@/routes/ax-bd/ontology") },

      // ── Sprint 160: Prototype Dashboard (F356) ──
      { path: "prototype-dashboard", lazy: () => import("@/routes/prototype-dashboard") },
      { path: "prototype-dashboard/:id", lazy: () => import("@/routes/prototype-detail") },
      // ── Sprint 178: Builder Quality Dashboard (F390, F391) ──
      { path: "builder-quality", lazy: () => import("@/routes/builder-quality") },

      // ── 지식/관리/설정 (변경 없음) ──
      { path: "wiki", lazy: () => import("@/routes/wiki") },
      { path: "tools-guide", lazy: () => import("@/routes/tools-guide") },
      { path: "methodologies", lazy: () => import("@/routes/methodologies") },
      { path: "analytics", lazy: () => import("@/routes/analytics") },
      { path: "agents", lazy: () => import("@/routes/agents") },
      { path: "orchestration", lazy: () => import("@/routes/orchestration") },
      { path: "dashboard/metrics", lazy: () => import("@/routes/dashboard.metrics") },
      { path: "tokens", lazy: () => import("@/routes/tokens") },
      { path: "architecture", lazy: () => import("@/routes/architecture") },
      { path: "workspace", lazy: () => import("@/routes/workspace") },
      { path: "workspace/org/members", lazy: () => import("@/routes/workspace-org-members") },
      { path: "workspace/org/settings", lazy: () => import("@/routes/workspace-org-settings") },
      { path: "settings/jira", lazy: () => import("@/routes/settings-jira") },
      { path: "settings/nps", lazy: () => import("@/routes/nps-dashboard") },
      { path: "backup", lazy: () => import("@/routes/backup") },

      // ── Redirects ──
      { path: "ax-bd/discovery", element: <Navigate to="/discovery/items" replace /> },
      { path: "ax-bd/discovery/:id", element: <RedirectDiscoveryDetail /> },
      { path: "ax-bd/ideas-bmc", element: <Navigate to="/discovery/ideas-bmc" replace /> },
      { path: "ax-bd/discover-dashboard", element: <Navigate to="/discovery/dashboard" replace /> },
      { path: "discovery-progress", element: <Navigate to="/discovery/progress" replace /> },
      { path: "spec-generator", element: <Navigate to="/shaping/prd" replace /> },
      { path: "ax-bd", element: <Navigate to="/shaping/proposal" replace /> },
      { path: "ax-bd/shaping", element: <Navigate to="/shaping/review" replace /> },
      { path: "offering-packs", element: <Navigate to="/shaping/offering" replace /> },
      // F434: 구 1/4/5/6단계 단축 경로 → /discovery
      { path: "sr", element: <Navigate to="/discovery" replace /> },
      { path: "pipeline", element: <Navigate to="/discovery" replace /> },
      { path: "mvp-tracking", element: <Navigate to="/discovery" replace /> },
      { path: "projects", element: <Navigate to="/discovery" replace /> },
    ],
  }],
  },
]);
