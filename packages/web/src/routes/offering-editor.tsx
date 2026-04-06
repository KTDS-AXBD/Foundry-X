/**
 * F376: Offering Section Editor + HTML Preview (Sprint 170)
 * 좌우 분할 레이아웃: 왼쪽=섹션 리스트+에디터, 오른쪽=HTML 프리뷰
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText, Shield, Palette, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchOfferingDetail,
  fetchOfferingSections,
  updateOfferingSection,
  reorderOfferingSections,
  fetchOfferingHtmlPreview,
  type OfferingDetail,
  type OfferingSectionItem,
} from "@/lib/api-client";
import { SectionList } from "@/components/feature/offering-editor/section-list";
import { SectionEditor } from "@/components/feature/offering-editor/section-editor";
import { HtmlPreview } from "@/components/feature/offering-editor/html-preview";
import { OfferingPrototypePanel } from "@/components/feature/OfferingPrototypePanel";

const PURPOSE_LABELS: Record<string, string> = {
  report: "보고용",
  proposal: "제안용",
  review: "검토용",
};

export function Component() {
  const { id } = useParams<{ id: string }>();
  const [offering, setOffering] = useState<OfferingDetail | null>(null);
  const [sections, setSections] = useState<OfferingSectionItem[]>([]);
  const [selectedSection, setSelectedSection] = useState<OfferingSectionItem | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!id) return;
    setPreviewLoading(true);
    try {
      const html = await fetchOfferingHtmlPreview(id);
      setHtmlPreview(html);
    } catch {
      setHtmlPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [id]);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [off, secs] = await Promise.all([
        fetchOfferingDetail(id),
        fetchOfferingSections(id),
      ]);
      setOffering(off);
      setSections(secs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    void loadData();
    void loadPreview();
  }, [loadData, loadPreview]);

  const handleSave = async (sectionId: string, data: { title: string; content: string }) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updateOfferingSection(id, sectionId, data);
      setSections((prev) => prev.map((s) => (s.id === sectionId ? updated : s)));
      setSelectedSection(updated);
      await loadPreview();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleIncluded = async (section: OfferingSectionItem) => {
    if (!id) return;
    if (section.isRequired && section.isIncluded) return;
    try {
      const updated = await updateOfferingSection(id, section.id, {
        isIncluded: !section.isIncluded,
      });
      setSections((prev) => prev.map((s) => (s.id === section.id ? updated : s)));
      if (selectedSection?.id === section.id) setSelectedSection(updated);
      await loadPreview();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toggle failed");
    }
  };

  const handleMoveUp = async (index: number) => {
    if (!id || index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    setSections(newSections);
    try {
      const result = await reorderOfferingSections(id, newSections.map((s) => s.id));
      setSections(result.sections);
      await loadPreview();
    } catch (e) {
      setSections(sections); // rollback
      setError(e instanceof Error ? e.message : "Reorder failed");
    }
  };

  const handleMoveDown = async (index: number) => {
    if (!id || index >= sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    setSections(newSections);
    try {
      const result = await reorderOfferingSections(id, newSections.map((s) => s.id));
      setSections(result.sections);
      await loadPreview();
    } catch (e) {
      setSections(sections); // rollback
      setError(e instanceof Error ? e.message : "Reorder failed");
    }
  };

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!offering) return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Link to={`/shaping/offering/${id}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-lg font-bold">{offering.title}</h1>
          <Badge variant="outline">{PURPOSE_LABELS[offering.purpose] ?? offering.purpose}</Badge>
          <Badge>{offering.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Link to={`/shaping/offering/${id}/edit`}>
            <Button size="sm" variant="default">
              <FileText className="size-4 mr-1" /> 에디터
            </Button>
          </Link>
          <Link to={`/shaping/offering/${id}/tokens`}>
            <Button size="sm" variant="outline">
              <Palette className="size-4 mr-1" /> 토큰
            </Button>
          </Link>
          <Link to={`/shaping/offering/${id}/validate`}>
            <Button size="sm" variant="outline">
              <Shield className="size-4 mr-1" /> 검증
            </Button>
          </Link>
        </div>
      </div>

      {/* Content: Left (sections + editor) | Right (preview) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-[400px] shrink-0 border-r overflow-y-auto p-4 space-y-4">
          <SectionList
            sections={sections}
            selectedId={selectedSection?.id ?? null}
            onSelect={setSelectedSection}
            onToggleIncluded={handleToggleIncluded}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
          />
          {selectedSection && (
            <div className="border-t pt-4">
              <SectionEditor
                section={selectedSection}
                saving={saving}
                onSave={handleSave}
                onCancel={() => setSelectedSection(null)}
              />
            </div>
          )}
        </div>

        {/* Right Panel: HTML Preview */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col gap-4">
          <HtmlPreview html={htmlPreview} loading={previewLoading} />
          {id && <OfferingPrototypePanel offeringId={id} />}
        </div>
      </div>
    </div>
  );
}
