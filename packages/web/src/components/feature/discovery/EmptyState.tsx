/**
 * F449 — 에러/로딩 UX 공통 컴포넌트: EmptyState
 */
import { Inbox } from "lucide-react";
import type React from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center py-12 space-y-4 text-center"
    >
      <div className="text-muted-foreground">
        {icon ?? <Inbox className="size-10" />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-sm px-4 py-2 rounded border border-border bg-background hover:bg-muted"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
