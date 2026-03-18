"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const THEME_CSS = `
:root {
  --color-bg: #ffffff;
  --color-bg-secondary: #f7f6f3;
  --color-text: #1a1a1a;
  --color-text-secondary: #73726c;
  --color-border: rgba(0,0,0,0.15);
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: "SF Mono", "Fira Code", monospace;
  --radius: 8px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1a1a18;
    --color-bg-secondary: #2c2c2a;
    --color-text: #e8e6de;
    --color-text-secondary: #9c9a92;
    --color-border: rgba(255,255,255,0.15);
  }
}
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0; padding: 16px;
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-bg);
  line-height: 1.5;
}
`;

interface WidgetRendererProps {
  title: string;
  description?: string;
  html: string;
  onAction?: (action: string, data: unknown) => void;
}

export function WidgetRenderer({
  title,
  description,
  html,
  onAction,
}: WidgetRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  const srcDoc = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<style>${THEME_CSS}</style>
<script>
new ResizeObserver(function(entries) {
  var h = entries[0].target.scrollHeight;
  parent.postMessage({ type: 'widget-resize', height: h }, '*');
}).observe(document.body);
</script>
</head><body>${html}</body></html>`;

  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (e.data?.type === "widget-resize") {
        setHeight(Math.min(e.data.height + 20, 800));
      }
      if (e.data?.type === "widget-action") {
        onAction?.(e.data.action, e.data.data);
      }
    },
    [onAction],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="border-b bg-muted/50 px-4 py-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        style={{ width: "100%", height, border: "none", display: "block" }}
        title={title}
      />
    </div>
  );
}
