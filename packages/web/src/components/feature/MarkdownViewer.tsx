"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

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

const proseComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mt-8 mb-4 text-2xl font-bold tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mt-7 mb-3 text-xl font-semibold tracking-tight text-foreground border-b border-border pb-2">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-6 mb-2 text-lg font-semibold text-foreground">
      {children}
    </h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mt-4 mb-2 text-base font-semibold text-foreground">
      {children}
    </h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-4 leading-7 text-foreground last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-4 ml-6 list-disc space-y-1.5 text-foreground [&>li]:pl-1">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1.5 text-foreground [&>li]:pl-1">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-7">{children}</li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-4 border-l-4 border-primary/40 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({
    inline,
    children,
  }: {
    inline?: boolean;
    children?: React.ReactNode;
  }) =>
    inline ? (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.875em] text-foreground">
        {children}
      </code>
    ) : (
      <code className="block">{children}</code>
    ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="my-4 overflow-x-auto rounded-lg border border-border bg-muted p-4 font-mono text-sm leading-relaxed">
      {children}
    </pre>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-muted/60">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-4 py-2.5 text-left font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-t border-border px-4 py-2.5 text-foreground">
      {children}
    </td>
  ),
  tr: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => (
    <tr className={cn("hover:bg-muted/30 transition-colors", className)}>
      {children}
    </tr>
  ),
  a: ({
    href,
    children,
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-6 border-border" />,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
};

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
        <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {filePath && (
            <span className="rounded bg-muted px-2 py-0.5 font-mono">
              {filePath}
            </span>
          )}
          {(author || lastModified) && (
            <span>
              {[author, lastModified].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
      )}
      <div>
        {segments.map((seg, i) =>
          seg.type === "auto" ? (
            <div
              key={i}
              className="relative my-4 rounded-lg border border-border bg-muted/50 p-4"
            >
              <span className="mb-3 inline-block rounded bg-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Auto-generated
              </span>
              <div className="text-muted-foreground">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={proseComponents}
                >
                  {seg.text}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkGfm]}
              components={proseComponents}
            >
              {seg.text}
            </ReactMarkdown>
          ),
        )}
      </div>
    </div>
  );
}
