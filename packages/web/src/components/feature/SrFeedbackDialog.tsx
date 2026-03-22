"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { submitSrFeedback } from "@/lib/api-client";

const SR_TYPES = ["code_change", "bug_fix", "env_config", "doc_update", "security_patch"] as const;

interface SrFeedbackDialogProps {
  srId: string;
  currentType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function formatType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SrFeedbackDialog({
  srId,
  currentType,
  open,
  onOpenChange,
  onSuccess,
}: SrFeedbackDialogProps) {
  const [correctedType, setCorrectedType] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableTypes = SR_TYPES.filter((t) => t !== currentType);

  async function handleSubmit() {
    if (!correctedType) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitSrFeedback(srId, {
        corrected_type: correctedType,
        reason: reason || undefined,
      });
      setCorrectedType("");
      setReason("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-label="SR Feedback">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      <div className="relative z-10 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">분류 수정</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Current Type</label>
            <p className="text-sm text-muted-foreground">{formatType(currentType)}</p>
          </div>

          <div>
            <label htmlFor="corrected-type" className="text-sm font-medium mb-1 block">Corrected Type</label>
            <select
              id="corrected-type"
              value={correctedType}
              onChange={(e) => setCorrectedType(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select type...</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>{formatType(t)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="feedback-reason" className="text-sm font-medium mb-1 block">Reason (optional)</label>
            <textarea
              id="feedback-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
              placeholder="Why is this classification incorrect?"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!correctedType || submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
