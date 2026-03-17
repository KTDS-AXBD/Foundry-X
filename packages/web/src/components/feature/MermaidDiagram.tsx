"use client";

export interface MermaidDiagramProps {
  code: string;
  caption?: string;
}

export default function MermaidDiagram({ code, caption }: MermaidDiagramProps) {
  return (
    <div>
      <p className="mb-4 mt-0 text-sm text-muted-foreground">
        {caption ??
          "Architecture diagram (Mermaid source — install mermaid library to render):"}
      </p>
      <pre className="m-0 whitespace-pre-wrap break-words rounded-md border border-border bg-muted p-5 font-mono text-sm leading-relaxed text-foreground">
        {code}
      </pre>
    </div>
  );
}
