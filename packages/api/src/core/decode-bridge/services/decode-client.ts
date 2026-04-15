import type { Env } from "../../../env.js";
import {
  LPON_MOCK_GRAPH,
  LPON_MOCK_SUMMARY,
  LPON_MOCK_FINDINGS,
  LPON_MOCK_COMPARISON,
} from "../data/lpon-mock.js";

function makeInternalHeaders(secret: string, orgId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Internal-Secret": secret,
  };
  if (orgId) headers["X-Organization-Id"] = orgId;
  return headers;
}

async function callService(
  binding: Fetcher | undefined,
  fallbackUrl: string | undefined,
  path: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown,
): Promise<Response | null> {
  const init: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };
  try {
    if (binding) {
      return await binding.fetch(new Request(`https://service${path}`, init));
    }
    if (fallbackUrl) {
      return await fetch(`${fallbackUrl}${path}`, init);
    }
    return null;
  } catch {
    return null;
  }
}

export async function getOntologyGraph(env: Env): Promise<unknown> {
  const secret = (env as unknown as Record<string, string>).DECODE_X_INTERNAL_SECRET ?? "";
  const res = await callService(
    (env as unknown as Record<string, Fetcher>).SVC_ONTOLOGY,
    (env as unknown as Record<string, string>).DECODE_X_ONTOLOGY_URL,
    "/graph/visualization",
    "GET",
    makeInternalHeaders(secret),
  );
  if (res?.ok) return res.json();
  return LPON_MOCK_GRAPH;
}

export async function getAnalysisSummary(env: Env, documentId: string): Promise<unknown> {
  const secret = (env as unknown as Record<string, string>).DECODE_X_INTERNAL_SECRET ?? "";
  const res = await callService(
    (env as unknown as Record<string, Fetcher>).SVC_EXTRACTION,
    (env as unknown as Record<string, string>).DECODE_X_EXTRACTION_URL,
    `/analysis/${documentId}/summary`,
    "GET",
    makeInternalHeaders(secret),
  );
  if (res?.ok) return res.json();
  return LPON_MOCK_SUMMARY;
}

export async function getAnalysisFindings(env: Env, documentId: string): Promise<unknown> {
  const secret = (env as unknown as Record<string, string>).DECODE_X_INTERNAL_SECRET ?? "";
  const res = await callService(
    (env as unknown as Record<string, Fetcher>).SVC_EXTRACTION,
    (env as unknown as Record<string, string>).DECODE_X_EXTRACTION_URL,
    `/analysis/${documentId}/findings`,
    "GET",
    makeInternalHeaders(secret),
  );
  if (res?.ok) return res.json();
  return LPON_MOCK_FINDINGS;
}

export async function getAnalysisComparison(env: Env, documentId: string): Promise<unknown> {
  const secret = (env as unknown as Record<string, string>).DECODE_X_INTERNAL_SECRET ?? "";
  const res = await callService(
    (env as unknown as Record<string, Fetcher>).SVC_EXTRACTION,
    (env as unknown as Record<string, string>).DECODE_X_EXTRACTION_URL,
    `/analysis/compare?documentId=${documentId}`,
    "GET",
    makeInternalHeaders(secret),
  );
  if (res?.ok) return res.json();
  return LPON_MOCK_COMPARISON;
}

export async function triggerAnalysis(
  env: Env,
  payload: { documentId: string; orgId: string },
): Promise<unknown> {
  const secret = (env as unknown as Record<string, string>).DECODE_X_INTERNAL_SECRET ?? "";
  const res = await callService(
    (env as unknown as Record<string, Fetcher>).SVC_EXTRACTION,
    (env as unknown as Record<string, string>).DECODE_X_EXTRACTION_URL,
    "/extract",
    "POST",
    makeInternalHeaders(secret, payload.orgId),
    payload,
  );
  if (res?.ok) return res.json();
  return { status: "queued", documentId: payload.documentId, note: "mock-fallback" };
}
