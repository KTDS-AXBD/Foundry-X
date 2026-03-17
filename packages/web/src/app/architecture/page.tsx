"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/api-client";
import type { RepoProfile, RequirementItem } from "@foundry-x/shared";
import ModuleMap from "../../components/feature/ModuleMap";
import MermaidDiagram from "../../components/feature/MermaidDiagram";

const colors = {
  bg: "#0a0a0a",
  text: "#ededed",
  card: "#1a1a1a",
  border: "#333",
  accent: "#3b82f6",
  muted: "#888",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

type Tab = "modules" | "diagram" | "roadmap" | "requirements";

const statusColor = (status: string) => {
  if (status === "done") return colors.green;
  if (status === "in_progress") return colors.yellow;
  return colors.muted;
};

const statusLabel = (status: string) => {
  if (status === "done") return "Done";
  if (status === "in_progress") return "In Progress";
  return "Planned";
};

// ─── Roadmap mock data (SPEC.md §3 마일스톤) ───
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

// ─── Mermaid diagram mock (from ARCHITECTURE.md) ───
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

export default function ArchitecturePage() {
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

  const tabButton = (t: Tab, label: string): React.CSSProperties => ({
    padding: "8px 20px",
    background: tab === t ? colors.accent : "transparent",
    color: tab === t ? "#fff" : colors.muted,
    border: `1px solid ${tab === t ? colors.accent : colors.border}`,
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  });

  const cardWrap: React.CSSProperties = {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: 24,
  };

  return (
    <div style={{ color: colors.text }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        Architecture
      </h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button style={tabButton("modules", "Module Map")} onClick={() => setTab("modules")}>
          Module Map
        </button>
        <button style={tabButton("diagram", "Diagram")} onClick={() => setTab("diagram")}>
          Diagram
        </button>
        <button style={tabButton("roadmap", "Roadmap")} onClick={() => setTab("roadmap")}>
          Roadmap
        </button>
        <button style={tabButton("requirements", "Requirements")} onClick={() => setTab("requirements")}>
          Requirements
        </button>
      </div>

      {/* Module Map Tab */}
      {tab === "modules" && (
        <div style={cardWrap}>
          {profileLoading ? (
            <p style={{ color: colors.muted }}>Loading...</p>
          ) : profileError ? (
            <p style={{ color: colors.red, fontSize: 13 }}>{profileError}</p>
          ) : profile ? (
            <ModuleMap profile={profile} />
          ) : null}
        </div>
      )}

      {/* Diagram Tab */}
      {tab === "diagram" && (
        <div style={cardWrap}>
          <MermaidDiagram code={MERMAID_CODE} />
        </div>
      )}

      {/* Roadmap Tab */}
      {tab === "roadmap" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ROADMAP_MILESTONES.map((milestone) => (
            <div key={milestone.version} style={cardWrap}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    color: colors.accent,
                    background: colors.bg,
                    padding: "2px 10px",
                    borderRadius: 4,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {milestone.version}
                </span>
                <span style={{ fontWeight: 600, fontSize: 15 }}>
                  {milestone.title}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#fff",
                    background: statusColor(milestone.status),
                    padding: "2px 10px",
                    borderRadius: 12,
                  }}
                >
                  {statusLabel(milestone.status)}
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: colors.muted }}>
                {milestone.items.map((item, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Requirements Tab */}
      {tab === "requirements" && (
        <div style={cardWrap}>
          {reqsLoading ? (
            <p style={{ color: colors.muted }}>Loading...</p>
          ) : reqsError ? (
            <p style={{ color: colors.red, fontSize: 13 }}>{reqsError}</p>
          ) : reqs ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: `2px solid ${colors.border}`,
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "8px 12px", color: colors.muted }}>
                    ID
                  </th>
                  <th style={{ padding: "8px 12px", color: colors.muted }}>
                    REQ
                  </th>
                  <th style={{ padding: "8px 12px", color: colors.muted }}>
                    Title
                  </th>
                  <th style={{ padding: "8px 12px", color: colors.muted }}>
                    Version
                  </th>
                  <th style={{ padding: "8px 12px", color: colors.muted }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {reqs.map((req) => (
                  <tr
                    key={req.id}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 12px",
                        fontFamily: "monospace",
                        fontSize: 13,
                      }}
                    >
                      {req.id}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontFamily: "monospace",
                        fontSize: 13,
                        color: colors.accent,
                      }}
                    >
                      {req.reqCode}
                    </td>
                    <td style={{ padding: "8px 12px" }}>{req.title}</td>
                    <td
                      style={{
                        padding: "8px 12px",
                        fontSize: 13,
                        color: colors.muted,
                      }}
                    >
                      {req.version}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#fff",
                          background: statusColor(req.status),
                        }}
                      >
                        {statusLabel(req.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {reqs && reqs.length === 0 && (
            <p style={{ color: colors.muted, textAlign: "center", marginTop: 20 }}>
              No requirements found
            </p>
          )}
        </div>
      )}
    </div>
  );
}
