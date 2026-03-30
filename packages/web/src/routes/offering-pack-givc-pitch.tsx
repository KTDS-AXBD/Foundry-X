"use client";

import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Presentation } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Component() {
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
              한국기계산업진흥회 chatGIVC 고도화 제안 — koami_pitch v0.2
            </p>
          </div>
          <a
            href="/givc/pitch.html"
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
          src="/givc/pitch.html"
          title="GIVC 피치덱"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
