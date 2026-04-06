/**
 * F376: Section Editor — 마크다운 textarea 에디터 (Sprint 170)
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { OfferingSectionItem } from "@/lib/api-client";

interface SectionEditorProps {
  section: OfferingSectionItem;
  saving: boolean;
  onSave: (sectionId: string, data: { title: string; content: string }) => void;
  onCancel: () => void;
}

export function SectionEditor({ section, saving, onSave, onCancel }: SectionEditorProps) {
  const [title, setTitle] = useState(section.title);
  const [content, setContent] = useState(section.content ?? "");

  useEffect(() => {
    setTitle(section.title);
    setContent(section.content ?? "");
  }, [section.id, section.title, section.content]);

  const hasChanges = title !== section.title || content !== (section.content ?? "");

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">내용 (Markdown)</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm font-mono min-h-[300px] resize-y"
          placeholder="섹션 내용을 마크다운으로 작성하세요..."
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onSave(section.id, { title, content })}
          disabled={!hasChanges || saving}
        >
          {saving ? "저장 중..." : "저장"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          취소
        </Button>
      </div>
    </div>
  );
}
