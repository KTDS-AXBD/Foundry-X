"use client";

const AUTO_START = "<!-- foundry-x:auto start -->";
const AUTO_END = "<!-- foundry-x:auto end -->";

interface ContentSegment {
  type: "normal" | "auto";
  text: string;
}

function parseOwnershipMarkers(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    const startIdx = remaining.indexOf(AUTO_START);
    if (startIdx === -1) {
      segments.push({ type: "normal", text: remaining });
      break;
    }

    if (startIdx > 0) {
      segments.push({ type: "normal", text: remaining.slice(0, startIdx) });
    }

    const endIdx = remaining.indexOf(AUTO_END, startIdx + AUTO_START.length);
    if (endIdx === -1) {
      const autoText = remaining.slice(startIdx + AUTO_START.length);
      segments.push({ type: "auto", text: autoText });
      break;
    }

    const autoText = remaining.slice(startIdx + AUTO_START.length, endIdx);
    segments.push({ type: "auto", text: autoText });
    remaining = remaining.slice(endIdx + AUTO_END.length);
  }

  return segments;
}

export interface MarkdownViewerProps {
  content: string;
  filePath?: string;
  author?: string;
  lastModified?: string;
}

export default function MarkdownViewer({
  content,
  filePath,
  author,
  lastModified,
}: MarkdownViewerProps) {
  const segments = parseOwnershipMarkers(content);

  return (
    <div>
      {(filePath || author || lastModified) && (
        <div className="mb-4 text-xs text-muted-foreground">
          {[filePath, author, lastModified].filter(Boolean).join(" · ")}
        </div>
      )}
      <div>
        {segments.map((seg, i) =>
          seg.type === "auto" ? (
            <div
              key={i}
              className="relative my-2 rounded-md border border-border bg-muted p-3"
            >
              <span className="mb-2 inline-block rounded bg-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Auto-generated
              </span>
              <pre className="m-0 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-muted-foreground">
                {seg.text}
              </pre>
            </div>
          ) : (
            <pre
              key={i}
              className="m-0 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground"
            >
              {seg.text}
            </pre>
          ),
        )}
      </div>
    </div>
  );
}
