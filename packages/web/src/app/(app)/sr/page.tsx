"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchSrList, fetchSrStats } from "@/lib/api-client";
import type { SrItem, SrStatsResponse } from "@/lib/api-client";
import SrStatsCards from "@/components/feature/SrStatsCards";
import SrListTable from "@/components/feature/SrListTable";

const LIMIT = 20;

export default function SrPage() {
  const [stats, setStats] = useState<SrStatsResponse | null>(null);
  const [items, setItems] = useState<SrItem[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ sr_type: "", status: "", priority: "" });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { limit: LIMIT, offset };
      if (filters.sr_type) params.sr_type = filters.sr_type;
      if (filters.status) params.status = filters.status;
      const res = await fetchSrList(params as Parameters<typeof fetchSrList>[0]);
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SRs");
    }
  }, [filters, offset]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchSrStats(), fetchSrList({ limit: LIMIT, offset: 0 })])
      .then(([statsData, listData]) => {
        if (!cancelled) {
          setStats(statsData);
          setItems(listData.items);
          setTotal(listData.total);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  function handleFilterChange(newFilters: typeof filters) {
    setFilters(newFilters);
    setOffset(0);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">SR Management</h1>

      {loading && <p className="text-muted-foreground">Loading SR data...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {stats && (
        <div className="mb-6">
          <SrStatsCards stats={stats} />
        </div>
      )}

      <SrListTable
        items={items}
        filters={filters}
        onFilterChange={handleFilterChange}
        total={total}
        offset={offset}
        limit={LIMIT}
        onPageChange={setOffset}
      />
    </div>
  );
}
