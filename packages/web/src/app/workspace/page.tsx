"use client";

import { useState, useEffect, useCallback } from "react";
import type { TodoItem, Message } from "@foundry-x/shared";

/* ─── Styles ─── */
const colors = {
  bg: "#0a0a0a",
  text: "#ededed",
  card: "#1a1a1a",
  border: "#333",
  accent: "#3b82f6",
  muted: "#888",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

const cardStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: 24,
};

/* ─── Types ─── */
interface Settings {
  theme: "dark" | "light";
  notifications: boolean;
}

type Tab = "todo" | "messages" | "settings";

/* ─── LocalStorage helpers ─── */
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

/* ─── Tab Button ─── */
function TabBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 20px",
        background: active ? colors.accent : "transparent",
        color: active ? "#fff" : colors.muted,
        border: `1px solid ${active ? colors.accent : colors.border}`,
        borderRadius: 6,
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
        fontSize: 14,
      }}
    >
      {label}
    </button>
  );
}

/* ─── ToDo Tab ─── */
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

  if (!loaded) return <p style={{ color: colors.muted }}>Loading...</p>;

  return (
    <div>
      {/* Add form */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a todo..."
          style={{
            flex: 1,
            padding: "8px 12px",
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          onClick={add}
          style={{
            padding: "8px 16px",
            background: colors.accent,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Add
        </button>
      </div>

      {/* List */}
      {todos.length === 0 ? (
        <p style={{ color: colors.muted, fontSize: 13 }}>No todos yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {todos.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t.id)}
                style={{ accentColor: colors.accent, width: 16, height: 16 }}
              />
              <span
                style={{
                  flex: 1,
                  color: t.done ? colors.muted : colors.text,
                  textDecoration: t.done ? "line-through" : "none",
                  fontSize: 14,
                }}
              >
                {t.text}
              </span>
              <button
                onClick={() => remove(t.id)}
                style={{
                  background: "transparent",
                  color: colors.red,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: "2px 6px",
                }}
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: colors.muted }}>
        {todos.filter((t) => t.done).length}/{todos.length} completed
      </div>
    </div>
  );
}

/* ─── Messages Tab ─── */
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

  if (!loaded) return <p style={{ color: colors.muted }}>Loading...</p>;

  return (
    <div>
      {/* Message list */}
      <div
        style={{
          maxHeight: 360,
          overflowY: "auto",
          marginBottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: colors.muted, fontSize: 13 }}>No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                padding: "10px 14px",
                background: colors.bg,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={{ fontWeight: 600, color: colors.accent, fontSize: 13 }}>
                  {m.from}
                </span>
                <span style={{ fontSize: 11, color: colors.muted }}>{m.sentAt}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: colors.text }}>{m.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "8px 12px",
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          onClick={send}
          style={{
            padding: "8px 16px",
            background: colors.accent,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

/* ─── Settings Tab ─── */
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

  if (!loaded) return <p style={{ color: colors.muted }}>Loading...</p>;

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    width: 44,
    height: 24,
    borderRadius: 12,
    background: active ? colors.accent : colors.border,
    position: "relative",
    cursor: "pointer",
    border: "none",
    transition: "background 0.2s",
  });

  const knobStyle = (active: boolean): React.CSSProperties => ({
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#fff",
    position: "absolute",
    top: 3,
    left: active ? 22 : 4,
    transition: "left 0.2s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Theme */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 0",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: colors.text }}>
            Theme
          </div>
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
            Currently: {settings.theme === "dark" ? "Dark" : "Light"}
          </div>
        </div>
        <button
          onClick={() =>
            update({ theme: settings.theme === "dark" ? "light" : "dark" })
          }
          style={toggleStyle(settings.theme === "dark")}
        >
          <div style={knobStyle(settings.theme === "dark")} />
        </button>
      </div>

      {/* Notifications */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 0",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: colors.text }}>
            Notifications
          </div>
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
            {settings.notifications ? "Enabled" : "Disabled"}
          </div>
        </div>
        <button
          onClick={() => update({ notifications: !settings.notifications })}
          style={toggleStyle(settings.notifications)}
        >
          <div style={knobStyle(settings.notifications)} />
        </button>
      </div>
    </div>
  );
}

/* ─── Workspace Page ─── */
export default function WorkspacePage() {
  const [tab, setTab] = useState<Tab>("todo");

  return (
    <div style={{ color: colors.text }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        Workspace
      </h1>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <TabBtn label="ToDo" active={tab === "todo"} onClick={() => setTab("todo")} />
        <TabBtn
          label="Messages"
          active={tab === "messages"}
          onClick={() => setTab("messages")}
        />
        <TabBtn
          label="Settings"
          active={tab === "settings"}
          onClick={() => setTab("settings")}
        />
      </div>

      {/* Tab content */}
      <div style={cardStyle}>
        {tab === "todo" && <TodoTab />}
        {tab === "messages" && <MessagesTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
