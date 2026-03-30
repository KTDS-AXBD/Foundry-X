"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FoundryToSubAppMessage, SubAppToFoundryMessage } from "@foundry-x/shared";
import { ServiceLoadingSkeleton } from "./ServiceLoadingSkeleton";
import { ServiceErrorBoundary } from "./ServiceErrorBoundary";

interface ServiceContainerProps {
  serviceUrl: string;
  serviceId: string;
  title: string;
  serviceName?: string;
  projectId?: string;
  orgId?: string;
}

export function ServiceContainer({
  serviceUrl,
  serviceId,
  title,
  serviceName,
  projectId,
  orgId,
}: ServiceContainerProps) {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getOrigin = useCallback(() => {
    try {
      return new URL(serviceUrl).origin;
    } catch {
      return serviceUrl;
    }
  }, [serviceUrl]);

  const sendMessage = useCallback(
    (msg: FoundryToSubAppMessage) => {
      iframeRef.current?.contentWindow?.postMessage(msg, getOrigin());
    },
    [getOrigin],
  );

  // 수신 핸들러: 서브앱 → Foundry-X
  useEffect(() => {
    const origin = getOrigin();
    const handler = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const data = event.data as SubAppToFoundryMessage;
      switch (data.type) {
        case "FX_READY":
          setLoading(false);
          setError(null);
          break;
        case "FX_NAVIGATE":
          if (data.path && data.path.startsWith("/")) {
            navigate(data.path);
          }
          break;
        case "FX_ERROR":
          setError(data.message);
          break;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [getOrigin]);

  // iframe onLoad — 3종 메시지 전송
  const handleIframeLoad = useCallback(() => {
    const hubToken = localStorage.getItem("hubToken");
    if (!hubToken) return;

    // 1. SSO 토큰
    sendMessage({ type: "FX_SSO_TOKEN", token: hubToken, serviceId });
    // 2. 프로젝트 컨텍스트
    if (projectId && orgId) {
      sendMessage({ type: "FX_CONTEXT_SYNC", projectId, orgId });
    }
    // 3. 테마
    const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    sendMessage({ type: "FX_THEME_SYNC", theme });
  }, [sendMessage, serviceId, projectId, orgId]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = serviceUrl;
    }
  }, [serviceUrl]);

  return (
    <div className="relative flex h-full flex-col" data-testid="service-container">
      <div className="flex h-10 items-center border-b px-4">
        <span className="text-sm font-medium text-muted-foreground">
          {serviceName ? `${serviceName} / ${title}` : title}
        </span>
        <a
          href={serviceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          새 탭에서 열기 ↗
        </a>
      </div>
      <div className="relative flex-1">
        {loading && <ServiceLoadingSkeleton title={title} />}
        {error && (
          <ServiceErrorBoundary
            message={error}
            serviceUrl={serviceUrl}
            onRetry={handleRetry}
          />
        )}
        <iframe
          ref={iframeRef}
          src={serviceUrl}
          onLoad={handleIframeLoad}
          className={`h-full w-full border-0 ${loading ? "invisible" : ""}`}
          allow="clipboard-write"
          title={title}
        />
      </div>
    </div>
  );
}
