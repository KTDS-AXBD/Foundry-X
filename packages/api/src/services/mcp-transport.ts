import type {
  McpTransport,
  McpConnectionConfig,
  McpMessage,
  McpResponse,
} from "./mcp-adapter.js";

// ─── Error ───

export class McpTransportError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "McpTransportError";
  }
}

// ─── SSE Transport ───

interface SseTransportOptions {
  serverUrl: string;
  messageUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class SseTransport implements McpTransport {
  readonly type = "sse" as const;

  private readonly serverUrl: string;
  private readonly messageUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  private sessionId: string | null = null;
  private connected = false;

  constructor(options: SseTransportOptions) {
    this.serverUrl = options.serverUrl;
    this.messageUrl = options.messageUrl;
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 25_000;
  }

  async connect(_config: McpConnectionConfig): Promise<void> {
    const headers: Record<string, string> = {
      Accept: "text/event-stream",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    let res: Response;
    try {
      res = await fetch(this.serverUrl, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new McpTransportError(
        `SSE connect failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    if (!res.ok) {
      throw new McpTransportError(
        `SSE connect error: ${res.status} ${res.statusText}`,
      );
    }

    // Parse SSE stream to extract endpoint event containing sessionId
    const body = res.body;
    if (!body) {
      throw new McpTransportError("SSE response has no body");
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:") && eventType === "endpoint") {
            const data = line.slice(5).trim();
            // data is the endpoint path like "/message?sessionId=xxx"
            const url = new URL(data, this.serverUrl);
            this.sessionId = url.searchParams.get("sessionId");
            this.connected = true;
            reader.cancel();
            return;
          }
        }
      }
    } catch (err) {
      // reader.cancel() may throw — ignore if already connected
      if (!this.connected) {
        throw new McpTransportError(
          `SSE stream parse failed: ${err instanceof Error ? err.message : String(err)}`,
          err,
        );
      }
    }

    if (!this.connected) {
      throw new McpTransportError("SSE stream ended without endpoint event");
    }
  }

  async send(message: McpMessage): Promise<McpResponse> {
    if (!this.connected || !this.sessionId) {
      throw new McpTransportError("Not connected — call connect() first");
    }

    const url = `${this.messageUrl}?sessionId=${encodeURIComponent(this.sessionId)}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new McpTransportError(
        `SSE send failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    if (!res.ok) {
      throw new McpTransportError(
        `SSE send error: ${res.status} ${res.statusText}`,
      );
    }

    return (await res.json()) as McpResponse;
  }

  async disconnect(): Promise<void> {
    this.sessionId = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// ─── HTTP Transport ───

interface HttpTransportOptions {
  serverUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class HttpTransport implements McpTransport {
  readonly type = "http" as const;

  private readonly serverUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(options: HttpTransportOptions) {
    this.serverUrl = options.serverUrl;
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 25_000;
  }

  async connect(_config: McpConnectionConfig): Promise<void> {
    // HTTP transport is stateless — no-op
  }

  async disconnect(): Promise<void> {
    // HTTP transport is stateless — no-op
  }

  isConnected(): boolean {
    return true;
  }

  async send(message: McpMessage): Promise<McpResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    let res: Response;
    try {
      res = await fetch(this.serverUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new McpTransportError(
        `HTTP send failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    if (!res.ok) {
      throw new McpTransportError(
        `HTTP send error: ${res.status} ${res.statusText}`,
      );
    }

    return (await res.json()) as McpResponse;
  }
}

// ─── Factory ───

export function createTransport(
  type: "sse" | "http",
  config: {
    serverUrl: string;
    messageUrl?: string;
    apiKey?: string;
    timeoutMs?: number;
  },
): McpTransport {
  if (type === "sse") {
    if (!config.messageUrl) {
      throw new McpTransportError(
        "SSE transport requires messageUrl",
      );
    }
    return new SseTransport({
      serverUrl: config.serverUrl,
      messageUrl: config.messageUrl,
      apiKey: config.apiKey,
      timeoutMs: config.timeoutMs,
    });
  }

  return new HttpTransport({
    serverUrl: config.serverUrl,
    apiKey: config.apiKey,
    timeoutMs: config.timeoutMs,
  });
}
