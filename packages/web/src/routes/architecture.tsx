"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import type { RepoProfile, RequirementItem } from "@foundry-x/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import ModuleMap from "@/components/feature/ModuleMap";
import MermaidDiagram from "@/components/feature/MermaidDiagram";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Tab = "modules" | "diagram" | "roadmap" | "requirements";

const statusVariant = (status: string) => {
  if (status === "done") return "default" as const;
  if (status === "in_progress") return "secondary" as const;
  return "outline" as const;
};

const statusLabel = (status: string) => {
  if (status === "done") return "Done";
  if (status === "in_progress") return "In Progress";
  return "Planned";
};

const ROADMAP_MILESTONES = [
  {
    version: "v0.1.0",
    title: "Phase 0 — Harness Bootstrap",
    status: "done",
    items: [
      "foundry-x init (CLAUDE.md + ARCHITECTURE.md + CONSTITUTION.md 생성)",
      "harness/analyze.ts — 리포 구조 분석",
      "harness/discover.ts — 마커 파일 탐지",
    ],
  },
  {
    version: "v0.2.0",
    title: "Phase 1 — SDD Triangle (Plumb)",
    status: "done",
    items: [
      "foundry-x sync — Plumb subprocess 연동",
      "plumb/bridge.ts — Python 프로세스 래퍼",
      "services/health-score.ts — Triangle 점수",
    ],
  },
  {
    version: "v0.3.0",
    title: "Phase 1 — Ink TUI",
    status: "done",
    items: [
      "Ink 5 + React 18 TUI 컴포넌트",
      "foundry-x status — 건강도 표시",
      "short/json/TTY 출력 4-branch dispatcher",
    ],
  },
  {
    version: "v0.4.0",
    title: "Phase 1 — UI 테스트 + Watch",
    status: "done",
    items: [
      "ink-testing-library — 36개 신규 UI 테스트",
      "StatusWatchView + status --watch",
      "71 tests, Match Rate 97%",
    ],
  },
  {
    version: "v0.5.0",
    title: "Phase 2 — Web Dashboard",
    status: "in_progress",
    items: [
      "packages/api — Hono API 서버",
      "packages/web — Next.js 14 대시보드",
      "Wiki CRUD, Agent 투명성, Token 관리",
    ],
  },
  {
    version: "v1.0.0",
    title: "Phase 2 — Agent Orchestration",
    status: "planned",
    items: [
      "병렬 에이전트 작업 조율",
      "충돌 해결 워크플로우",
      "PostgreSQL + Redis 도입",
    ],
  },
];

const MERMAID_CODE = `graph TB
  subgraph CLI["packages/cli"]
    init["foundry-x init"]
    status["foundry-x status"]
    sync["foundry-x sync"]
  end

  subgraph Core["packages/core"]
    analyze["analyze()"]
    verifyHarness["verifyHarness()"]
    computeHealth["computeHealth()"]
    checkFreshness["checkFreshness()"]
  end

  subgraph API["packages/api (Hono)"]
    profile["/api/profile"]
    integrity["/api/integrity"]
    health["/api/health"]
    wiki["/api/wiki"]
    agents["/api/agents"]
  end

  subgraph Web["packages/web (Next.js)"]
    dashboard["Dashboard"]
    wikiPage["Wiki"]
    archPage["Architecture"]
    agentsPage["Agents"]
  end

  subgraph Data["Layer 1: Data"]
    foundryDir[".foundry-x/*.json"]
    gitDocs["Git Documents (.md)"]
    specMd["SPEC.md"]
  end

  CLI --> Core
  API --> Core
  Web --> API
  Core --> Data`;

export function Component() {
  const [tab, setTab] = useState<Tab>("modules");
  const [profile, setProfile] = useState<RepoProfile | null>(null);
  const [reqs, setReqs] = useState<RequirementItem[] | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [reqsLoading, setReqsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [reqsError, setReqsError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<RepoProfile>("/profile")
      .then((data) => {
        setProfile(data);
        setProfileLoading(false);
      })
      .catch((err: Error) => {
        setProfileError(err.message);
        setProfileLoading(false);
      });

    fetchApi<RequirementItem[]>("/requirements")
      .then((data) => {
        setReqs(data);
        setReqsLoading(false);
      })
      .catch((err: Error) => {
        setReqsError(err.message);
        setReqsLoading(false);
      });
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "modules", label: "Module Map" },
    { key: "diagram", label: "Diagram" },
    { key: "roadmap", label: "Roadmap" },
    { key: "requirements", label: "Requirements" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Architecture</h1>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Module Map Tab */}
      {tab === "modules" && (
        <Card>
          <CardContent className="pt-6">
            {profileLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : profileError ? (
              <p className="text-sm text-destructive">{profileError}</p>
            ) : profile ? (
              <ModuleMap profile={profile} />
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Diagram Tab */}
      {tab === "diagram" && (
        <Card>
          <CardContent className="pt-6">
            <MermaidDiagram code={MERMAID_CODE} />
          </CardContent>
        </Card>
      )}

      {/* Roadmap Tab */}
      {tab === "roadmap" && (
        <div className="flex flex-col gap-3">
          {ROADMAP_MILESTONES.map((milestone) => (
            <Card key={milestone.version}>
              <CardContent className="pt-6">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="rounded border border-border bg-muted px-2.5 py-0.5 font-mono text-sm font-bold text-primary">
                    {milestone.version}
                  </span>
                  <span className="font-semibold">{milestone.title}</span>
                  <Badge
                    variant={statusVariant(milestone.status)}
                    className="ml-auto"
                  >
                    {statusLabel(milestone.status)}
                  </Badge>
                </div>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {milestone.items.map((item, i) => (
                    <li key={i} className="mb-1">
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Requirements Tab */}
      {tab === "requirements" && (
        <Card>
          <CardContent className="pt-6">
            {reqsLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : reqsError ? (
              <p className="text-sm text-destructive">{reqsError}</p>
            ) : reqs ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>REQ</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reqs.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-sm">
                        {req.id}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-primary">
                        {req.reqCode}
                      </TableCell>
                      <TableCell>{req.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {req.version}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(req.status)}>
                          {statusLabel(req.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}

            {reqs && reqs.length === 0 && (
              <p className="mt-5 text-center text-muted-foreground">
                No requirements found
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
