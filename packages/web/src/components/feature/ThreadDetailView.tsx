"use client";

import { useEffect, useState, useCallback } from "react";
import type { AgentMessage } from "@foundry-x/shared";
import { getInboxThread, ackThread, BASE_URL } from "@/lib/api-client";
import type { InboxMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageItem } from "./MessageItem";
import { ThreadReplyForm } from "./ThreadReplyForm";

interface ThreadDetailViewProps {
  parentMessageId: string;
  agentId: string;
  onBack: () => void;
  onAck: (messageId: string) => void;
}

function deriveRecipient(thread: InboxMessage[], agentId: string): string {
  const other = [...thread].reverse().find((m) => m.fromAgentId !== agentId);
  return other?.fromAgentId ?? thread[0]?.fromAgentId ?? "";
}

export function ThreadDetailView({
  parentMessageId,
  agentId,
  onBack,
  onAck,
}: ThreadDetailViewProps) {
  const [thread, setThread] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadThread = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInboxThread(parentMessageId, 100);
      setThread(data.thread);
    } catch {
      // 로드 실패
    } finally {
      setLoading(false);
    }
  }, [parentMessageId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  // SSE: 스레드 답장 수신 시 리프레시
  useEffect(() => {
    const es = new EventSource(`${BASE_URL}/agents/stream`);
    const handleReply = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
        if (
          data.parentMessageId === parentMessageId ||
          data.toAgentId === agentId
        ) {
          loadThread();
        }
      } catch {
        // 파싱 실패 무시
      }
    };
    es.addEventListener("agent.message.thread_reply", handleReply);
    es.addEventListener("agent.message.received", handleReply);
    return () => es.close();
  }, [parentMessageId, agentId, loadThread]);

  const handleAckThread = async () => {
    try {
      await ackThread(parentMessageId);
      // 로컬 상태 업데이트
      setThread((prev) =>
        prev.map((m) => ({
          ...m,
          acknowledged: true,
          acknowledgedAt: m.acknowledgedAt ?? new Date().toISOString(),
        })),
      );
    } catch {
      // ack 실패
    }
  };

  const unreadCount = thread.filter((m) => !m.acknowledged).length;

  if (loading) {
    return <p className="text-sm text-muted-foreground">스레드 로딩 중...</p>;
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← 뒤로
        </Button>
        <span className="truncate text-sm font-semibold">
          스레드: {thread[0]?.subject ?? "..."}
        </span>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleAckThread}>
            전체 읽음
          </Button>
        </div>
      </div>

      {/* 메시지 목록 */}
      {thread.length === 0 ? (
        <p className="text-sm text-muted-foreground">메시지가 없어요.</p>
      ) : (
        <ul className="mb-4 max-h-96 space-y-2 overflow-y-auto">
          {thread.map((msg, i) => (
            <MessageItem
              key={msg.id}
              msg={msg as AgentMessage}
              indent={i > 0}
              onAck={onAck}
            />
          ))}
        </ul>
      )}

      {/* 답장 폼 */}
      <ThreadReplyForm
        parentMessageId={parentMessageId}
        fromAgentId={agentId}
        toAgentId={deriveRecipient(thread, agentId)}
        onReplySent={loadThread}
      />
    </div>
  );
}
