"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import type { TokenSummary } from "@foundry-x/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TokenUsageChart from "@/components/feature/TokenUsageChart";
import ModelQualityTab from "@/components/feature/ModelQualityTab";
import { cn } from "@/lib/utils";

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

export function Component() {
  const [summary, setSummary] = useState<TokenSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchApi<TokenSummary>("/tokens/summary")
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Token & Cost Management</h1>

      <Tabs defaultValue="usage">
        <TabsList className="mb-4">
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="quality">Model Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="usage">
          {loading && (
            <p className="text-muted-foreground">Loading token data...</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {summary && (
            <div className="flex flex-col gap-4">
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-primary">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-8 md:gap-12">
                    <div>
                      <div
                        className={cn(
                          "text-4xl font-bold",
                          summary.totalCost > 10
                            ? "text-destructive"
                            : summary.totalCost > 5
                              ? "text-yellow-500"
                              : "text-green-500",
                        )}
                      >
                        {formatCost(summary.totalCost)}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Total Cost
                      </div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold">{summary.period}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Period
                      </div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold text-primary">
                        {Object.keys(summary.byModel).length}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Models
                      </div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold text-primary">
                        {Object.keys(summary.byAgent).length}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Agents
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* By Model */}
              <Card>
                <CardContent className="pt-6">
                  <TokenUsageChart title="Cost by Model" data={summary.byModel} />
                </CardContent>
              </Card>

              {/* By Agent */}
              <Card>
                <CardContent className="pt-6">
                  <TokenUsageChart title="Cost by Agent" data={summary.byAgent} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quality">
          <ModelQualityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
