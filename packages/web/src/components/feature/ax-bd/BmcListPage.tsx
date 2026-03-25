"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BmcBlock {
  blockType: string;
  content: string | null;
  updatedAt: number;
}

interface Bmc {
  id: string;
  ideaId: string | null;
  title: string;
  gitRef: string;
  authorId: string;
  orgId: string;
  syncStatus: "synced" | "pending" | "failed";
  blocks: BmcBlock[];
  createdAt: number;
  updatedAt: number;
}

interface BmcListResponse {
  items: Bmc[];
  total: number;
  page: number;
  limit: number;
}

export default function BmcListPage() {
  const [bmcs, setBmcs] = useState<Bmc[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBmcs = useCallback(async () => {
    try {
      const data = await fetchApi<BmcListResponse>("/ax-bd/bmc");
      setBmcs(data.items);
    } catch {
      setBmcs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBmcs();
  }, [fetchBmcs]);

  const filledBlockCount = (bmc: Bmc) =>
    bmc.blocks.filter((b) => b.content && b.content.trim().length > 0).length;

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">BMC 캔버스</h1>
        <a href="/ax-bd/bmc/new">
          <Button>새 BMC</Button>
        </a>
      </div>

      {bmcs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">아직 BMC가 없어요.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            &quot;새 BMC&quot; 버튼으로 비즈니스 모델 캔버스를 시작하세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bmcs.map((bmc) => (
            <a key={bmc.id} href={`/ax-bd/bmc/${bmc.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="p-4">
                  <h3 className="font-semibold">{bmc.title}</h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{filledBlockCount(bmc)}/9 블록 작성됨</span>
                    <span>
                      {bmc.syncStatus === "synced"
                        ? "✓ 동기화"
                        : bmc.syncStatus === "pending"
                          ? "⏳ 대기"
                          : "✗ 실패"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(bmc.updatedAt).toLocaleDateString("ko-KR")} 수정
                  </p>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
