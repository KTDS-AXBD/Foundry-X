"use client";

interface BmcBlockEditorProps {
  label: string;
  blockType: string;
  content: string;
  onChange: (content: string) => void;
}

export default function BmcBlockEditor({
  label,
  blockType,
  content,
  onChange,
}: BmcBlockEditorProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border bg-card p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      <textarea
        className="flex-1 resize-none bg-transparent text-sm outline-none"
        placeholder={`${label} 입력...`}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        maxLength={2000}
      />
    </div>
  );
}
