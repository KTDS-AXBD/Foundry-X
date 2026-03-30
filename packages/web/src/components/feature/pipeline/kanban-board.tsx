"use client";

import { ItemCard, STAGE_LABELS, type PipelineItemData } from "./item-card";

interface KanbanColumn {
  stage: string;
  items: PipelineItemData[];
  count: number;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onItemClick?: (id: string) => void;
}

export function KanbanBoard({ columns, onItemClick }: KanbanBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div key={col.stage} className="flex-shrink-0 w-72">
          <div className="flex items-center justify-between mb-3 px-2">
            <h3 className="text-sm font-semibold">
              {STAGE_LABELS[col.stage] ?? col.stage}
            </h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {col.count}
            </span>
          </div>
          <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-lg p-2">
            {col.items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">항목 없음</p>
            ) : (
              col.items.map((item) => (
                <ItemCard key={item.id} item={item} onClick={onItemClick} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
