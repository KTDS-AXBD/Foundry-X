"use client";

import { useEffect, useState, useCallback } from "react";
import type { AgentMessage, MessageType } from "@foundry-x/shared";
import { listInboxMessages, acknowledgeMessage, BASE_URL } from "@/lib/api-client";
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

// F81: Thread grouping
type ViewMode = "flat" | "threaded";

interface ThreadGroup {
  root: AgentMessage;
  children: AgentMessage[];
}

function groupByThread(messages: AgentMessage[]): {
  threads: ThreadGroup[];
  orphans: AgentMessage[];
} {
  const byId = new Map<string, AgentMessage>();
  for (const msg of messages) byId.set(msg.id, msg);

  const childrenMap = new Map<string, AgentMessage[]>();
  const roots: AgentMessage[] = [];
  const orphans: AgentMessage[] = [];

  for (const msg of messages) {
    if (!msg.parentMessageId) {
      roots.push(msg);
    } else if (byId.has(msg.parentMessageId)) {
      const children = childrenMap.get(msg.parentMessageId) ?? [];
      children.push(msg);
      childrenMap.set(msg.parentMessageId, children);
    } else {
      orphans.push(msg);
    }
  }

  const threads = roots.map((root) => ({
    root,
    children: (childrenMap.get(root.id) ?? []).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
  }));

  threads.sort((a, b) => {
    const lastA = a.children.at(-1)?.createdAt ?? a.root.createdAt;
    const lastB = b.children.at(-1)?.createdAt ?? b.root.createdAt;
    return new Date(lastB).getTime() - new Date(lastA).getTime();
  });

  return { threads, orphans };
}

function MessageItem({
  msg,
  indent,
  onAck,
}: {
  msg: AgentMessage;
  indent?: boolean;
  onAck: (id: string) => void;
}) {
  return (
    <li
      className={`rounded-md border p-3 text-sm transition-opacity ${
        indent ? "ml-6 border-l-2 border-muted" : ""
      } ${msg.acknowledged ? "opacity-60" : messageTypeBg[msg.type] ?? ""}`}
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
            onClick={() => onAck(msg.id)}
          >
            확인
          </Button>
        )}
      </div>
    </li>
  );
}

export function AgentInboxPanel({ agentId, className }: AgentInboxPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("flat");
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

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
    const es = new EventSource(`${BASE_URL}/agents/stream`);

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
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

  const handleToggleThread = (rootId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  };

  const unreadCount = messages.filter((m) => !m.acknowledged).length;
  const { threads, orphans } = groupByThread(messages);

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
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={viewMode === "flat" ? "default" : "outline"}
              onClick={() => setViewMode("flat")}
            >
              목록
            </Button>
            <Button
              size="sm"
              variant={viewMode === "threaded" ? "default" : "outline"}
              onClick={() => setViewMode("threaded")}
            >
              스레드
            </Button>
            <Button
              size="sm"
              variant={unreadOnly ? "default" : "outline"}
              onClick={() => setUnreadOnly((prev) => !prev)}
            >
              {unreadOnly ? "미읽음만" : "전체"}
            </Button>
          </div>
        </div>

        {/* Messages */}
        {loading ? (
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">메시지가 없어요.</p>
        ) : viewMode === "flat" ? (
          <ul className="space-y-2">
            {messages.map((msg) => (
              <MessageItem key={msg.id} msg={msg} onAck={handleAcknowledge} />
            ))}
          </ul>
        ) : (
          <ul className="space-y-3">
            {threads.map(({ root, children }) => {
              const isExpanded = expandedThreads.has(root.id);
              return (
                <li key={root.id}>
                  {/* Root message */}
                  <div
                    className="flex cursor-pointer items-center gap-1"
                    onClick={() => children.length > 0 && handleToggleThread(root.id)}
                  >
                    {children.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {isExpanded ? "\u25BC" : "\u25B6"}
                      </span>
                    )}
                    <div className="flex-1">
                      <MessageItem msg={root} onAck={handleAcknowledge} />
                    </div>
                    {children.length > 0 && (
                      <Badge variant="secondary" className="ml-1 shrink-0 text-xs">
                        {children.length}개 답장
                      </Badge>
                    )}
                  </div>
                  {/* Children (threaded) */}
                  {isExpanded && children.length > 0 && (
                    <ul className="mt-1 space-y-1">
                      {children.map((child) => (
                        <MessageItem
                          key={child.id}
                          msg={child}
                          indent
                          onAck={handleAcknowledge}
                        />
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {/* Orphan messages */}
            {orphans.length > 0 && (
              <>
                <li className="pt-2 text-xs font-medium text-muted-foreground">
                  기타 메시지
                </li>
                {orphans.map((msg) => (
                  <MessageItem key={msg.id} msg={msg} onAck={handleAcknowledge} />
                ))}
              </>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
