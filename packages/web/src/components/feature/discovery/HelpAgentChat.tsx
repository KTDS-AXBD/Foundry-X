"use client";

/**
 * Sprint 100: F269 — 플로팅 버튼 → Sheet 사이드 패널로 전환
 * AppLayout에서 Sheet로 감싸서 렌더링. 이 컴포넌트는 채팅 패널 내부만 담당.
 */
import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHelpAgentStore } from "@/lib/stores/help-agent-store";

interface HelpAgentChatProps {
  bizItemId?: string;
  stage?: string;
}

export default function HelpAgentChat({ bizItemId, stage }: HelpAgentChatProps) {
  const { messages, isStreaming, sendMessage, reset } = useHelpAgentStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    await sendMessage(trimmed, bizItemId, stage);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <span className="font-semibold">Help Agent</span>
          {stage && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
              {stage}
            </span>
          )}
        </div>
        <button
          onClick={reset}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          title="새 대화"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <Sparkles className="mb-2 h-8 w-8" />
            <p className="text-sm">BD 프로세스에 대해 물어보세요!</p>
            <p className="mt-1 text-xs">예: "다음 단계 뭐야?", "스킬 추천해줘"</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "mb-3 max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
              msg.role === "user"
                ? "ml-auto bg-indigo-600 text-white"
                : "bg-muted text-foreground",
            )}
          >
            {msg.isLocal && msg.role === "assistant" && (
              <span className="mb-1 block text-[10px] font-medium text-indigo-500">
                즉시 응답
              </span>
            )}
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <div className="mb-3 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">응답 생성 중...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="질문을 입력하세요..."
            disabled={isStreaming}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="h-9 w-9 rounded-lg p-0"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
