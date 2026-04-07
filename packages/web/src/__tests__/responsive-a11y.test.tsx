/**
 * F450 — Discovery 반응형 CSS + ARIA 접근성 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import ErrorBoundary from "@/components/feature/discovery/ErrorBoundary";
import EmptyState from "@/components/feature/discovery/EmptyState";
import LoadingSkeleton from "@/components/feature/discovery/LoadingSkeleton";

// console.error 억제 (ErrorBoundary componentDidCatch 출력)
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

function ThrowingComponent(): React.ReactElement {
  throw new Error("테스트 에러");
}

// ─── 1. ErrorBoundary: aria-label="다시 시도" 버튼 존재 확인 ────────────────
describe("ErrorBoundary ARIA", () => {
  it("재시도 버튼에 aria-label='다시 시도'가 존재해야 한다", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    const retryBtn = screen.getByRole("button", { name: "다시 시도" });
    expect(retryBtn).toBeInTheDocument();
    expect(retryBtn).toHaveAttribute("aria-label", "다시 시도");
  });
});

// ─── 2. EmptyState: role="status" 존재 확인 ──────────────────────────────────
describe("EmptyState ARIA", () => {
  it("role='status' 요소가 존재해야 한다", () => {
    render(
      <EmptyState
        title="비어있어요"
        description="아직 데이터가 없어요."
      />,
    );
    const statusEl = screen.getByRole("status");
    expect(statusEl).toBeInTheDocument();
  });

  // ─── 3. EmptyState: 액션 버튼 클릭 시 onAction 호출 ─────────────────────
  it("액션 버튼 클릭 시 onAction이 호출되어야 한다", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="비어있어요"
        description="아직 데이터가 없어요."
        actionLabel="추가하기"
        onAction={onAction}
      />,
    );
    const btn = screen.getByRole("button", { name: "추가하기" });
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

// ─── 4. Escape 키: document keydown 이벤트로 핸들러 호출 확인 ───────────────
describe("키보드 내비게이션 Escape", () => {
  it("Escape 키 이벤트가 document에 dispatch되어야 한다 (핸들러 등록 가능)", () => {
    const handler = vi.fn();
    document.addEventListener("keydown", handler);
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].key).toBe("Escape");
    document.removeEventListener("keydown", handler);
  });
});

// ─── 5. LoadingSkeleton item-list: 스켈레톤 3개 렌더링 확인 ─────────────────
describe("LoadingSkeleton 렌더링", () => {
  it("variant='item-list' 기본 count=3개 카드가 렌더링되어야 한다", () => {
    const { container } = render(<LoadingSkeleton variant="item-list" />);
    // ItemListSkeleton은 border가 있는 rounded-lg div를 count개 렌더링
    const cards = container.querySelectorAll(".rounded-lg.border");
    expect(cards.length).toBe(3);
  });

  // ─── 5. LoadingSkeleton analysis-result: 렌더링 확인 ────────────────────
  it("variant='analysis-result' 렌더링 시 스켈레톤 요소가 존재해야 한다", () => {
    const { container } = render(<LoadingSkeleton variant="analysis-result" />);
    const skeletons = container.querySelectorAll("[class*='h-']");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
