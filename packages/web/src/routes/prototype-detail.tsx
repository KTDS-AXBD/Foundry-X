// F356: Prototype 상세 페이지 (Sprint 160)
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchPrototypeJob,
  fetchOgdSummary,
  fetchPrototypeFeedback,
  submitPrototypeFeedback,
  submitUserEvaluation,
  fetchUserEvaluations,
  type PrototypeJobDetail,
  type OgdSummaryResponse,
  type FeedbackItem,
  type UserEvaluationItem,
} from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BuildLogViewer from "@/components/feature/BuildLogViewer";
import FeedbackForm from "@/components/feature/FeedbackForm";
import UserEvaluationModal from "@/components/feature/builder/UserEvaluationModal";
import QualityScoreChart from "@/components/feature/QualityScoreChart";

function formatDate(ts: number | null): string {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  queued: "대기중",
  building: "빌드중",
  deploying: "배포중",
  live: "라이브",
  failed: "실패",
  deploy_failed: "배포 실패",
  dead_letter: "폐기",
  feedback_pending: "피드백 대기",
};

export function Component() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<PrototypeJobDetail | null>(null);
  const [ogdSummary, setOgdSummary] = useState<OgdSummaryResponse | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [evaluations, setEvaluations] = useState<UserEvaluationItem[]>([]);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [jobData, ogd, fb, evals] = await Promise.all([
        fetchPrototypeJob(id),
        fetchOgdSummary(id).catch(() => null),
        fetchPrototypeFeedback(id).catch(() => ({ items: [] })),
        fetchUserEvaluations(id).catch(() => ({ items: [] })),
      ]);
      setJob(jobData);
      setOgdSummary(ogd?.summary ?? null);
      setFeedbacks(fb.items);
      setEvaluations(evals.items);
    } catch {
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFeedback = async (data: { category: string; content: string }) => {
    if (!id) return;
    await submitPrototypeFeedback(id, data);
    await load();
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">로딩 중...</div>;
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Job을 찾을 수 없어요.</div>
        <Button size="sm" variant="outline" onClick={() => navigate("/prototype-dashboard")}>
          목록으로
        </Button>
      </div>
    );
  }

  const canFeedback = job.status === "live" || job.status === "feedback_pending";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={() => navigate("/prototype-dashboard")}>
          ← 목록
        </Button>
        <h1 className="text-xl font-bold font-display flex-1 truncate">
          {job.prdTitle}
        </h1>
        <Badge variant={job.status === "live" ? "default" : "outline"}>
          {STATUS_LABEL[job.status] ?? job.status}
        </Badge>
        <Button size="sm" variant="outline" onClick={() => setShowEvalModal(true)}>
          수동 평가
        </Button>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">비용</div>
          <div className="font-bold">${job.costUsd.toFixed(4)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">모델</div>
          <div className="font-bold">{job.modelUsed || "-"}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">생성일</div>
          <div className="font-bold text-sm">{formatDate(job.createdAt)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">품질 스코어</div>
          <div
            className={`font-bold ${
              job.qualityScore !== null && job.qualityScore >= 0.85
                ? "text-green-600"
                : "text-amber-600"
            }`}
          >
            {job.qualityScore !== null ? `${(job.qualityScore * 100).toFixed(0)}%` : "-"}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">프리뷰</TabsTrigger>
          <TabsTrigger value="buildlog">빌드로그</TabsTrigger>
          <TabsTrigger value="ogd">O-G-D</TabsTrigger>
          <TabsTrigger value="feedback">
            피드백 ({feedbacks.length})
          </TabsTrigger>
          <TabsTrigger value="evaluations">
            수동 평가 ({evaluations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          {job.pagesUrl ? (
            <div className="border rounded overflow-hidden" style={{ height: 600 }}>
              <iframe
                src={job.pagesUrl}
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin"
                title="Prototype Preview"
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic p-8 text-center border rounded">
              프리뷰 URL이 아직 없어요. 빌드가 완료되면 표시돼요.
            </div>
          )}
        </TabsContent>

        <TabsContent value="buildlog" className="mt-4">
          <BuildLogViewer log={job.buildLog} />
          {job.errorMessage && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              <strong>Error:</strong> {job.errorMessage}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ogd" className="mt-4">
          {ogdSummary ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span>
                  총 {ogdSummary.totalRounds}라운드
                </span>
                <span>
                  Best: R{ogdSummary.bestRound} ({(ogdSummary.bestScore * 100).toFixed(0)}%)
                </span>
                <Badge variant={ogdSummary.passed ? "default" : "destructive"}>
                  {ogdSummary.passed ? "PASS" : "FAIL"}
                </Badge>
                <span className="text-muted-foreground">
                  비용 ${ogdSummary.totalCostUsd.toFixed(4)}
                </span>
              </div>
              <QualityScoreChart rounds={ogdSummary.rounds} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">
              O-G-D 평가 데이터가 없어요.
            </div>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="mt-4 space-y-4">
          {canFeedback && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-2">피드백 작성</h3>
              <FeedbackForm onSubmit={handleFeedback} />
            </Card>
          )}

          {feedbacks.length > 0 ? (
            <div className="space-y-2">
              {feedbacks.map((fb) => (
                <Card key={fb.id} className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {fb.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(fb.createdAt)}
                    </span>
                    <Badge
                      variant={
                        fb.status === "applied"
                          ? "default"
                          : fb.status === "dismissed"
                            ? "destructive"
                            : "outline"
                      }
                      className="text-xs ml-auto"
                    >
                      {fb.status}
                    </Badge>
                  </div>
                  <p className="text-sm">{fb.content}</p>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">
              아직 피드백이 없어요.
            </div>
          )}
        </TabsContent>

        <TabsContent value="evaluations" className="mt-4 space-y-3">
          {evaluations.length > 0 ? (
            evaluations.map((ev) => (
              <Card key={ev.id} className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">{ev.evaluatorRole}</Badge>
                  <span className="text-xs text-muted-foreground">{ev.createdAt}</span>
                  <span className="text-xs font-medium ml-auto">전체: {ev.overallScore}/5</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div>Build: {ev.buildScore}</div>
                  <div>UI: {ev.uiScore}</div>
                  <div>기능: {ev.functionalScore}</div>
                  <div>PRD: {ev.prdScore}</div>
                  <div>코드: {ev.codeScore}</div>
                </div>
                {ev.comment && (
                  <p className="text-sm text-muted-foreground mt-2">{ev.comment}</p>
                )}
              </Card>
            ))
          ) : (
            <div className="text-sm text-muted-foreground italic">
              아직 수동 평가가 없어요. 상단의 &quot;수동 평가&quot; 버튼으로 등록하세요.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* User Evaluation Modal */}
      {showEvalModal && id && (
        <UserEvaluationModal
          jobId={id}
          onSubmit={async (data) => {
            await submitUserEvaluation(data);
            await load();
          }}
          onClose={() => setShowEvalModal(false)}
        />
      )}
    </div>
  );
}
