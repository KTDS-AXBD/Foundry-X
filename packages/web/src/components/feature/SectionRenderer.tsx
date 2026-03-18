"use client";

import type { UISection } from "@/lib/api-client";

interface SectionRendererProps {
  section: UISection;
}

export function SectionRenderer({ section }: SectionRendererProps) {
  switch (section.type) {
    case "text":
      return (
        <div>
          <h4 className="mb-1 text-xs font-medium">{section.title}</h4>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">
            {String(section.data)}
          </pre>
        </div>
      );

    case "code":
      return (
        <div>
          <h4 className="mb-1 text-xs font-medium">{section.title}</h4>
          <pre className="max-h-48 overflow-auto rounded bg-zinc-900 p-3 text-xs text-green-400 dark:bg-zinc-950">
            {String(section.data)}
          </pre>
        </div>
      );

    case "diff":
      return (
        <div>
          <h4 className="mb-1 text-xs font-medium">{section.title}</h4>
          <pre className="max-h-48 overflow-auto rounded bg-muted p-3 font-mono text-xs">
            {String(section.data)
              .split("\n")
              .map((line, i) => (
                <span
                  key={i}
                  className={
                    line.startsWith("+")
                      ? "text-green-600 dark:text-green-400"
                      : line.startsWith("-")
                        ? "text-red-600 dark:text-red-400"
                        : line.startsWith("@@")
                          ? "text-blue-600 dark:text-blue-400"
                          : ""
                  }
                >
                  {line}
                  {"\n"}
                </span>
              ))}
          </pre>
        </div>
      );

    case "table": {
      const tableData = section.data as {
        headers?: string[];
        rows?: unknown[][];
      };
      if (!tableData.headers || !tableData.rows) {
        return (
          <div>
            <h4 className="mb-1 text-xs font-medium">{section.title}</h4>
            <pre className="rounded bg-muted p-2 text-xs">
              {JSON.stringify(section.data, null, 2)}
            </pre>
          </div>
        );
      }
      return (
        <div>
          <h4 className="mb-1 text-xs font-medium">{section.title}</h4>
          <div className="overflow-auto rounded border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted">
                  {tableData.headers.map((h, i) => (
                    <th key={i} className="border-b px-2 py-1 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    case "timeline": {
      const items = (section.data as Array<{ label: string; time?: string }>) ?? [];
      return (
        <div>
          <h4 className="mb-1 text-xs font-medium">{section.title}</h4>
          <div className="space-y-1 border-l-2 border-muted pl-4">
            {items.map((item, i) => (
              <div key={i} className="relative text-xs">
                <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                <span className="font-medium">{item.label}</span>
                {item.time && (
                  <span className="ml-2 text-muted-foreground">{item.time}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return (
        <div>
          <h4 className="mb-1 text-xs font-medium">
            {section.title} ({section.type})
          </h4>
          <pre className="max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
            {JSON.stringify(section.data, null, 2)}
          </pre>
        </div>
      );
  }
}
