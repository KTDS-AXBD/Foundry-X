"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ProcessFlowV82 from "@/components/feature/ProcessFlowV82";
import TypeRoutingMatrix from "@/components/feature/TypeRoutingMatrix";
import WizardStepper from "./WizardStepper";
import WizardStepDetail from "./WizardStepDetail";
import {
  fetchApi,
  getDiscoveryProgress,
  updateDiscoveryStage,
  type BizItemSummary,
  type TrafficLightResponse,
  type StageProgress,
} from "@/lib/api-client";

const TYPE_COLORS: Record<string, string> = {
  I: "bg-blue-100 text-blue-700 border-blue-200",
  M: "bg-emerald-100 text-emerald-700 border-emerald-200",
  P: "bg-amber-100 text-amber-700 border-amber-200",
  T: "bg-purple-100 text-purple-700 border-purple-200",
  S: "bg-rose-100 text-rose-700 border-rose-200",
};

const SIGNAL_DOTS: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
};

interface ItemWithSignal extends BizItemSummary {
  signal?: TrafficLightResponse;
}

export default function DiscoveryWizard() {
  const [items, setItems] = useState<ItemWithSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [stages, setStages] = useState<StageProgress[]>([]);
  const [activeStage, setActiveStage] = useState("2-0");
  const [showOverview, setShowOverview] = useState(false);

  // Load biz-items
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi<{ items: BizItemSummary[] }>("/biz-items");
        const withSignal = await Promise.all(
          (data.items ?? []).map(async (item) => {
            try {
              const signal = await fetchApi<TrafficLightResponse>(
                `/ax-bd/viability/traffic-light/${item.id}`,
              );
              return { ...item, signal };
            } catch {
              return item;
            }
          }),
        );
        setItems(withSignal);
        // Auto-select first item if any
        if (withSignal.length > 0 && !selectedItemId) {
          setSelectedItemId(withSignal[0]!.id);
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load discovery progress when item selected
  useEffect(() => {
    if (!selectedItemId) {
      setStages([]);
      return;
    }
    async function loadProgress() {
      try {
        const progress = await getDiscoveryProgress(selectedItemId!);
        setStages(progress.stages);
        if (progress.currentStage) {
          setActiveStage(progress.currentStage);
        }
      } catch {
        setStages([]);
      }
    }
    loadProgress();
  }, [selectedItemId]);

  const selectedItem = items.find((i) => i.id === selectedItemId);
  const activeStageData = stages.find((s) => s.stage === activeStage);

  async function handleStatusChange(stage: string, newStatus: string) {
    if (!selectedItemId) return;
    try {
      await updateDiscoveryStage(selectedItemId, stage, newStatus);
      // Reload progress
      const progress = await getDiscoveryProgress(selectedItemId);
      setStages(progress.stages);
    } catch {
      // fail silently
    }
  }

  return (
    <div className="space-y-6" data-tour="discovery-wizard">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Discovery 프로세스 v8.2</h1>
        <p className="text-sm text-muted-foreground">
          AX BD 2단계 발굴 — 사업 아이템별 단계 진행 위저드
        </p>
      </div>

      {/* Process Overview (Collapsible) */}
      <div className="rounded-xl border bg-card">
        <button
          onClick={() => setShowOverview(!showOverview)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="text-sm font-bold">전체 프로세스 흐름 / 유형 매트릭스</span>
          {showOverview ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {showOverview && (
          <div className="space-y-4 border-t px-5 pb-5 pt-4">
            <ProcessFlowV82 />
            <TypeRoutingMatrix selectedType={selectedItem?.discoveryType as "I" | "M" | "P" | "T" | "S" | undefined} />
          </div>
        )}
      </div>

      {/* Item Selector */}
      <div className="rounded-xl border bg-card p-4" data-tour="discovery-item-select">
        <label className="mb-2 block text-sm font-bold">사업 아이템 선택</label>
        {loading ? (
          <div className="text-sm text-muted-foreground">로딩 중...</div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            등록된 사업 아이템이 없어요. 먼저 아이템을 등록하세요.
          </div>
        ) : (
          <select
            value={selectedItemId ?? ""}
            onChange={(e) => setSelectedItemId(e.target.value || null)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">아이템을 선택하세요</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
                {item.discoveryType ? ` [Type ${item.discoveryType}]` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Wizard Content — only when item selected */}
      {selectedItemId && stages.length > 0 && (
        <>
          {/* Stepper */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold">단계 진행</span>
              <span className="text-xs text-muted-foreground">
                {stages.filter((s) => s.status === "completed").length} / {stages.length} 완료
              </span>
            </div>
            <WizardStepper
              stages={stages}
              activeStage={activeStage}
              onStageClick={setActiveStage}
              discoveryType={selectedItem?.discoveryType}
            />
          </div>

          {/* Step Detail */}
          {activeStageData && (
            <WizardStepDetail
              stage={activeStage}
              status={activeStageData.status}
              discoveryType={selectedItem?.discoveryType ?? undefined}
              bizItemId={selectedItemId}
              onStatusChange={handleStatusChange}
            />
          )}
        </>
      )}

      {/* Items List */}
      <div data-tour="discovery-items-list">
        <h2 className="mb-3 text-base font-bold">사업 아이템 현황</h2>
        {!loading && items.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            등록된 사업 아이템이 없어요.
          </div>
        )}
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/ax-bd/discovery/${item.id}`}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50",
                item.id === selectedItemId && "ring-2 ring-blue-300",
              )}
            >
              <div
                className={cn(
                  "h-3 w-3 shrink-0 rounded-full",
                  item.signal ? SIGNAL_DOTS[item.signal.overallSignal] : "bg-slate-300",
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.title}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                )}
              </div>
              {item.discoveryType && (
                <Badge className={cn("shrink-0 text-[10px]", TYPE_COLORS[item.discoveryType])}>
                  Type {item.discoveryType}
                </Badge>
              )}
              {item.signal && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.signal.summary.go + item.signal.summary.pivot + item.signal.summary.drop}/7
                </span>
              )}
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
