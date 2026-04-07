"use client";

/**
 * Sprint 215: 사업기획서 편집기 컴포넌트 (F444)
 * 섹션별 인라인 편집 + AI 재생성 + 저장
 */
import { useState, useEffect, useCallback } from "react";
import { Save, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SectionEditor from "./SectionEditor";
import {
  fetchBusinessPlanSections,
  updateBusinessPlanSection,
  regenerateBusinessPlanSection,
  saveBusinessPlanDraft,
  type BusinessPlanSectionItem,
  type BusinessPlanResult,
} from "@/lib/api-client";

interface BusinessPlanEditorProps {
  bizItemId: string;
  onSaved: (newPlan: BusinessPlanResult) => void;
  onCancel: () => void;
}

export default function BusinessPlanEditor({
  bizItemId,
  onSaved,
  onCancel,
}: BusinessPlanEditorProps) {
  const [sections, setSections] = useState<BusinessPlanSectionItem[]>([]);
  const [editedContents, setEditedContents] = useState<Map<number, string>>(new Map());
  const [regeneratingSections, setRegeneratingSections] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDirty = editedContents.size > 0;

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchBusinessPlanSections(bizItemId);
        setSections(data.sections);
      } catch (e) {
        setError(e instanceof Error ? e.message : "섹션을 불러오지 못했어요.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [bizItemId]);

  const handleChange = useCallback((sectionNum: number, content: string) => {
    setEditedContents(prev => new Map(prev).set(sectionNum, content));
  }, []);

  const handleRegenerate = useCallback(async (sectionNum: number) => {
    setRegeneratingSections(prev => new Set(prev).add(sectionNum));
    try {
      const res = await regenerateBusinessPlanSection(bizItemId, sectionNum);
      setEditedContents(prev => new Map(prev).set(sectionNum, res.content));
      setSections(prev => prev.map(s =>
        s.sectionNum === sectionNum ? { ...s, content: res.content } : s,
      ));
      // 서버에도 반영
      await updateBusinessPlanSection(bizItemId, sectionNum, res.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 재생성에 실패했어요.");
    } finally {
      setRegeneratingSections(prev => {
        const next = new Set(prev);
        next.delete(sectionNum);
        return next;
      });
    }
  }, [bizItemId]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      // 변경된 섹션 서버에 동기화
      await Promise.all(
        Array.from(editedContents.entries()).map(([num, content]) =>
          updateBusinessPlanSection(bizItemId, num, content),
        ),
      );
      const newDraft = await saveBusinessPlanDraft(bizItemId);
      onSaved(newDraft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  }, [bizItemId, editedContents, onSaved]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        섹션을 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 편집기 헤더 */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">편집 모드</Badge>
          {isDirty && (
            <span className="text-xs text-amber-600">저장되지 않은 변경사항이 있어요</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
            <X className="size-4 mr-1.5" />
            취소
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={isSaving || !isDirty}>
            <Save className="size-4 mr-1.5" />
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 섹션 편집기 목록 */}
      {sections.map(section => (
        <SectionEditor
          key={section.sectionNum}
          sectionNum={section.sectionNum}
          title={section.title}
          content={editedContents.get(section.sectionNum) ?? section.content}
          onChange={handleChange}
          onRegenerate={(num) => void handleRegenerate(num)}
          isRegenerating={regeneratingSections.has(section.sectionNum)}
        />
      ))}
    </div>
  );
}
