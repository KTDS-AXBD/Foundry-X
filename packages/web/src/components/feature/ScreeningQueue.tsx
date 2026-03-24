"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ScreeningItem {
  id: string;
  title: string;
  description: string | null;
  source: string;
  createdAt: string;
}

interface ScreeningQueueProps {
  items: ScreeningItem[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export default function ScreeningQueue({ items, onApprove, onReject }: ScreeningQueueProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setLoadingId(id);
    try {
      if (action === "approve") {
        await onApprove(id);
      } else {
        await onReject(id);
      }
    } finally {
      setLoadingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          심사 대기 중인 아이템이 없어요.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">심사 대기 ({items.length}건)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">제목</th>
                <th className="px-4 py-2 text-left font-medium">채널</th>
                <th className="px-4 py-2 text-left font-medium">등록일</th>
                <th className="px-4 py-2 text-right font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.title}</div>
                    {item.description && (
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      {item.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleAction(item.id, "approve")}
                        disabled={loadingId === item.id}
                        className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => handleAction(item.id, "reject")}
                        disabled={loadingId === item.id}
                        className="rounded bg-destructive px-3 py-1 text-xs text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                      >
                        반려
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
