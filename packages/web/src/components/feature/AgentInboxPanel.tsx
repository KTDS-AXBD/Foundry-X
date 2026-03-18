"use client";

import { useEffect, useState, useCallback } from "react";
import type { AgentMessage, MessageType } from "@foundry-x/shared";
import { listInboxMessages, acknowledgeMessage } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AgentInboxPanelProps {
  agentId: string;
  className?: string;
}

const messageTypeIcons: Record<MessageType, string> = {
  task_assign: "\u{1F4CB}",
  task_result: "\u2705",
  task_question: "\u2753",
  task_feedback: "\u{1F4AC}",
  status_update: "\u{1F4CA}",
};

const messageTypeBg: Record<MessageType, string> = {
  task_assign: "bg-blue-50 dark:bg-blue-900/20",
  task_result: "bg-green-50 dark:bg-green-900/20",
  task_question: "bg-yellow-50 dark:bg-yellow-900/20",
  task_feedback: "bg-purple-50 dark:bg-purple-900/20",
  status_update: "bg-gray-50 dark:bg-gray-900/20",
};

export function AgentInboxPanel({ agentId, className }: AgentInboxPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listInboxMessages(agentId, unreadOnly, 50);
      setMessages(data.messages as unknown as AgentMessage[]);
    } catch {
      // 로드 실패 시 빈 상태 유지
    } finally {
      setLoading(false);
    }
  }, [agentId, unreadOnly]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // SSE: 새 메시지 수신 시 리로드
  useEffect(() => {
    const es = new EventSource("/api/agents/stream");

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
        // agent.message.received 이벤트: toAgentId 매칭 시 리로드
        if (data.toAgentId === agentId && data.messageId) {
          loadMessages();
        }
      } catch {
        // 파싱 실패 무시
      }
    };

    es.addEventListener("agent.message.received", handleMessage);
    es.addEventListener("message", handleMessage);

    return () => {
      es.close();
    };
  }, [agentId, loadMessages]);

  const handleAcknowledge = async (messageId: string) => {
    try {
      await acknowledgeMessage(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, acknowledged: true, acknowledgedAt: new Date().toISOString() }
            : m,
        ),
      );
    } catch {
      // ack 실패 무시
    }
  };

  const unreadCount = messages.filter((m) => !m.acknowledged).length;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Agent Inbox</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant={unreadOnly ? "default" : "outline"}
            onClick={() => setUnreadOnly((prev) => !prev)}
          >
            {unreadOnly ? "미읽음만" : "전체"}
          </Button>
        </div>

        {/* Messages */}
        {loading ? (
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">메시지가 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={`rounded-md border p-3 text-sm transition-opacity ${
                  msg.acknowledged
                    ? "opacity-60"
                    : messageTypeBg[msg.type] ?? ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">{messageTypeIcons[msg.type] ?? "\u{1F4E8}"}</span>
                    <div>
                      <p className="font-medium">{msg.subject}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        from: {msg.fromAgentId} &middot;{" "}
                        {new Date(msg.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </div>
                  {!msg.acknowledged && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-xs"
                      onClick={() => handleAcknowledge(msg.id)}
                    >
                      확인
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
