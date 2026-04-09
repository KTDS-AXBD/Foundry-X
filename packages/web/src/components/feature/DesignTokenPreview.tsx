/**
 * F381: Design Token Preview (Sprint 173)
 * iframe-based HTML preview with live CSS variable updates
 */
import { useRef, useEffect, useCallback } from "react";
import type { DesignTokenItem } from "./DesignTokenEditor";

interface DesignTokenPreviewProps {
  htmlContent: string;
  tokens: DesignTokenItem[];
}

export function DesignTokenPreview({ htmlContent, tokens }: DesignTokenPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyTokens = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.documentElement) return;

    const root = iframe.contentDocument.documentElement;
    for (const token of tokens) {
      root.style.setProperty(`--${token.tokenKey}`, token.tokenValue);
    }
  }, [tokens]);

  // Apply tokens with debounce when they change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      applyTokens();
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [applyTokens]);

  // Re-apply tokens when iframe loads new content
  const handleLoad = useCallback(() => {
    applyTokens();
  }, [applyTokens]);

  return (
    <div style={{ height: "100%", border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden" }}>
      {htmlContent ? (
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          onLoad={handleLoad}
          title="Design Token Preview"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          // Design Token CSS 변수 주입을 위해 parent가 iframe documentElement에 접근 필요
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#999",
            fontSize: 14,
          }}
        >
          No HTML preview available. Generate content first.
        </div>
      )}
    </div>
  );
}
