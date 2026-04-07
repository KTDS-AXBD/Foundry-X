// ─── F399: Strangler Fig 프록시 미들웨어 (Sprint 186) ───
// Strangler Fig 패턴: mode:'local' → 모놀리스 처리, mode:'proxy' → 외부 서비스 포워딩

import type { Context, MiddlewareHandler, Next } from "hono";
import type { ServiceId } from "../types.js";

export interface StranglerRoute {
  /** 매칭할 경로 접두사 (예: '/dx', '/gate', '/launch') */
  pathPrefix: string;
  /** 대상 서비스 식별자 */
  serviceId: ServiceId;
  /**
   * 처리 모드:
   * - 'local': 현재 모놀리스 핸들러로 fallthrough (서비스 이관 전)
   * - 'proxy': targetUrl 또는 Workers Service Binding으로 포워딩 (이관 후)
   */
  mode: "local" | "proxy";
  /** proxy 모드 시 HTTP 포워딩 대상 URL (예: 'https://gate-x.workers.dev') */
  targetUrl?: string;
}

export interface StranglerConfig {
  routes: StranglerRoute[];
}

/**
 * Strangler Fig 패턴 라우팅 미들웨어.
 *
 * 등록된 경로에 대해 mode에 따라 로컬 처리 또는 외부 서비스로 포워딩한다.
 * Auth 검증은 외부 미들웨어에서 처리한다 (ADR-003: 관심사 분리).
 */
export function createStranglerMiddleware(config: StranglerConfig): MiddlewareHandler {
  return async function strangler(c: Context, next: Next): Promise<Response | void> {
    const reqPath = c.req.path;

    // 매칭 라우트 탐색 (더 긴 prefix 우선)
    const route = config.routes
      .filter((r) => reqPath.startsWith(r.pathPrefix))
      .sort((a, b) => b.pathPrefix.length - a.pathPrefix.length)[0];

    // 미매칭 또는 local 모드 → 다음 핸들러로 전달
    if (!route || route.mode === "local") {
      return next();
    }

    // proxy 모드 — targetUrl 없으면 502
    if (!route.targetUrl) {
      return c.json(
        { error: "Service not configured", serviceId: route.serviceId },
        502,
      );
    }

    // 경로 재계산: prefix 이후 나머지 경로
    const remainingPath = reqPath.slice(route.pathPrefix.length) || "/";

    // URL에서 query string 보존
    const url = new URL(c.req.url);
    const targetUrl = `${route.targetUrl.replace(/\/$/, "")}${remainingPath}${url.search}`;

    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Forwarded-From", "foundry-x-strangler");
    headers.set("X-Original-Path", reqPath);
    headers.set("X-Service-Id", route.serviceId);

    const isBodyless = c.req.method === "GET" || c.req.method === "HEAD";

    return fetch(targetUrl, {
      method: c.req.method,
      headers,
      body: isBodyless ? undefined : c.req.raw.body,
    });
  };
}
