"use client";

import { useEffect, useRef } from "react";

interface ServiceContainerProps {
  serviceUrl: string;
  serviceId: string;
  title: string;
}

export function ServiceContainer({ serviceUrl, serviceId, title }: ServiceContainerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const hubToken = localStorage.getItem("hubToken");
    if (iframeRef.current && hubToken) {
      const sendToken = () => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "FX_SSO_TOKEN", token: hubToken, serviceId },
          serviceUrl,
        );
      };
      iframeRef.current.addEventListener("load", sendToken);
      return () => iframeRef.current?.removeEventListener("load", sendToken);
    }
  }, [serviceUrl, serviceId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 items-center border-b px-4">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <a
          href={serviceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          새 탭에서 열기 ↗
        </a>
      </div>
      <iframe
        ref={iframeRef}
        src={serviceUrl}
        className="flex-1 border-0"
        allow="clipboard-write"
        title={title}
      />
    </div>
  );
}
