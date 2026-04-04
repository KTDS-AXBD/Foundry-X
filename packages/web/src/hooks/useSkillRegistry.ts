import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSkillRegistryList,
  searchSkillRegistry,
  getSkillEnriched,
  type SkillRegistryListParams,
  type SkillRegistryListResponse,
  type SkillSearchResponse,
} from "@/lib/api-client";
import type { SkillRegistryEntry, SkillEnrichedView } from "@foundry-x/shared";

// ─── useSkillList ───

interface UseSkillListResult {
  items: SkillRegistryEntry[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSkillList(params?: SkillRegistryListParams): UseSkillListResult {
  const [data, setData] = useState<SkillRegistryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialize params for dependency comparison
  const paramKey = JSON.stringify(params ?? {});

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSkillRegistryList(params);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load skills");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  return {
    items: data?.skills ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    refetch: doFetch,
  };
}

// ─── useSkillSearch ───

interface UseSkillSearchResult {
  results: SkillSearchResponse | null;
  loading: boolean;
}

export function useSkillSearch(query: string, debounceMs = 300): UseSkillSearchResult {
  const [results, setResults] = useState<SkillSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchSkillRegistry(query);
        setResults(res);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [query, debounceMs]);

  return { results, loading };
}

// ─── useSkillEnriched ───

interface UseSkillEnrichedResult {
  data: SkillEnrichedView | null;
  loading: boolean;
  error: string | null;
}

export function useSkillEnriched(skillId: string | null): UseSkillEnrichedResult {
  const [data, setData] = useState<SkillEnrichedView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!skillId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    getSkillEnriched(skillId)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load skill"))
      .finally(() => setLoading(false));
  }, [skillId]);

  return { data, loading, error };
}
