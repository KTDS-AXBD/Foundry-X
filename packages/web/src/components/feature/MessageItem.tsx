"use client";

import type { AgentMessage, MessageType } from "@foundry-x/shared";
import { Button } from "@/components/ui/button";

export const messageTypeIcons: Record<MessageType, string> = {
  task_assign: "\u{1F4CB}",
  task_result: "\u2705",
  task_question: "\u2753",
  task_feedback: "\u{1F4AC}",
  status_update: "\u{1F4CA}",
};

export const messageTypeBg: Record<MessageType, string> = {
  task_assign: "bg-blue-50 dark:bg-blue-900/20",
  task_result: "bg-green-50 dark:bg-green-900/20",
  task_question: "bg-yellow-50 dark:bg-yellow-900/20",
  task_feedback: "bg-purple-50 dark:bg-purple-900/20",
  status_update: "bg-gray-50 dark:bg-gray-900/20",
};

interface MessageItemProps {
  msg: AgentMessage;
  indent?: boolean;
  onAck: (id: string) => void;
}

export function MessageItem({ msg, indent, onAck }: MessageItemProps) {
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
