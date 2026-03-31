"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Network, Database, Loader2, FlaskConical, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import KgNodeSearch from "@/components/feature/kg/KgNodeSearch";
import KgNodeDetail from "@/components/feature/kg/KgNodeDetail";
import KgPathResult from "@/components/feature/kg/KgPathResult";
import KgImpactResult from "@/components/feature/kg/KgImpactResult";
import KgScenarioPanel from "@/components/feature/kg/KgScenarioPanel";
import {
  getKgStats,
  seedKgData,
  getKgPaths,
  postKgImpact,
  type KgStats,
  type PathResult,
  type ImpactResult,
} from "@/lib/api-client";

type Panel = "none" | "impact" | "path";
type Tab = "explorer" | "scenario";

export function Component() {
  const [activeTab, setActiveTab] = useState<Tab>("explorer");
  const [stats, setStats] = useState<KgStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<Panel>("none");

  // Impact state
  const [impactResult, setImpactResult] = useState<ImpactResult | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  // Path state
  const [pathTargetId, setPathTargetId] = useState("");
  const [pathResults, setPathResults] = useState<PathResult[]>([]);
  const [pathLoading, setPathLoading] = useState(false);

  // Seed state
  const [seeding, setSeeding] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await getKgStats();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  async function handleSeed() {
    try {
      setSeeding(true);
      await seedKgData();
      await loadStats();
    } catch {
      /* ignore */
    } finally {
      setSeeding(false);
    }
  }

  async function handleImpact() {
    if (!selectedNodeId) return;
    try {
      setActivePanel("impact");
      setImpactLoading(true);
      const result = await postKgImpact({ sourceNodeId: selectedNodeId });
      setImpactResult(result);
    } catch {
      setImpactResult(null);
    } finally {
      setImpactLoading(false);
    }
  }

  function handlePathClick() {
    setActivePanel("path");
    setPathResults([]);
    setPathTargetId("");
  }

  async function handlePathSearch() {
    if (!selectedNodeId || !pathTargetId.trim()) return;
    try {
      setPathLoading(true);
      const data = await getKgPaths(selectedNodeId, pathTargetId.trim());
      setPathResults(data.paths);
    } catch {
      setPathResults([]);
    } finally {
      setPathLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/ax-bd"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Network className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Ontology 탐색기</h1>
          <p className="text-sm text-muted-foreground">
            GIVC Knowledge Graph 노드/관계 탐색 및 시나리오 시뮬레이션
          </p>
        </div>
      </div>

      {/* Stats + Seed */}
      <div className="flex flex-wrap items-center gap-4">
        {statsLoading ? (
          <span className="text-sm text-muted-foreground">통계 로딩 중...</span>
        ) : stats ? (
          <>
            <Badge variant="outline" className="text-sm">
              <Database className="mr-1.5 h-3.5 w-3.5" />
              노드 {stats.totalNodes}
            </Badge>
            <Badge variant="outline" className="text-sm">
              관계 {stats.totalEdges}
            </Badge>
            {Object.entries(stats.nodesByType).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type}: {count}
              </Badge>
            ))}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">
            통계를 불러올 수 없어요
          </span>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={handleSeed}
          disabled={seeding}
        >
          {seeding && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          시드 데이터 로드
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "explorer"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("explorer")}
        >
          <Search className="h-4 w-4" />
          노드 탐색기
        </button>
        <button
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "scenario"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("scenario")}
        >
          <FlaskConical className="h-4 w-4" />
          시나리오 시뮬레이션
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "explorer" && (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Left: Search */}
          <div>
            <KgNodeSearch onNodeSelect={setSelectedNodeId} />
          </div>

          {/* Right: Detail + Analysis */}
          <div className="space-y-4">
            {selectedNodeId ? (
              <>
                <KgNodeDetail
                  nodeId={selectedNodeId}
                  onImpactClick={handleImpact}
                  onPathClick={handlePathClick}
                />

                {/* Impact results */}
                {activePanel === "impact" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">영향 분석 결과</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <KgImpactResult
                        result={impactResult}
                        loading={impactLoading}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Path search */}
                {activePanel === "path" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">경로 탐색</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">도착 노드 ID</Label>
                          <Input
                            placeholder="목적지 노드 ID 입력..."
                            value={pathTargetId}
                            onChange={(e) => setPathTargetId(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={handlePathSearch}
                          disabled={pathLoading || !pathTargetId.trim()}
                        >
                          {pathLoading && (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          )}
                          탐색
                        </Button>
                      </div>
                      {pathResults.length > 0 && (
                        <KgPathResult paths={pathResults} />
                      )}
                      {!pathLoading && pathTargetId && pathResults.length === 0 && (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          탐색 버튼을 눌러 경로를 검색하세요
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-dashed py-20 text-sm text-muted-foreground">
                왼쪽에서 노드를 선택하세요
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "scenario" && (
        <KgScenarioPanel />
      )}
    </div>
  );
}
