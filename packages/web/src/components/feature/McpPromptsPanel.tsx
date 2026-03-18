"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listMcpPrompts, executeMcpPrompt } from "@/lib/api-client";

interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

interface McpPromptMessage {
  role: "user" | "assistant";
  content:
    | { type: "text"; text: string }
    | { type: "resource"; resource: { uri: string; text: string; mimeType?: string } };
}

interface McpPromptsPanelProps {
  serverId: string;
  serverName: string;
}

export function McpPromptsPanel({ serverId, serverName }: McpPromptsPanelProps) {
  const [prompts, setPrompts] = useState<McpPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<McpPrompt | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const [messages, setMessages] = useState<McpPromptMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listMcpPrompts(serverId)
      .then((data) => setPrompts(data.prompts))
      .catch(() => setPrompts([]))
      .finally(() => setLoading(false));
  }, [serverId]);

  const handleSelectPrompt = useCallback((prompt: McpPrompt) => {
    setSelectedPrompt(prompt);
    setArgs({});
    setMessages(null);
    setError(null);
  }, []);

  const handleExecute = useCallback(async () => {
    if (!selectedPrompt) return;
    setExecuting(true);
    setError(null);
    try {
      const result = await executeMcpPrompt(
        serverId,
        selectedPrompt.name,
        Object.keys(args).length > 0 ? args : undefined,
      );
      setMessages(result.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "실행 실패");
    } finally {
      setExecuting(false);
    }
  }, [serverId, selectedPrompt, args]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          프롬프트 로딩 중...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{serverName} 프롬프트</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {prompts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            등록된 프롬프트가 없어요.
          </p>
        ) : (
          <div className="space-y-2">
            {prompts.map((p) => (
              <button
                key={p.name}
                onClick={() => handleSelectPrompt(p)}
                className={`w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/50 ${
                  selectedPrompt?.name === p.name
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="font-medium text-sm">{p.name}</div>
                {p.description && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {p.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedPrompt?.arguments && selectedPrompt.arguments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">인자</h4>
            {selectedPrompt.arguments.map((arg) => (
              <div key={arg.name}>
                <label className="mb-1 block text-xs text-muted-foreground">
                  {arg.name}
                  {arg.required && <span className="text-destructive"> *</span>}
                  {arg.description && ` — ${arg.description}`}
                </label>
                <Input
                  value={args[arg.name] ?? ""}
                  onChange={(e) =>
                    setArgs((prev) => ({ ...prev, [arg.name]: e.target.value }))
                  }
                  placeholder={arg.name}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {selectedPrompt && (
          <Button
            size="sm"
            onClick={handleExecute}
            disabled={executing}
          >
            {executing ? "실행 중..." : "프롬프트 실행"}
          </Button>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {messages && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">결과</h4>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-md p-3 text-sm ${
                  msg.role === "user"
                    ? "bg-muted"
                    : "border border-primary/20 bg-primary/5"
                }`}
              >
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  {msg.role === "user" ? "User" : "Assistant"}
                </span>
                {msg.content.type === "text" ? (
                  <p className="whitespace-pre-wrap">{msg.content.text}</p>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Resource: {msg.content.resource.uri}
                    </p>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs">
                      {msg.content.resource.text}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
