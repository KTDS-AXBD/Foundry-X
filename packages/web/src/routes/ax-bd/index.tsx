"use client";

import { VersionBadge } from "@/components/feature/VersionBadge";
import { Link } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";

export function Component() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold font-display">사업기획서</h1>
        <VersionBadge artifactType="business-plan" />
      </div>
      <p className="text-muted-foreground">
        사업 아이디어를 구조화된 기획서로 정리해요
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/ax-bd/ideas"
          className="group flex items-center gap-4 rounded-lg border p-5 hover:border-primary/40 hover:bg-muted/50 transition-colors"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">아이디어 목록</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              등록된 사업 아이디어를 확인하고 관리해요
            </p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </Link>
      </div>
    </div>
  );
}
