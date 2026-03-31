import { create } from "zustand";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isLocal?: boolean;
  createdAt: string;
}

interface HelpAgentState {
  messages: Message[];
  isStreaming: boolean;
  isOpen: boolean;
  conversationId: string;
  sendMessage: (msg: string, bizItemId?: string, stage?: string) => Promise<void>;
  loadHistory: (conversationId: string) => Promise<void>;
  toggle: () => void;
  reset: () => void;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const useHelpAgentStore = create<HelpAgentState>((set, get) => ({
  messages: [],
  isStreaming: false,
  isOpen: false,
  conversationId: generateId(),

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  reset: () =>
    set({ messages: [], isStreaming: false, conversationId: generateId() }),

  loadHistory: async (conversationId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch(
      `${BASE_URL}/help-agent/history?conversationId=${conversationId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return;

    const data = await res.json();
    set({
      messages: data.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        isLocal: m.isLocalResponse,
        createdAt: m.createdAt,
      })),
      conversationId,
    });
  },

  sendMessage: async (msg: string, bizItemId?: string, stage?: string) => {
    const { conversationId } = get();
    const token = localStorage.getItem("token");
    if (!token) return;

    // Add user message optimistically
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: msg,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMsg], isStreaming: true }));

    try {
      const res = await fetch(`${BASE_URL}/help-agent/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: msg,
          conversationId,
          bizItemId,
          stage,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const contentType = res.headers.get("Content-Type") || "";

      if (contentType.includes("application/json")) {
        // Local response
        const data = await res.json();
        const assistantMsg: Message = {
          id: generateId(),
          role: "assistant",
          content: data.content,
          isLocal: true,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          messages: [...s.messages, assistantMsg],
          isStreaming: false,
        }));
      } else {
        // SSE stream response
        const reader = res.body?.getReader();
        if (!reader) {
          set({ isStreaming: false });
          return;
        }

        const decoder = new TextDecoder();
        let assistantContent = "";
        const assistantId = generateId();

        // Add empty assistant message
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id: assistantId,
              role: "assistant" as const,
              content: "",
              createdAt: new Date().toISOString(),
            },
          ],
        }));

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantContent += delta;
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: assistantContent }
                      : m,
                  ),
                }));
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        set({ isStreaming: false });
      }
    } catch (error) {
      const errorMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: "죄송해요, 응답을 가져오는 데 문제가 생겼어요. 다시 시도해 주세요.",
        createdAt: new Date().toISOString(),
      };
      set((s) => ({
        messages: [...s.messages, errorMsg],
        isStreaming: false,
      }));
    }
  },
}));
