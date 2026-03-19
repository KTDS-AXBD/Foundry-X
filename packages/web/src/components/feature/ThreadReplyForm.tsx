"use client";

import { useState } from "react";
import { sendInboxMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface ThreadReplyFormProps {
  parentMessageId: string;
  fromAgentId: string;
  toAgentId: string;
  onReplySent: () => void;
}

export function ThreadReplyForm({
  parentMessageId,
  fromAgentId,
  toAgentId,
  onReplySent,
}: ThreadReplyFormProps) {
  const [type, setType] = useState("task_result");
  const [subject, setSubject] = useState("");
  const [payload, setPayload] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    setSending(true);
    try {
      const parsedPayload = payload.trim()
        ? (JSON.parse(payload) as Record<string, unknown>)
        : {};
      await sendInboxMessage(
        fromAgentId,
        toAgentId,
        type,
        subject,
        parsedPayload,
        parentMessageId,
      );
      setSubject("");
      setPayload("");
      onReplySent();
    } catch {
      // 전송 실패
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t pt-3 space-y-2">
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded border bg-background px-2 py-1 text-sm"
        >
          <option value="task_result">결과</option>
          <option value="task_question">질문</option>
          <option value="task_feedback">피드백</option>
          <option value="status_update">상태</option>
        </select>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="답장 내용..."
          className="flex-1 rounded border bg-background px-2 py-1 text-sm"
          required
        />
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">
          payload (JSON, 선택)
        </summary>
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border bg-background px-2 py-1 font-mono text-xs"
          placeholder='{"key": "value"}'
        />
      </details>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={sending || !subject.trim()}>
          {sending ? "전송 중..." : "답장 전송"}
        </Button>
      </div>
    </form>
  );
}
