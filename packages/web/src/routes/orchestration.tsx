// ─── F337: Orchestration Dashboard — 3탭 (Kanban + Loop + Telemetry) (Sprint 152) ───
"use client";

import { useState } from "react";
import { TaskKanbanBoard } from "@/components/feature/TaskKanbanBoard";
import { LoopHistoryView } from "@/components/feature/LoopHistoryView";
import { TelemetryDashboard } from "@/components/feature/TelemetryDashboard";

type OrcTab = "tasks" | "loop-history" | "telemetry";

const TABS: { key: OrcTab; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "loop-history", label: "Loop History" },
  { key: "telemetry", label: "Telemetry" },
];

export function Component() {
  const [activeTab, setActiveTab] = useState<OrcTab>("tasks");

  return (
    <div style={{ padding: "24px 32px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
        Orchestration Dashboard
      </h1>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
        에이전트 태스크 상태, 피드백 루프 이력, 텔레메트리를 모니터링해요
      </p>

      {/* Tab Navigation */}
      <div style={{
        display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb", marginBottom: 20,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? "#4f46e5" : "#6b7280",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #4f46e5" : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "tasks" && <TaskKanbanBoard />}
      {activeTab === "loop-history" && <LoopHistoryView />}
      {activeTab === "telemetry" && <TelemetryDashboard />}
    </div>
  );
}
