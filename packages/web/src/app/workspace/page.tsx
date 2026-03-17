"use client";

import { useState, useEffect, useCallback } from "react";
import type { TodoItem, Message } from "@foundry-x/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Settings {
  theme: "dark" | "light";
  notifications: boolean;
}

type Tab = "todo" | "messages" | "settings";

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

export default function WorkspacePage() {
  const [tab, setTab] = useState<Tab>("todo");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Workspace</h1>

      <div className="mb-5 flex gap-2">
        {(["todo", "messages", "settings"] as Tab[]).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t)}
          >
            {t === "todo" ? "ToDo" : t === "messages" ? "Messages" : "Settings"}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {tab === "todo" && <TodoTab />}
          {tab === "messages" && <MessagesTab />}
          {tab === "settings" && <SettingsTab />}
        </CardContent>
      </Card>
    </div>
  );
}
