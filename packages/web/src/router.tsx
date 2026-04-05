import { Navigate, createBrowserRouter } from "react-router-dom";
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
      // ── 비프로세스 (변경 없음) ──
      { path: "dashboard", lazy: () => import("@/routes/dashboard") },
      { path: "getting-started", lazy: () => import("@/routes/getting-started") },
      { path: "team-shared", lazy: () => import("@/routes/team-shared") },
      { path: "ax-bd/demo", lazy: () => import("@/routes/ax-bd/demo-scenario") },

      // ── 1단계 수집 (collection) ──
      { path: "collection/sr", lazy: () => import("@/routes/sr") },
      { path: "collection/sr/:id", lazy: () => import("@/routes/sr-detail") },
      { path: "collection/field", lazy: () => import("@/routes/discovery-collection") },
      { path: "collection/ideas", lazy: () => import("@/routes/ir-proposals") },
      { path: "collection/agent", lazy: () => import("@/routes/collection-agent") },

      // ── 2단계 발굴 (discovery) ──
      { path: "discovery/items", lazy: () => import("@/routes/ax-bd/discovery") },
      { path: "discovery/items/:id", lazy: () => import("@/routes/ax-bd/discovery-detail") },
      { path: "discovery/ideas-bmc", lazy: () => import("@/routes/ax-bd/ideas-bmc") },
      { path: "discovery/dashboard", lazy: () => import("@/routes/ax-bd/discover-dashboard") },
      { path: "discovery/progress", lazy: () => import("@/routes/discovery-progress") },
      { path: "discovery/report", lazy: () => import("@/routes/ax-bd/evaluation-report") },

      // ── 3단계 형상화 (shaping) ──
      { path: "shaping/prd", lazy: () => import("@/routes/spec-generator") },
      { path: "shaping/proposal", lazy: () => import("@/routes/ax-bd/index") },
      { path: "shaping/prototype", lazy: () => import("@/routes/shaping-prototype") },
      { path: "shaping/review", lazy: () => import("@/routes/ax-bd/shaping") },
      { path: "shaping/review/:runId", lazy: () => import("@/routes/ax-bd/shaping-detail") },
      { path: "shaping/offering", lazy: () => import("@/routes/offering-packs") },
      { path: "shaping/offering/givc-pitch", lazy: () => import("@/routes/offering-pack-givc-pitch") },
      { path: "shaping/offering/:id", lazy: () => import("@/routes/offering-pack-detail") },
      { path: "shaping/offering/:id/brief", lazy: () => import("@/routes/offering-brief") },

      // ── 4단계 검증/공유 (validation) ──
      { path: "validation/pipeline", lazy: () => import("@/routes/pipeline") },
      { path: "validation/division", lazy: () => import("@/routes/validation-division") },
      { path: "validation/company", lazy: () => import("@/routes/validation-company") },
      { path: "validation/meetings", lazy: () => import("@/routes/validation-meetings") },

      // ── 5단계 제품화 (product) ──
      { path: "product/mvp", lazy: () => import("@/routes/mvp-tracking") },
      { path: "product/poc", lazy: () => import("@/routes/product-poc") },

      // ── 6단계 GTM ──
      { path: "gtm/projects", lazy: () => import("@/routes/projects") },
      { path: "gtm/outreach", lazy: () => import("@/routes/gtm-outreach") },
      { path: "gtm/outreach/:id", lazy: () => import("@/routes/gtm-outreach-detail") },

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

      // ── 지식/관리/설정 (변경 없음) ──
      { path: "wiki", lazy: () => import("@/routes/wiki") },
      { path: "tools-guide", lazy: () => import("@/routes/tools-guide") },
      { path: "methodologies", lazy: () => import("@/routes/methodologies") },
      { path: "analytics", lazy: () => import("@/routes/analytics") },
      { path: "agents", lazy: () => import("@/routes/agents") },
      { path: "tokens", lazy: () => import("@/routes/tokens") },
      { path: "architecture", lazy: () => import("@/routes/architecture") },
      { path: "workspace", lazy: () => import("@/routes/workspace") },
      { path: "workspace/org/members", lazy: () => import("@/routes/workspace-org-members") },
      { path: "workspace/org/settings", lazy: () => import("@/routes/workspace-org-settings") },
      { path: "settings/jira", lazy: () => import("@/routes/settings-jira") },
      { path: "settings/nps", lazy: () => import("@/routes/nps-dashboard") },
      { path: "backup", lazy: () => import("@/routes/backup") },

      // ── 외부 서비스 (이전) ──
      { path: "external/discovery-x", lazy: () => import("@/routes/discovery") },
      { path: "external/foundry", lazy: () => import("@/routes/foundry") },

      // ── Redirects (16건) — 기존 경로 → 새 경로 ──
      { path: "sr", element: <Navigate to="/collection/sr" replace /> },
      { path: "discovery/collection", element: <Navigate to="/collection/field" replace /> },
      { path: "ir-proposals", element: <Navigate to="/collection/ideas" replace /> },
      { path: "ax-bd/discovery", element: <Navigate to="/discovery/items" replace /> },
      { path: "ax-bd/ideas-bmc", element: <Navigate to="/discovery/ideas-bmc" replace /> },
      { path: "ax-bd/discover-dashboard", element: <Navigate to="/discovery/dashboard" replace /> },
      { path: "discovery-progress", element: <Navigate to="/discovery/progress" replace /> },
      { path: "spec-generator", element: <Navigate to="/shaping/prd" replace /> },
      { path: "ax-bd", element: <Navigate to="/shaping/proposal" replace /> },
      { path: "ax-bd/shaping", element: <Navigate to="/shaping/review" replace /> },
      { path: "offering-packs", element: <Navigate to="/shaping/offering" replace /> },
      { path: "pipeline", element: <Navigate to="/validation/pipeline" replace /> },
      { path: "mvp-tracking", element: <Navigate to="/product/mvp" replace /> },
      { path: "projects", element: <Navigate to="/gtm/projects" replace /> },
      { path: "discovery", element: <Navigate to="/external/discovery-x" replace /> },
      { path: "foundry", element: <Navigate to="/external/foundry" replace /> },
    ],
  }],
  },
]);
