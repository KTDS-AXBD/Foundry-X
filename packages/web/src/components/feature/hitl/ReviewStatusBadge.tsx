"use client";

import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  approved: { label: "승인", variant: "default" },
  pending: { label: "대기", variant: "secondary" },
  revision_requested: { label: "수정요청", variant: "outline" },
  rejected: { label: "반려", variant: "destructive" },
};

interface ReviewStatusBadgeProps {
  status: string;
}

export default function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  const info = STATUS_MAP[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
