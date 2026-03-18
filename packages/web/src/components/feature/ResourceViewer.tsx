"use client";

import type { McpResourceContent } from "@/lib/api-client";

interface ResourceViewerProps {
  content: McpResourceContent;
}

export function ResourceViewer({ content }: ResourceViewerProps) {
  const isJson = content.mimeType?.includes("json");
  const isImage = content.mimeType?.startsWith("image/");

  if (isImage && content.blob) {
    return (
      <div className="rounded-md border p-2">
        <img
          src={`data:${content.mimeType};base64,${content.blob}`}
          alt={content.uri}
          className="max-w-full max-h-64 object-contain"
        />
      </div>
    );
  }

  if (content.text) {
    let displayText = content.text;
    if (isJson) {
      try {
        displayText = JSON.stringify(JSON.parse(content.text), null, 2);
      } catch {
        // use as-is
      }
    }

    return (
      <pre className="rounded-md border bg-muted/50 p-3 text-xs overflow-auto max-h-80 font-mono">
        {displayText}
      </pre>
    );
  }

  if (content.blob) {
    return (
      <div className="rounded-md border p-3 text-sm">
        <p className="text-muted-foreground mb-2">Binary resource ({content.mimeType})</p>
        <a
          href={`data:${content.mimeType ?? "application/octet-stream"};base64,${content.blob}`}
          download={content.uri.split("/").pop() ?? "resource"}
          className="text-primary underline text-xs"
        >
          Download
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-md border p-3 text-sm text-muted-foreground">
      No content available
    </div>
  );
}
