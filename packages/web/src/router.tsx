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
      // ── 비프로세스 ──
      { path: "dashboard", lazy: () => import("@/routes/dashboard") },
      { path: "getting-started", lazy: () => import("@/routes/getting-started") },
      { path: "team-shared", lazy: () => import("@/routes/team-shared") },
      { path: "ax-bd/demo", lazy: () => import("@/routes/ax-bd/demo-scenario") },

      // ── Phase 13 v1.3 신규 경로 ──
      { path: "discovery", lazy: () => import("@/routes/discovery-unified") },
      { path: "validation", lazy: () => import("@/routes/validation-unified") },
      { path: "product", lazy: () => import("@/routes/product-unified") },
      { path: "shaping/business-plan", lazy: () => import("@/routes/ax-bd/index") },
      { path: "validation/share", lazy: () => import("@/routes/team-shared") },
      { path: "product/offering-pack", lazy: () => import("@/routes/offering-packs") },
      { path: "product/offering-pack/givc-pitch", lazy: () => import("@/routes/offering-pack-givc-pitch") },
      { path: "product/offering-pack/:id", lazy: () => import("@/routes/offering-pack-detail") },
      { path: "product/offering-pack/:id/brief", lazy: () => import("@/routes/offering-brief") },
      { path: "nps-dashboard", lazy: () => import("@/routes/nps-dashboard") },
      { path: "settings", lazy: () => import("@/routes/settings-jira") },

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
      { path: "discovery/persona-eval/:itemId", lazy: () => import("@/routes/ax-bd/persona-eval") },
      { path: "discovery/items/:id/report", lazy: () => import("@/routes/ax-bd/discovery-report") },

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

      // ── Sprint 160: Prototype Dashboard (F356) ──
      { path: "prototype-dashboard", lazy: () => import("@/routes/prototype-dashboard") },
      { path: "prototype-dashboard/:id", lazy: () => import("@/routes/prototype-detail") },

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

      // ── 외부 서비스 (이전) ──
      { path: "external/discovery-x", lazy: () => import("@/routes/discovery") },
      { path: "external/foundry", lazy: () => import("@/routes/foundry") },

      // ── Redirects (기존 15건, Phase 13 dead code 13건 제거 후) ──
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
      // discovery redirect 제거 — /discovery는 Phase 13에서 실제 라우트로 전환
      { path: "foundry", element: <Navigate to="/external/foundry" replace /> },

      // Phase 13 Redirects 13건 삭제 (2026-04-06 E2E 감사)
      // 각 path에 lazy route가 선행하여 Navigate가 도달 불가 (dead code)
      // 삭제 대상: team-shared, ax-bd/demo, discovery/items, discovery/ideas-bmc,
      // discovery/dashboard, shaping/proposal, shaping/review, validation/pipeline,
      // product/mvp, product/poc, tools-guide, analytics, settings/jira
    ],
  }],
  },
]);
