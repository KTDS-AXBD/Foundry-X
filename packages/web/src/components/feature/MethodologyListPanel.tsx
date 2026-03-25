"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getMethodologies, type MethodologyInfo } from "@/lib/api-client";

interface MethodologyListPanelProps {
  onSelect: (id: string) => void;
  selectedId: string | null;
}

const METHODOLOGY_ICONS: Record<string, string> = {
  bdp: "📊",
  "pm-skills": "🧠",
};

export default function MethodologyListPanel({ onSelect, selectedId }: MethodologyListPanelProps) {
  const [methodologies, setMethodologies] = useState<MethodologyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMethodologies()
      .then(data => setMethodologies(data.methodologies))
      .catch(() => setMethodologies([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse space-y-3">{[1, 2].map(i =>
      <div key={i} className="h-24 rounded-lg bg-muted" />
    )}</div>;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">등록된 방법론</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {methodologies.map(m => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`rounded-lg border p-4 text-left transition-colors hover:border-primary ${
              selectedId === m.id ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{METHODOLOGY_ICONS[m.id] ?? "📋"}</span>
              <span className="font-medium">{m.name}</span>
              {m.isDefault && <Badge variant="secondary">기본</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">v{m.version}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
