"use client";

const colors = {
  bg: "#0a0a0a",
  text: "#ededed",
  border: "#333",
  muted: "#888",
};

export interface MermaidDiagramProps {
  code: string;
  caption?: string;
}

export default function MermaidDiagram({ code, caption }: MermaidDiagramProps) {
  return (
    <div>
      <p style={{ fontSize: 13, color: colors.muted, marginBottom: 16, marginTop: 0 }}>
        {caption ??
          "Architecture diagram (Mermaid source — install mermaid library to render):"}
      </p>
      <pre
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          padding: 20,
          fontFamily: "monospace",
          fontSize: 13,
          lineHeight: 1.6,
          color: colors.text,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          margin: 0,
        }}
      >
        {code}
      </pre>
    </div>
  );
}
