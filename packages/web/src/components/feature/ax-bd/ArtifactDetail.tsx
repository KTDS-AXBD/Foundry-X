"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api-client";
import { Link } from "react-router-dom";

interface BdArtifact {
  id: string;
  orgId: string;
  bizItemId: string;
  skillId: string;
  stageId: string;
  version: number;
  inputText: string;
  outputText: string | null;
  model: string;
  tokensUsed: number;
  durationMs: number;
  status: string;
  createdBy: string;
  createdAt: string;
}

interface VersionItem {
  id: string;
  version: number;
  status: string;
  createdAt: string;
}

interface ArtifactDetailProps {
  artifactId: string;
}

export default function ArtifactDetail({ artifactId }: ArtifactDetailProps) {
  const [artifact, setArtifact] = useState<BdArtifact | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchApi<BdArtifact>(`/ax-bd/artifacts/${artifactId}`)
      .then((art) => {
        setArtifact(art);
        return fetchApi<{ versions: VersionItem[] }>(
          `/ax-bd/artifacts/${art.bizItemId}/${encodeURIComponent(art.skillId)}/versions`,
        );
      })
      .then((res) => setVersions(res.versions))
      .catch(() => setArtifact(null))
      .finally(() => setLoading(false));
  }, [artifactId]);

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">로딩 중...</div>;
  }

  if (!artifact) {
    return <div className="py-8 text-center text-sm text-red-500">산출물을 찾을 수 없어요.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{artifact.skillId}</h2>
          <Badge variant="outline" className="font-mono">v{artifact.version}</Badge>
          <Badge variant={artifact.status === "completed" ? "default" : "destructive"}>
            {artifact.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          단계 {artifact.stageId} · {artifact.model} ·{" "}
          {artifact.tokensUsed.toLocaleString()} 토큰 ·{" "}
          {(artifact.durationMs / 1000).toFixed(1)}초
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(artifact.createdAt).toLocaleString("ko-KR")}
        </p>
      </div>

      {/* Input */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">입력</h3>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
          {artifact.inputText}
        </div>
      </div>

      {/* Output */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">산출물</h3>
        <div className="prose prose-sm max-w-none rounded-lg border p-4 dark:prose-invert">
          {artifact.outputText ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {artifact.outputText}
            </ReactMarkdown>
          ) : (
            <span className="text-muted-foreground">(결과 없음)</span>
          )}
        </div>
      </div>

      {/* Version History */}
      {versions.length > 1 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">버전 히스토리</h3>
          <div className="space-y-1">
            {versions.map((v) => (
              <Link
                key={v.id}
                to={`/ax-bd/artifacts/${v.id}`}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors hover:bg-muted/30 ${v.id === artifactId ? "border-primary bg-primary/5" : ""}`}
              >
                <Badge variant="outline" className="font-mono text-[10px]">
                  v{v.version}
                </Badge>
                <Badge variant={v.status === "completed" ? "default" : "destructive"} className="text-[10px]">
                  {v.status}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(v.createdAt).toLocaleString("ko-KR")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link to="/ax-bd/artifacts">
        <Button variant="outline" size="sm">목록으로</Button>
      </Link>
    </div>
  );
}
