"use client";

/**
 * Sprint 242: F493 — 발굴 평가결과서 v2
 * 9탭 리치 리포트 전면 개편 (in-place 재작성, F296 레거시 폴백 유지)
 */
import { useState, useEffect, useCallback } from "react";
import { fetchApi, postApi, getBizItems, type BizItemSummary } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { DiscoveryReportV2View } from "@/components/feature/discovery/report-v2/DiscoveryReportV2View";

// v2 리치 리포트 fixture를 가진 bizItemId (서버 FIXTURE_MAP과 동기화)
const V2_FIXTURE_IDS = new Set(["bi-koami-001", "bi-xr-studio-001", "bi-iris-001"]);

interface SkillScore {
  score: number;
  label: string;
  summary: string;
}

interface EvalReport {
  id: string;
  bizItemId: string;
  title: string;
  summary: string | null;
  skillScores: Record<string, SkillScore>;
  reportData: unknown | null;
  trafficLight: "green" | "yellow" | "red";
  trafficLightHistory: Array<{ date: string; value: string }>;
  recommendation: string | null;
  createdAt: string;
}

const LIGHT_COLORS = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
} as const;

// ── 레거시 v1 상세 뷰 (reportData === null 폴백) ──────────────────────────────

function LegacyReportDetail({ report }: { report: EvalReport }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge className={LIGHT_COLORS[report.trafficLight]}>
          {report.trafficLight.toUpperCase()}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {new Date(report.createdAt).toLocaleString()}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(report.skillScores).map(([skillId, s]) => (
          <div key={skillId} className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">{s.label}</span>
              <span className="text-lg font-bold">{s.score}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${Math.min(s.score, 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">{s.summary}</p>
          </div>
        ))}
      </div>

      {report.recommendation && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">추천사항</h3>
          <p className="text-sm">{report.recommendation}</p>
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function Component() {
  const [reports, setReports] = useState<EvalReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EvalReport | null>(null);

  // 결과서 생성 UI 상태
  const [bizItems, setBizItems] = useState<BizItemSummary[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedBizItemId, setPickedBizItemId] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi<{ items: EvalReport[]; total: number }>(
        "/ax-bd/evaluation-reports",
      );
      setReports(data.items);
      setTotal(data.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function openPicker() {
    setError(null);
    setPickerOpen(true);
    if (bizItems.length === 0) {
      try {
        const data = await getBizItems();
        setBizItems(data.items);
        if (!pickedBizItemId && data.items.length > 0) {
          // v2 fixture 있는 아이템을 우선 기본 선택
          const v2First = data.items.find((it) => V2_FIXTURE_IDS.has(it.id));
          setPickedBizItemId(v2First?.id ?? data.items[0].id);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }

  async function handleGenerate() {
    if (!pickedBizItemId) return;
    try {
      setGenerating(true);
      setError(null);
      const report = await postApi<EvalReport>("/ax-bd/evaluation-reports/generate", {
        bizItemId: pickedBizItemId,
      });
      setPickerOpen(false);
      await loadReports();
      // 방금 생성한 리포트를 바로 상세 뷰로 열어주기
      setSelected(report);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  // 상세 뷰
  if (selected) {
    return (
      <div className="p-6 space-y-5">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; 목록으로
        </button>
        <h1 className="text-xl font-bold">{selected.title}</h1>

        {selected.reportData ? (
          // v2 리치 리포트
          <DiscoveryReportV2View data={selected.reportData as Parameters<typeof DiscoveryReportV2View>[0]["data"]} />
        ) : (
          // v1 레거시 폴백
          <LegacyReportDetail report={selected} />
        )}
      </div>
    );
  }

  // 목록 뷰
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">발굴 평가결과서</h1>
          <p className="text-sm text-muted-foreground">
            AI 사업개발 9단계 발굴 리치 리포트 ({total}건)
          </p>
        </div>
        <button
          onClick={openPicker}
          className="bg-[var(--discovery-mint)] text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          + 결과서 생성
        </button>
      </div>

      {/* 결과서 생성 picker 모달 */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => !generating && setPickerOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border bg-card shadow-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-semibold text-foreground">결과서 생성</h2>
              <p className="text-xs text-muted-foreground mt-1">
                9단계 발굴 분석 결과를 기반으로 통합 평가결과서를 생성해요.
              </p>
            </div>

            {bizItems.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                발굴 아이템을 불러오는 중...
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80">
                    발굴 아이템 선택
                  </label>
                  <select
                    value={pickedBizItemId}
                    onChange={(e) => setPickedBizItemId(e.target.value)}
                    disabled={generating}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--discovery-mint)]"
                  >
                    {bizItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.title} {V2_FIXTURE_IDS.has(it.id) ? " — v2 샘플" : ""}
                      </option>
                    ))}
                  </select>
                  {pickedBizItemId && V2_FIXTURE_IDS.has(pickedBizItemId) ? (
                    <p className="text-[11px] text-[var(--discovery-mint)]">
                      ✓ 9탭 리치 리포트 샘플이 제공돼요
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      샘플 데이터가 없는 아이템은 기본 결과서(v1)로 생성돼요
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    disabled={generating}
                    className="px-3 py-1.5 rounded text-sm text-foreground/80 hover:bg-muted disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!pickedBizItemId || generating}
                    className="bg-[var(--discovery-mint)] text-white px-4 py-1.5 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {generating ? "생성 중..." : "생성하기"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted-foreground">생성된 결과서가 없어요.</p>
          <p className="text-sm text-muted-foreground">
            "결과서 생성 (fixture)" 버튼을 눌러 3개 아이템 리포트를 생성하세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="text-left border rounded-lg p-4 space-y-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold leading-snug line-clamp-2">{r.title}</h3>
                <Badge className={`flex-shrink-0 ${LIGHT_COLORS[r.trafficLight]}`}>
                  {r.trafficLight.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {r.summary ?? r.bizItemId}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {r.reportData ? (
                    <span className="text-[var(--discovery-mint)]">✓ v2 리치 리포트</span>
                  ) : (
                    "v1 기본 결과서"
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
