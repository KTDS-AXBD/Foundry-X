/**
 * F382: Offering → Prototype 연동 패널 (Sprint 173)
 *
 * Offering 상세 페이지에서 프로토타입 생성/목록 관리를 제공한다.
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchApi, postApi } from "@/lib/api-client";

interface PrototypeItem {
  id: string;
  bizItemId: string;
  version: number;
  format: string;
  content: string;
  templateUsed: string;
  modelUsed: string | null;
  tokensUsed: number;
  generatedAt: string;
}

interface PrototypeListResponse {
  items: PrototypeItem[];
  total: number;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface OfferingPrototypePanelProps {
  offeringId: string;
}

export function OfferingPrototypePanel({ offeringId }: OfferingPrototypePanelProps) {
  const [prototypes, setPrototypes] = useState<PrototypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrototypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<PrototypeListResponse>(
        `/offerings/${offeringId}/prototypes`,
      );
      setPrototypes(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로토타입 목록을 불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }, [offeringId]);

  useEffect(() => {
    loadPrototypes();
  }, [loadPrototypes]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await postApi<PrototypeItem>(`/offerings/${offeringId}/prototype`);
      await loadPrototypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로토타입 생성에 실패했어요");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">프로토타입</h3>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          size="sm"
        >
          {generating ? "생성 중..." : "프로토타입 생성"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {loading && prototypes.length === 0 && (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      )}

      {!loading && prototypes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          아직 생성된 프로토타입이 없어요. 위 버튼을 눌러 생성해 보세요.
        </p>
      )}

      <div className="space-y-3">
        {prototypes.map((proto) => (
          <Card key={proto.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">v{proto.version}</Badge>
                <span className="text-sm font-medium">
                  {proto.templateUsed} 템플릿
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(proto.generatedAt)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span>형식: {proto.format.toUpperCase()}</span>
                {proto.tokensUsed > 0 && <span>토큰: {proto.tokensUsed}</span>}
              </div>
              <Link
                to={`/prototype/${proto.id}`}
                className="text-blue-600 hover:underline"
              >
                상세 보기 →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
