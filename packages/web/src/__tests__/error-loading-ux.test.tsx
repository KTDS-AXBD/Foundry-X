/**
 * F449 — 에러/로딩 UX 공통 컴포넌트 테스트
 * ErrorBoundary, LoadingSkeleton, EmptyState, fetchWithRetry
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import ErrorBoundary from "@/components/feature/discovery/ErrorBoundary";
import LoadingSkeleton from "@/components/feature/discovery/LoadingSkeleton";
import EmptyState from "@/components/feature/discovery/EmptyState";
import { fetchWithRetry } from "@/lib/api-client-retry";
import { ApiError } from "@/lib/api-client";

// ─── 헬퍼: 항상 throw하는 컴포넌트 ───────────────────────────────────────
function ThrowingComponent({ message }: { message: string }): React.ReactElement {
  throw new Error(message);
}

// console.error 억제 (ErrorBoundary가 componentDidCatch에서 출력)
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
  vi.useRealTimers();
});

// ─── 1. ErrorBoundary ────────────────────────────────────────────────────
describe("ErrorBoundary", () => {
  it("자식이 throw 시 '데이터를 불러오지 못했어요' 텍스트 표시", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="테스트 에러" />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/데이터를 불러오지 못했어요/)).toBeInTheDocument();
  });

  it("재시도 버튼 클릭 시 onReset 호출", () => {
    const onReset = vi.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowingComponent message="에러" />
      </ErrorBoundary>,
    );
    const retryBtn = screen.getByRole("button", { name: "다시 시도" });
    fireEvent.click(retryBtn);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("상세 보기 토글 클릭 시 error.message 노출", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="상세 에러 메시지" />
      </ErrorBoundary>,
    );
    // 처음에는 숨김
    expect(screen.queryByText("상세 에러 메시지")).not.toBeInTheDocument();
    // 상세 보기 클릭
    fireEvent.click(screen.getByRole("button", { name: /상세 보기/ }));
    expect(screen.getByText("상세 에러 메시지")).toBeInTheDocument();
  });
});

// ─── 2. LoadingSkeleton ───────────────────────────────────────────────────
describe("LoadingSkeleton", () => {
  it("variant='item-list' 렌더링 (기본 3개)", () => {
    const { container } = render(<LoadingSkeleton variant="item-list" />);
    // 3개의 카드(border가 있는 div)
    const cards = container.querySelectorAll(".rounded-lg.border");
    expect(cards.length).toBe(3);
  });

  it("variant='analysis-result' 렌더링 — 탭 영역 포함", () => {
    const { container } = render(<LoadingSkeleton variant="analysis-result" />);
    // 최소 1개 이상의 Skeleton이 렌더링됨
    const skeletons = container.querySelectorAll("[class*='h-']");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

// ─── 3. EmptyState ────────────────────────────────────────────────────────
describe("EmptyState", () => {
  it("title, description, 버튼 렌더링", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="비어있어요"
        description="데이터가 없어요."
        actionLabel="추가하기"
        onAction={onAction}
      />,
    );
    expect(screen.getByText("비어있어요")).toBeInTheDocument();
    expect(screen.getByText("데이터가 없어요.")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "추가하기" });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

// ─── 4. fetchWithRetry ────────────────────────────────────────────────────
describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("첫 시도 성공 시 결과 반환", async () => {
    const fetcher = vi.fn().mockResolvedValue("ok");
    const result = await fetchWithRetry(fetcher, 3, 100);
    expect(result).toBe("ok");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("2회 실패 후 3회 성공 시 결과 반환", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce("success");

    const promise = fetchWithRetry(fetcher, 3, 100);
    // 1차 실패 → 100ms delay
    await vi.advanceTimersByTimeAsync(100);
    // 2차 실패 → 200ms delay
    await vi.advanceTimersByTimeAsync(200);
    // 3차 성공
    const result = await promise;
    expect(result).toBe("success");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("3회 모두 실패 시 throw", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("always fails"));

    // promise 먼저 attach 후 타이머 진행
    const promise = fetchWithRetry(fetcher, 3, 100);
    const caught = promise.catch((e) => e);

    await vi.advanceTimersByTimeAsync(100); // attempt 0→1 delay
    await vi.advanceTimersByTimeAsync(200); // attempt 1→2 delay

    const err = await caught;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe("always fails");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("4xx ApiError는 재시도 안 함", async () => {
    const fetcher = vi.fn().mockRejectedValue(new ApiError(404, "not found"));
    await expect(fetchWithRetry(fetcher, 3, 100)).rejects.toThrow("not found");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
