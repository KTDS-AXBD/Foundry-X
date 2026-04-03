"use client";

/**
 * Sprint 117: F296 — 통합 평가 결과서 페이지
 * biz-item별 발굴 스킬 결과를 종합한 평가 결과서 목록 + 생성 + 상세 뷰
 */
import { useState, useEffect, useCallback } from "react";
import { fetchApi, postApi } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

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

export function Component() {
  const [reports, setReports] = useState<EvalReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [bizItemId, setBizItemId] = useState("");
  const [selected, setSelected] = useState<EvalReport | null>(null);

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

  async function handleGenerate() {
    if (!bizItemId.trim()) return;
    try {
      setGenerating(true);
      setError(null);
      await postApi("/ax-bd/evaluation-reports/generate", {
        bizItemId: bizItemId.trim(),
      });
      setBizItemId("");
      await loadReports();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  if (selected) {
    return (
      <div className="p-6 space-y-6">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; 목록으로
        </button>
        <h1 className="text-2xl font-bold">{selected.title}</h1>
        <div className="flex items-center gap-2">
          <Badge className={LIGHT_COLORS[selected.trafficLight]}>
            {selected.trafficLight.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {new Date(selected.createdAt).toLocaleString()}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(selected.skillScores).map(([skillId, s]) => (
            <div
              key={skillId}
              className="border rounded-lg p-4 space-y-2"
            >
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
              <p className="text-sm text-muted-foreground line-clamp-3">
                {s.summary}
              </p>
            </div>
          ))}
        </div>

        {selected.recommendation && (
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">추천사항</h3>
            <p>{selected.recommendation}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">평가 결과서</h1>
          <p className="text-muted-foreground">
            발굴 스킬 결과를 종합한 통합 평가 결과서 ({total}건)
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Biz Item ID"
          value={bizItemId}
          onChange={(e) => setBizItemId(e.target.value)}
          className="border rounded px-3 py-2 text-sm flex-1 max-w-xs"
        />
        <button
          onClick={handleGenerate}
          disabled={generating || !bizItemId.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? "생성 중..." : "결과서 생성"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded">{error}</div>
      )}

      {loading ? (
        <div className="text-muted-foreground">로딩 중...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          생성된 결과서가 없어요. Biz Item ID를 입력하고 결과서를 생성해 보세요.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">제목</th>
                <th className="text-left p-3">Biz Item</th>
                <th className="text-center p-3">신호등</th>
                <th className="text-center p-3">스킬 수</th>
                <th className="text-left p-3">생성일</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr
                  key={r.id}
                  className="border-t hover:bg-muted/30 cursor-pointer"
                  onClick={() => setSelected(r)}
                >
                  <td className="p-3 font-medium">{r.title}</td>
                  <td className="p-3 text-muted-foreground">{r.bizItemId}</td>
                  <td className="p-3 text-center">
                    <Badge className={LIGHT_COLORS[r.trafficLight]}>
                      {r.trafficLight}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    {Object.keys(r.skillScores).length}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
