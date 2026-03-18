"use client";

import { useState, useEffect, useCallback } from "react";
import type { TodoItem, Message } from "@foundry-x/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { McpServerCard } from "@/components/feature/McpServerCard";
import { McpPromptsPanel } from "@/components/feature/McpPromptsPanel";
import {
  listMcpServers,
  createMcpServer,
  getMcpSamplingLog,
  type McpServerInfo,
} from "@/lib/api-client";

interface Settings {
  theme: "dark" | "light";
  notifications: boolean;
}

type Tab = "todo" | "messages" | "settings" | "mcp";

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function TodoTab() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTodos(loadJson<TodoItem[]>("fx-todos", []));
    setLoaded(true);
  }, []);

  const persist = useCallback((next: TodoItem[]) => {
    setTodos(next);
    saveJson("fx-todos", next);
  }, []);

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    persist([
      ...todos,
      {
        id: crypto.randomUUID(),
        text: trimmed,
        done: false,
        assignee: "",
        createdAt: new Date().toISOString(),
      },
    ]);
    setInput("");
  };

  const toggle = (id: string) =>
    persist(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const remove = (id: string) => persist(todos.filter((t) => t.id !== id));

  if (!loaded) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a todo..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <Button onClick={add}>Add</Button>
      </div>

      {todos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No todos yet.</p>
      ) : (
        <div className="flex flex-col">
          {todos.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2.5 border-b border-border px-3 py-2"
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t.id)}
                className="size-4 accent-primary"
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  t.done
                    ? "text-muted-foreground line-through"
                    : "text-foreground",
                )}
              >
                {t.text}
              </span>
              <button
                onClick={() => remove(t.id)}
                className="px-1.5 text-destructive hover:text-destructive/80"
                title="Delete"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs text-muted-foreground">
        {todos.filter((t) => t.done).length}/{todos.length} completed
      </div>
    </div>
  );
}

function MessagesTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setMessages(loadJson<Message[]>("fx-messages", []));
    setLoaded(true);
  }, []);

  const persist = useCallback((next: Message[]) => {
    setMessages(next);
    saveJson("fx-messages", next);
  }, []);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    persist([
      ...messages,
      {
        id: crypto.randomUUID(),
        from: "You",
        to: "Team",
        content: trimmed,
        read: false,
        sentAt: new Date().toLocaleString(),
      },
    ]);
    setInput("");
  };

  if (!loaded) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="mb-4 flex max-h-[360px] flex-col gap-2 overflow-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-border bg-muted p-3"
            >
              <div className="mb-1 flex justify-between">
                <span className="text-sm font-semibold text-primary">
                  {m.from}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {m.sentAt}
                </span>
              </div>
              <p className="m-0 text-sm">{m.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <Button onClick={send}>Send</Button>
      </div>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<Settings>({
    theme: "dark",
    notifications: true,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(
      loadJson<Settings>("fx-settings", { theme: "dark", notifications: true }),
    );
    setLoaded(true);
  }, []);

  const update = (partial: Partial<Settings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveJson("fx-settings", next);
  };

  if (!loaded) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="flex flex-col gap-6">
      {/* Theme */}
      <div className="flex items-center justify-between border-b border-border py-3">
        <div>
          <div className="text-sm font-semibold">Theme</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Currently: {settings.theme === "dark" ? "Dark" : "Light"}
          </div>
        </div>
        <button
          onClick={() =>
            update({ theme: settings.theme === "dark" ? "light" : "dark" })
          }
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            settings.theme === "dark" ? "bg-primary" : "bg-muted",
          )}
        >
          <div
            className={cn(
              "absolute top-[3px] size-[18px] rounded-full bg-white transition-[left]",
              settings.theme === "dark" ? "left-[22px]" : "left-1",
            )}
          />
        </button>
      </div>

      {/* Notifications */}
      <div className="flex items-center justify-between border-b border-border py-3">
        <div>
          <div className="text-sm font-semibold">Notifications</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {settings.notifications ? "Enabled" : "Disabled"}
          </div>
        </div>
        <button
          onClick={() => update({ notifications: !settings.notifications })}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            settings.notifications ? "bg-primary" : "bg-muted",
          )}
        >
          <div
            className={cn(
              "absolute top-[3px] size-[18px] rounded-full bg-white transition-[left]",
              settings.notifications ? "left-[22px]" : "left-1",
            )}
          />
        </button>
      </div>
    </div>
  );
}

interface SamplingLogEntry {
  id: string;
  serverId: string;
  model: string;
  maxTokens: number;
  tokensUsed: number | null;
  durationMs: number | null;
  status: string;
  createdAt: string;
}

type McpSubTab = "servers" | "prompts" | "sampling";

function McpServersTab() {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subTab, setSubTab] = useState<McpSubTab>("servers");
  const [selectedServer, setSelectedServer] = useState<McpServerInfo | null>(null);
  const [samplingLogs, setSamplingLogs] = useState<SamplingLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    serverUrl: "",
    transportType: "sse" as "sse" | "http",
    apiKey: "",
  });
  const [creating, setCreating] = useState(false);

  const loadServers = useCallback(async () => {
    try {
      const data = await listMcpServers();
      setServers(data);
    } catch {
      // API not available yet
      setServers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.serverUrl) return;
    setCreating(true);
    try {
      await createMcpServer({
        name: formData.name,
        serverUrl: formData.serverUrl,
        transportType: formData.transportType,
        apiKey: formData.apiKey || undefined,
      });
      setFormData({ name: "", serverUrl: "", transportType: "sse", apiKey: "" });
      setShowForm(false);
      loadServers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "서버 등록 실패");
    } finally {
      setCreating(false);
    }
  }

  const loadSamplingLogs = useCallback(async (serverId?: string) => {
    setLogsLoading(true);
    try {
      const data = await getMcpSamplingLog(serverId);
      setSamplingLogs(data.logs ?? []);
    } catch {
      setSamplingLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">로딩 중...</p>;

  return (
    <div className="space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 border-b border-border pb-2">
        {(["servers", "prompts", "sampling"] as McpSubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setSubTab(t);
              if (t === "sampling") loadSamplingLogs(selectedServer?.id);
            }}
            className={cn(
              "rounded-t px-3 py-1.5 text-xs font-medium transition-colors",
              subTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t === "servers" ? "Servers" : t === "prompts" ? "Prompts" : "Sampling Log"}
          </button>
        ))}
      </div>

      {/* Prompts sub-tab */}
      {subTab === "prompts" && (
        <div className="space-y-3">
          {servers.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">서버를 먼저 등록하세요.</p>
          ) : (
            <>
              <div className="flex gap-2">
                {servers.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant={selectedServer?.id === s.id ? "default" : "outline"}
                    onClick={() => setSelectedServer(s)}
                  >
                    {s.name}
                  </Button>
                ))}
              </div>
              {selectedServer && (
                <McpPromptsPanel serverId={selectedServer.id} serverName={selectedServer.name} />
              )}
            </>
          )}
        </div>
      )}

      {/* Sampling Log sub-tab */}
      {subTab === "sampling" && (
        <div className="space-y-3">
          {logsLoading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : samplingLogs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Sampling 이력이 없어요.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Model</th>
                    <th className="pb-2 pr-4">Tokens</th>
                    <th className="pb-2 pr-4">Duration</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {samplingLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-xs">{log.model}</td>
                      <td className="py-2 pr-4">{log.tokensUsed ?? "-"}/{log.maxTokens}</td>
                      <td className="py-2 pr-4">{log.durationMs ? `${log.durationMs}ms` : "-"}</td>
                      <td className="py-2 pr-4">
                        <span className={cn("rounded px-1.5 py-0.5 text-xs", log.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400")}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Servers sub-tab (existing content) */}
      {subTab === "servers" && <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          외부 MCP 서버를 등록하여 AI 에이전트를 연동해요.
        </p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "취소" : "서버 추가"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium">이름</label>
                <input
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My MCP Server"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium">Server URL</label>
                <input
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-sm font-mono"
                  value={formData.serverUrl}
                  onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
                  placeholder="https://mcp.example.com/sse"
                  type="url"
                  required
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium">Transport</label>
                  <select
                    className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-sm"
                    value={formData.transportType}
                    onChange={(e) => setFormData({ ...formData, transportType: e.target.value as "sse" | "http" })}
                  >
                    <option value="sse">SSE (권장)</option>
                    <option value="http">HTTP</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium">API Key (선택)</label>
                  <input
                    className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-sm"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    type="password"
                    placeholder="sk-..."
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={creating}>
                  {creating ? "등록 중..." : "등록"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {servers.length === 0 && !showForm ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          등록된 MCP 서버가 없어요. &quot;서버 추가&quot;를 클릭하여 시작하세요.
        </p>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => (
            <McpServerCard
              key={server.id}
              server={server}
              onDeleted={loadServers}
              onUpdated={loadServers}
            />
          ))}
        </div>
      )}
      </>}
    </div>
  );
}

export default function WorkspacePage() {
  const [tab, setTab] = useState<Tab>("todo");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Workspace</h1>

      <div className="mb-5 flex gap-2">
        {(["todo", "messages", "settings", "mcp"] as Tab[]).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t)}
          >
            {t === "todo" ? "ToDo" : t === "messages" ? "Messages" : t === "settings" ? "Settings" : "MCP Servers"}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {tab === "todo" && <TodoTab />}
          {tab === "messages" && <MessagesTab />}
          {tab === "settings" && <SettingsTab />}
          {tab === "mcp" && <McpServersTab />}
        </CardContent>
      </Card>
    </div>
  );
}
