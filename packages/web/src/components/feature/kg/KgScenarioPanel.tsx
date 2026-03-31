import { useState, useEffect } from "react";
import { Flame, Cpu, AlertTriangle, Loader2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getScenarioPresets,
  simulateScenario,
  type ScenarioPreset,
  type ScenarioResult,
  type HotspotNode,
} from "@/lib/api-client";

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  petrochemical: { icon: <Flame className="h-4 w-4" />, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  semiconductor: { icon: <Cpu className="h-4 w-4" />, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  compound: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600", bg: "bg-red-50 border-red-200" },
};

const IMPACT_BADGE: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-green-100 text-green-700 border-green-200",
};

function ImpactBadge({ level }: { level: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${IMPACT_BADGE[level] ?? ""}`}>
      {level}
    </span>
  );
}

function AffectedNodeRow({ node }: { node: HotspotNode }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${node.isHotspot ? "border-red-300 bg-red-50/50" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{node.name}</span>
          {node.nameEn && <span className="text-xs text-muted-foreground">({node.nameEn})</span>}
          <Badge variant="outline" className="text-xs">{node.type}</Badge>
          <ImpactBadge level={node.impactLevel} />
          {node.isHotspot && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
              <Zap className="h-3 w-3" /> 핫스팟
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          {node.eventContributions.map((c) => (
            <span key={c.eventId} className="text-xs text-muted-foreground">
              {c.eventName}: <span className="font-mono">{c.score.toFixed(3)}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-mono font-semibold">{node.combinedScore.toFixed(3)}</div>
        <div className="text-xs text-muted-foreground">{node.eventCount}개 이벤트</div>
      </div>
    </div>
  );
}

export default function KgScenarioPanel() {
  const [presets, setPresets] = useState<ScenarioPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setPresetsLoading(true);
        const data = await getScenarioPresets();
        setPresets(data.presets);
      } catch {
        setPresets([]);
      } finally {
        setPresetsLoading(false);
      }
    }
    load();
  }, []);

  async function handlePresetClick(preset: ScenarioPreset) {
    setSelectedPresetId(preset.id);
    setSimulating(true);
    setResult(null);
    try {
      const res = await simulateScenario({ eventNodeIds: preset.eventNodeIds });
      setResult(res);
    } catch {
      setResult(null);
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Preset Cards */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">시나리오 프리셋</h3>
        {presetsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> 프리셋 로딩 중...
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {presets.map((preset) => {
              const config = CATEGORY_CONFIG[preset.category] ?? CATEGORY_CONFIG.compound;
              const isSelected = selectedPresetId === preset.id;
              return (
                <Button
                  key={preset.id}
                  variant="outline"
                  className={`h-auto flex-col items-start gap-2 p-4 text-left ${config.bg} ${isSelected ? "ring-2 ring-primary" : ""}`}
                  onClick={() => handlePresetClick(preset)}
                  disabled={simulating}
                >
                  <div className={`flex items-center gap-2 ${config.color}`}>
                    {config.icon}
                    <span className="font-semibold text-sm">{preset.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-normal">
                    {preset.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {preset.eventNodeIds.map((id) => (
                      <Badge key={id} variant="secondary" className="text-[10px]">{id}</Badge>
                    ))}
                  </div>
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Simulation loading */}
      {simulating && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> 시나리오 시뮬레이션 실행 중...
        </div>
      )}

      {/* Results */}
      {result && !simulating && (
        <div className="space-y-4">
          {/* Summary bar */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <div className="text-sm">
                <span className="text-muted-foreground">이벤트: </span>
                <span className="font-semibold">{result.events.map((e) => e.name).join(" + ")}</span>
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <Badge variant="outline">전체 {result.totalAffected}</Badge>
                <Badge className="bg-red-100 text-red-700 border border-red-200">핫스팟 {result.hotspotCount}</Badge>
                <span className="text-xs text-muted-foreground">
                  H:{result.byLevel.high} / M:{result.byLevel.medium} / L:{result.byLevel.low}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Hotspots section */}
          {result.hotspots.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-red-600">
                  <Zap className="h-4 w-4" /> 핫스팟 ({result.hotspotCount}개) — 복수 이벤트 교차 영향
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.hotspots.map((node) => (
                  <AffectedNodeRow key={node.id} node={node} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* All affected nodes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">전체 영향 노드 ({result.totalAffected}개)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[50vh] overflow-y-auto">
              {result.affectedNodes.map((node) => (
                <AffectedNodeRow key={node.id} node={node} />
              ))}
              {result.affectedNodes.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  영향받는 노드가 없어요
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!result && !simulating && (
        <div className="flex items-center justify-center rounded-lg border border-dashed py-16 text-sm text-muted-foreground">
          위 프리셋 중 하나를 선택하여 시나리오 시뮬레이션을 시작하세요
        </div>
      )}
    </div>
  );
}
