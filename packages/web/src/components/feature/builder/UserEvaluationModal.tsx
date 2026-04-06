// F391: 사용자 수동 평가 모달 (Sprint 178)

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface UserEvaluationModalProps {
  jobId: string;
  onSubmit: (data: {
    jobId: string;
    evaluatorRole: string;
    buildScore: number;
    uiScore: number;
    functionalScore: number;
    prdScore: number;
    codeScore: number;
    overallScore: number;
    comment?: string;
  }) => Promise<void>;
  onClose: () => void;
}

const ROLES = [
  { value: "bd_team", label: "BD팀" },
  { value: "customer", label: "고객" },
  { value: "executive", label: "경영진" },
];

const DIMENSIONS = [
  { key: "buildScore", label: "Build 품질", desc: "빌드 성공, 에러 없음" },
  { key: "uiScore", label: "UI 품질", desc: "디자인, 레이아웃, 반응형" },
  { key: "functionalScore", label: "기능 품질", desc: "인터랙션, 네비게이션" },
  { key: "prdScore", label: "PRD 반영도", desc: "요구사항 구현 충실도" },
  { key: "codeScore", label: "코드 품질", desc: "구조, 가독성, 모범사례" },
] as const;

type ScoreKey = (typeof DIMENSIONS)[number]["key"];

export default function UserEvaluationModal({
  jobId,
  onSubmit,
  onClose,
}: UserEvaluationModalProps) {
  const [role, setRole] = useState("bd_team");
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    buildScore: 3,
    uiScore: 3,
    functionalScore: 3,
    prdScore: 3,
    codeScore: 3,
  });
  const [overallScore, setOverallScore] = useState(3);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        jobId,
        evaluatorRole: role,
        ...scores,
        overallScore,
        comment: comment || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">프로토타입 수동 평가</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* 역할 선택 */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">평가자 역할</label>
          <div className="flex gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                className={`px-3 py-1 rounded text-xs border transition-colors ${
                  role === r.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted"
                }`}
                onClick={() => setRole(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5차원 점수 */}
        {DIMENSIONS.map((dim) => (
          <div key={dim.key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">{dim.label}</span>
              <span className="text-muted-foreground">{dim.desc}</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${
                    scores[dim.key] === v
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                  onClick={() => setScores((s) => ({ ...s, [dim.key]: v }))}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 전체 점수 */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium">전체 평가</span>
            <span className="text-muted-foreground">고객 데모 가능 수준?</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${
                  overallScore === v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted"
                }`}
                onClick={() => setOverallScore(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* 코멘트 */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">코멘트 (선택)</label>
          <textarea
            className="w-full border rounded p-2 text-sm min-h-[60px] bg-background"
            placeholder="개선 의견이나 느낀 점을 적어주세요..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* 제출 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "저장 중..." : "평가 제출"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
