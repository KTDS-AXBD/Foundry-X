"use client";

const colors = {
  text: "#ededed",
  muted: "#888",
};

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

    // text before the marker
    if (startIdx > 0) {
      segments.push({ type: "normal", text: remaining.slice(0, startIdx) });
    }

    const endIdx = remaining.indexOf(AUTO_END, startIdx + AUTO_START.length);
    if (endIdx === -1) {
      // no closing marker — treat rest as auto section
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
  /** Optional: display filename/author/date metadata above the content */
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
        <div
          style={{
            fontSize: 12,
            color: colors.muted,
            marginBottom: 16,
          }}
        >
          {[filePath, author, lastModified].filter(Boolean).join(" · ")}
        </div>
      )}
      <div>
        {segments.map((seg, i) =>
          seg.type === "auto" ? (
            <div
              key={i}
              style={{
                background: "#2a2a2a",
                border: "1px solid #555",
                borderRadius: 6,
                padding: "12px 16px",
                margin: "8px 0",
                position: "relative",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#aaa",
                  background: "#555",
                  borderRadius: 4,
                  padding: "2px 8px",
                  marginBottom: 8,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                Auto-generated
              </span>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "monospace",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "#ccc",
                  margin: 0,
                }}
              >
                {seg.text}
              </pre>
            </div>
          ) : (
            <pre
              key={i}
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "monospace",
                fontSize: 14,
                lineHeight: 1.6,
                color: colors.text,
                margin: 0,
              }}
            >
              {seg.text}
            </pre>
          )
        )}
      </div>
    </div>
  );
}
