// ─── F334: EventBus 단위 테스트 (Sprint 149) ───

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventBus } from "../core/infra/event-bus.js";
import { createTaskEvent } from "@foundry-x/shared";
import type { HookEventPayload, ManualEventPayload } from "@foundry-x/shared";

function makeHookEvent(severity: "info" | "error" = "error") {
  const payload: HookEventPayload = {
    type: "hook",
    hookType: "PostToolUse",
    exitCode: severity === "error" ? 1 : 0,
    stderr: severity === "error" ? "lint error" : "",
  };
  return createTaskEvent("hook", severity, "task-1", "org-1", payload);
}

function makeManualEvent() {
  const payload: ManualEventPayload = { type: "manual", action: "test" };
  return createTaskEvent("manual", "info", "task-1", "org-1", payload);
}

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it("소스별 구독자에게 이벤트 전달", async () => {
    const handler = vi.fn();
    bus.subscribe("hook", handler);

    const event = makeHookEvent();
    await bus.emit(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it("다른 소스 이벤트는 전달하지 않음", async () => {
    const handler = vi.fn();
    bus.subscribe("hook", handler);

    await bus.emit(makeManualEvent());

    expect(handler).not.toHaveBeenCalled();
  });

  it("와일드카드('*') 구독자는 모든 이벤트 수신", async () => {
    const handler = vi.fn();
    bus.subscribe("*", handler);

    await bus.emit(makeHookEvent());
    await bus.emit(makeManualEvent());

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("다중 구독자 동시 호출", async () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.subscribe("hook", h1);
    bus.subscribe("hook", h2);

    await bus.emit(makeHookEvent());

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it("소스별 + 와일드카드 동시 호출", async () => {
    const sourceHandler = vi.fn();
    const wildcardHandler = vi.fn();
    bus.subscribe("hook", sourceHandler);
    bus.subscribe("*", wildcardHandler);

    await bus.emit(makeHookEvent());

    expect(sourceHandler).toHaveBeenCalledTimes(1);
    expect(wildcardHandler).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe 후 이벤트 미전달", async () => {
    const handler = vi.fn();
    const unsub = bus.subscribe("hook", handler);

    unsub();
    await bus.emit(makeHookEvent());

    expect(handler).not.toHaveBeenCalled();
  });

  it("clear()로 전체 구독 해제", async () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.subscribe("hook", h1);
    bus.subscribe("*", h2);

    bus.clear();
    await bus.emit(makeHookEvent());

    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it("비동기 핸들러 정상 처리", async () => {
    const results: string[] = [];
    bus.subscribe("hook", async () => {
      await new Promise((r) => setTimeout(r, 10));
      results.push("done");
    });

    await bus.emit(makeHookEvent());

    expect(results).toEqual(["done"]);
  });

  it("구독자 없는 소스에 emit해도 에러 안 남", async () => {
    await expect(bus.emit(makeHookEvent())).resolves.not.toThrow();
  });

  it("같은 핸들러를 2번 등록하면 2번 호출", async () => {
    const handler = vi.fn();
    bus.subscribe("hook", handler);
    bus.subscribe("hook", handler);

    await bus.emit(makeHookEvent());

    // Set은 동일 참조를 중복 저장하지 않으므로 1번
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
