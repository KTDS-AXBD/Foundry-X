"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Version {
  id: string;
  label: string;
  createdAt: string;
  isCurrent: boolean;
}

interface VersionBadgeProps {
  artifactType: "business-plan" | "offering" | "prd" | "prototype";
  artifactId?: string;
  versions?: Version[];
  onVersionChange?: (versionId: string) => void;
  onNewVersion?: () => void;
}

export function VersionBadge({
  versions,
  onVersionChange,
  onNewVersion,
}: VersionBadgeProps) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // API 미연동: 기본 v1 (초안) 표시
  if (!versions || versions.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        v1 (초안)
      </span>
    );
  }

  const current = versions.find((v) => v.isCurrent) ?? versions[0];

  const handleNewVersion = () => {
    if (onNewVersion) {
      onNewVersion();
    } else {
      setToastMsg("버전 관리 API가 아직 연동되지 않았어요");
      setTimeout(() => setToastMsg(null), 2500);
    }
  };

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium hover:bg-muted transition-colors focus:outline-none">
          {current.label}
          <ChevronDown className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
          {versions.map((v) => (
            <DropdownMenuItem
              key={v.id}
              onClick={() => onVersionChange?.(v.id)}
              className="flex items-center justify-between"
            >
              <span>{v.label}</span>
              <span className="text-xs text-muted-foreground">
                {v.isCurrent && "현재"}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleNewVersion}>
            <Plus className="mr-2 size-3" />
            새 버전
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {toastMsg && (
        <div className="absolute top-full left-0 mt-1 z-50 rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md animate-in fade-in">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
