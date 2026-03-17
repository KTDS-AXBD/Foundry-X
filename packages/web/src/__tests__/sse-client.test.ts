import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SSEClient } from "../lib/sse-client";

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  listeners: Record<string, ((e: any) => void)[]> = {};
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    // Simulate open event asynchronously
    setTimeout(() => this.emit("open", {}), 0);
  }

  addEventListener(event: string, handler: (e: any) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  close() {
    this.closed = true;
  }

  emit(event: string, data: any) {
    for (const handler of this.listeners[event] ?? []) {
      handler(data);
    }
  }
}

describe("SSEClient", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("connects and receives activity events", async () => {
    const onActivity = vi.fn();
    const client = new SSEClient({
      url: "/api/agents/stream",
      onActivity,
    });

    client.connect();

    const es = MockEventSource.instances[0];
    expect(es).toBeDefined();
    expect(es.url).toBe("/api/agents/stream");

    // Simulate activity event
    es.emit("activity", { data: JSON.stringify({ agentId: "test", status: "running" }) });
    expect(onActivity).toHaveBeenCalledWith({ agentId: "test", status: "running" });

    client.disconnect();
    expect(es.closed).toBe(true);
  });

  it("handles status and sync events", () => {
    const onStatus = vi.fn();
    const onSync = vi.fn();
    const client = new SSEClient({
      url: "/test",
      onStatus,
      onSync,
    });

    client.connect();
    const es = MockEventSource.instances[0];

    es.emit("status", { data: JSON.stringify({ connected: true }) });
    es.emit("sync", { data: JSON.stringify({ synced: 3 }) });

    expect(onStatus).toHaveBeenCalledWith({ connected: true });
    expect(onSync).toHaveBeenCalledWith({ synced: 3 });

    client.disconnect();
  });

  it("ignores malformed event data", () => {
    const onActivity = vi.fn();
    const client = new SSEClient({
      url: "/test",
      onActivity,
    });

    client.connect();
    const es = MockEventSource.instances[0];

    // Send malformed data — should not throw or call handler
    es.emit("activity", { data: "not json{{{" });
    expect(onActivity).not.toHaveBeenCalled();

    client.disconnect();
  });

  it("does not reconnect after disconnect", async () => {
    vi.useFakeTimers();

    const client = new SSEClient({
      url: "/test",
      maxRetries: 3,
      retryInterval: 100,
    });

    client.connect();
    client.disconnect();

    const es = MockEventSource.instances[0];
    // Trigger error — should NOT attempt reconnect
    es.emit("error", new Event("error"));

    vi.advanceTimersByTime(500);
    expect(MockEventSource.instances).toHaveLength(1); // No new instances

    vi.useRealTimers();
  });
});
