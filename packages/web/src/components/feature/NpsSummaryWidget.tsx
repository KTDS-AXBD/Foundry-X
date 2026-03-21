"use client";

import { useEffect, useState } from "react";
import { getFeedbackSummary, type FeedbackSummary } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NpsSummaryWidget() {
  const [data, setData] = useState<FeedbackSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFeedbackSummary()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const npsColor =
    data && data.averageNps >= 9
      ? "text-green-500"
      : data && data.averageNps >= 7
        ? "text-yellow-500"
        : "text-red-500";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">NPS Feedback Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-3">
            <div className="h-12 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        {!loading && !error && data && (
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className={`text-4xl font-bold tabular-nums ${npsColor}`}>
                {data.averageNps.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">/ 10</span>
            </div>

            <div className="text-sm text-muted-foreground">
              총 {data.totalResponses}개 응답
            </div>

            {data.recentFeedback.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">최근 피드백</h4>
                <div className="divide-y divide-border rounded-lg border">
                  {data.recentFeedback.map((fb, i) => (
                    <div key={i} className="px-3 py-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">NPS {fb.npsScore}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(fb.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {fb.comment && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {fb.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.totalResponses === 0 && (
              <p className="text-sm text-muted-foreground">
                아직 피드백이 없습니다.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
