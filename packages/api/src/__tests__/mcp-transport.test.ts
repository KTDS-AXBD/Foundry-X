import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SseTransport,
  HttpTransport,
  McpTransportError,
  createTransport,
} from "../agent/services/mcp-transport.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ─── SseTransport ───

describe("SseTransport", () => {
  let transport: SseTransport;

  beforeEach(() => {
    transport = new SseTransport({
      serverUrl: "http://localhost:3001/sse",
      messageUrl: "http://localhost:3001/message",
      apiKey: "test-key",
    });
  });

  it("connect() parses endpoint event and extracts sessionId", async () => {
    const ssePayload = "event: endpoint\ndata: /message?sessionId=sess-abc123\n\n";
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(ssePayload));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    await transport.connect({});

    expect(transport.isConnected()).toBe(true);

    // Verify auth header was sent
    const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(options.headers["Authorization"]).toBe("Bearer test-key");
  });

  it("connect() throws on HTTP error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(transport.connect({})).rejects.toThrow(McpTransportError);
    await expect(transport.connect({})).rejects.toThrow("SSE connect error: 500");
  });

  it("connect() throws on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(transport.connect({})).rejects.toThrow(McpTransportError);
    await expect(transport.connect({})).rejects.toThrow("SSE connect failed");
  });

  it("send() posts JSON-RPC message with sessionId", async () => {
    // First connect
    const ssePayload = "event: endpoint\ndata: /message?sessionId=sess-xyz\n\n";
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(ssePayload));
        controller.close();
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, body: stream });
    await transport.connect({});

    // Then send
    const mockResponse = { jsonrpc: "2.0" as const, result: { tools: [] }, id: 1 };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await transport.send({
      jsonrpc: "2.0",
      method: "tools/list",
      id: 1,
    });

    expect(result).toEqual(mockResponse);

    const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe("http://localhost:3001/message?sessionId=sess-xyz");
    expect(options.method).toBe("POST");
    expect(options.headers["Authorization"]).toBe("Bearer test-key");
  });

  it("send() throws when not connected", async () => {
    await expect(
      transport.send({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
    ).rejects.toThrow("Not connected");
  });

  it("disconnect() resets connection state", async () => {
    // Connect first
    const ssePayload = "event: endpoint\ndata: /message?sessionId=sess-1\n\n";
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(ssePayload));
        controller.close();
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, body: stream });
    await transport.connect({});
    expect(transport.isConnected()).toBe(true);

    await transport.disconnect();
    expect(transport.isConnected()).toBe(false);
  });
});

// ─── HttpTransport ───

describe("HttpTransport", () => {
  let transport: HttpTransport;

  beforeEach(() => {
    transport = new HttpTransport({
      serverUrl: "http://localhost:3001/mcp",
      apiKey: "http-key",
    });
  });

  it("send() posts JSON-RPC and returns response", async () => {
    const mockResponse = {
      jsonrpc: "2.0" as const,
      result: { content: [{ type: "text", text: "hello" }] },
      id: 1,
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await transport.send({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "test_tool", arguments: {} },
      id: 1,
    });

    expect(result).toEqual(mockResponse);

    const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe("http://localhost:3001/mcp");
    expect(options.headers["Authorization"]).toBe("Bearer http-key");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("send() throws on HTTP error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    });

    await expect(
      transport.send({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
    ).rejects.toThrow("HTTP send error: 503");
  });

  it("isConnected() always returns true (stateless)", () => {
    expect(transport.isConnected()).toBe(true);
  });
});

// ─── createTransport factory ───

describe("createTransport", () => {
  it("creates SseTransport for type sse", () => {
    const t = createTransport("sse", {
      serverUrl: "http://localhost/sse",
      messageUrl: "http://localhost/message",
    });
    expect(t.type).toBe("sse");
  });

  it("creates HttpTransport for type http", () => {
    const t = createTransport("http", {
      serverUrl: "http://localhost/mcp",
    });
    expect(t.type).toBe("http");
  });

  it("throws for sse without messageUrl", () => {
    expect(() =>
      createTransport("sse", { serverUrl: "http://localhost/sse" }),
    ).toThrow("SSE transport requires messageUrl");
  });
});
