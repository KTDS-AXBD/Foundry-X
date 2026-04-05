/**
 * Sprint 156: F346 — Human-in-the-Loop 상태 배지
 */
import { Badge } from "@/components/ui/badge";

interface HITLBadgeProps {
  status?: "pending" | "approved" | "rejected";
}

const statusConfig = {
  pending: { label: "HITL 검토 대기", variant: "outline" as const },
  approved: { label: "HITL 승인", variant: "default" as const },
  rejected: { label: "HITL 반려", variant: "destructive" as const },
} as const;

export function HITLBadge({ status = "pending" }: HITLBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
