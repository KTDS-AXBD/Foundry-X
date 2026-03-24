"use client";

import { Badge } from "@/components/ui/badge";

interface Competitor {
  name: string;
  description: string;
  url?: string;
  relevance: "high" | "medium" | "low";
}

const RELEVANCE_STYLE: Record<string, { color: string; label: string }> = {
  high: { color: "bg-red-100 text-red-800 border-red-200", label: "높음" },
  medium: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "중간" },
  low: { color: "bg-green-100 text-green-800 border-green-200", label: "낮음" },
};

interface CompetitorTableProps {
  competitors: Competitor[];
}

export default function CompetitorTable({ competitors }: CompetitorTableProps) {
  if (competitors.length === 0) {
    return <p className="text-sm text-muted-foreground">경쟁사 정보가 없어요.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">경쟁사</th>
            <th className="px-3 py-2 text-left font-medium">설명</th>
            <th className="px-3 py-2 text-center font-medium">관련도</th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((c, i) => {
            const rel = RELEVANCE_STYLE[c.relevance] ?? RELEVANCE_STYLE.low;
            return (
              <tr key={i} className="border-b last:border-b-0">
                <td className="px-3 py-2 font-medium">
                  {c.url ? (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {c.name}
                    </a>
                  ) : (
                    c.name
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{c.description}</td>
                <td className="px-3 py-2 text-center">
                  <Badge className={`border text-[11px] ${rel.color}`}>{rel.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
