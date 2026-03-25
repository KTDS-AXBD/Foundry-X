"use client";

interface BmcStagingBarProps {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}

export default function BmcStagingBar({ dirty, saving, onSave }: BmcStagingBarProps) {
  if (!dirty) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 shadow-lg">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between">
        <span className="text-sm text-muted-foreground">
          변경 사항이 있어요. 저장하면 Git 커밋 대기 상태가 돼요.
        </span>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "변경 사항 저장"}
        </button>
      </div>
    </div>
  );
}
