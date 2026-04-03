"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi } from "@/lib/api-client";
import { Building2, Check, X } from "lucide-react";

interface ValidationItem {
  bizItemId: string;
  title: string;
  currentStage: string;
  validationTier: string;
  stageEnteredAt: string;
  createdBy: string;
}

export function Component() {
  const [items, setItems] = useState<ValidationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<{ items: ValidationItem[]; total: number }>("/validation/company/items");
      setItems(data.items);
      setTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleSubmit = async (bizItemId: string, decision: "approve" | "reject") => {
    try {
      await fetchApi("/validation/company/submit", {
        method: "POST",
        body: JSON.stringify({ bizItemId, decision, comment: "" }),
      });
      await loadItems();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Building2 className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold">전사 검증</h1>
        <span className="text-sm text-muted-foreground">({total}건)</span>
      </div>

      <p className="text-sm text-muted-foreground">
        본부 검증이 승인된 항목만 전사 검증에 표시돼요.
      </p>

      {items.length === 0 ? (
        <p className="text-muted-foreground">전사 검증 대기 중인 항목이 없어요.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.bizItemId} className="border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  단계: {item.currentStage} · 등록일: {new Date(item.stageEnteredAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="default" onClick={() => handleSubmit(item.bizItemId, "approve")}>
                  <Check className="h-4 w-4 mr-1" /> 승인
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleSubmit(item.bizItemId, "reject")}>
                  <X className="h-4 w-4 mr-1" /> 반려
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
