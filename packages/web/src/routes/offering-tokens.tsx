/**
 * F381: Offering Design Tokens Page (Sprint 173)
 * Left: DesignTokenEditor, Right: DesignTokenPreview
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchOfferingDetail,
  fetchOfferingHtmlPreview,
  fetchOfferingDesignTokens,
  updateOfferingDesignTokens,
  resetOfferingDesignTokens,
  type OfferingDetail,
} from "@/lib/api-client";
import { DesignTokenEditor, type DesignTokenItem } from "@/components/feature/DesignTokenEditor";
import { DesignTokenPreview } from "@/components/feature/DesignTokenPreview";

export function Component() {
  const { id } = useParams<{ id: string }>();
  const [offering, setOffering] = useState<OfferingDetail | null>(null);
  const [tokens, setTokens] = useState<DesignTokenItem[]>([]);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [off, tokenList, html] = await Promise.all([
        fetchOfferingDetail(id),
        fetchOfferingDesignTokens(id),
        fetchOfferingHtmlPreview(id).catch(() => ""),
      ]);
      setOffering(off);
      setTokens(tokenList);
      setHtmlContent(html);
    } catch {
      setError("Failed to load offering data");
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (updatedTokens: DesignTokenItem[]) => {
    if (!id) return;
    setSaving(true);
    try {
      const saved = await updateOfferingDesignTokens(id, updatedTokens);
      setTokens(saved);
      // Refresh preview with new tokens
      const html = await fetchOfferingHtmlPreview(id).catch(() => "");
      setHtmlContent(html);
    } catch {
      setError("Failed to save tokens");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const defaults = await resetOfferingDesignTokens(id);
      setTokens(defaults);
      const html = await fetchOfferingHtmlPreview(id).catch(() => "");
      setHtmlContent(html);
    } catch {
      setError("Failed to reset tokens");
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "#dc2626" }}>{error}</p>
        <Link to={`/offerings/${id}`}>Back to Offering</Link>
      </div>
    );
  }

  if (!offering) {
    return <div style={{ padding: 24, color: "#999" }}>Loading...</div>;
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 24px",
          borderBottom: "1px solid #e5e5e5",
        }}
      >
        <Link to={`/offerings/${id}/editor`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <Palette size={20} style={{ color: "#666" }} />
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
          Design Tokens — {offering.title}
        </h1>
      </div>

      {/* Split layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: Editor */}
        <div
          style={{
            width: "40%",
            padding: 20,
            borderRight: "1px solid #e5e5e5",
            overflow: "auto",
          }}
        >
          <DesignTokenEditor
            tokens={tokens}
            onSave={handleSave}
            onReset={handleReset}
            saving={saving}
          />
        </div>

        {/* Right: Preview */}
        <div style={{ flex: 1, padding: 20 }}>
          <DesignTokenPreview htmlContent={htmlContent} tokens={tokens} />
        </div>
      </div>
    </div>
  );
}
