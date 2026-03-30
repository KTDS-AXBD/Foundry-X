"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Presentation } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const VERSIONS = [
  { value: "v0.9", label: "v0.9 — 고객 선제안 (최신)", date: "2026-03-30", file: "/givc/pitch-v0.9.html" },
  { value: "v0.2", label: "v0.2 — 내부 검토", date: "2026-03-30", file: "/givc/pitch-v0.2.html" },
  { value: "v0.1", label: "v0.1 — 초안", date: "2026-03-27", file: "/givc/pitch-v0.1.html" },
];

export function Component() {
  const [version, setVersion] = useState("v0.9");
  const current = VERSIONS.find((v) => v.value === version) ?? VERSIONS[0];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Header */}
      <div className="shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            to="/offering-packs"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <Presentation className="size-5 text-primary" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold truncate">
                GIVC Ontology 기반 산업 공급망 인과 예측 엔진
              </h1>
              <Badge variant="outline">피치덱</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              한국기계산업진흥회 chatGIVC 고도화 제안 — koami_pitch {current.value}
            </p>
          </div>
          <select
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-muted transition-colors"
          >
            {VERSIONS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
          <a
            href={current.file}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <ExternalLink className="size-3.5" />
            새 탭에서 열기
          </a>
        </div>
      </div>

      {/* Pitch Deck Embed */}
      <div className="flex-1 min-h-0">
        <iframe
          src={current.file}
          title={`GIVC 피치덱 ${current.value}`}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
