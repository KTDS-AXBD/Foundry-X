/**
 * F519 Red Phase — TodoSection NEXT_ACTIONS 링크 검증
 * 목표: stage 2 아이템의 다음 액션 href가 /discovery/items 이어야 한다
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// fetchApi mock
vi.mock("@/lib/api-client", () => ({
  fetchApi: vi.fn(),
}));

import { fetchApi } from "@/lib/api-client";
import { TodoSection } from "@/components/feature/TodoSection";

describe("F519 TodoSection — NEXT_ACTIONS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stage 2 아이템의 다음 액션 링크가 /discovery/items를 가리킨다", async () => {
    vi.mocked(fetchApi).mockResolvedValue({
      items: [
        { bizItemId: "biz-1", title: "테스트 아이템", currentStage: 2 },
      ],
    });

    render(
      <MemoryRouter>
        <TodoSection />
      </MemoryRouter>,
    );

    // 비동기 렌더링 대기
    const link = await screen.findByRole("link", { name: /평가 실행/ });
    expect(link).toBeTruthy();
    // href 검증: /discovery/items이어야 하고 ?tab=process가 없어야 함
    const href = link.getAttribute("href");
    expect(href).toContain("/discovery/items");
    expect(href).not.toContain("?tab=process");
  });

  it("stage 3 아이템의 다음 액션 링크가 /shaping/business-plan을 가리킨다", async () => {
    vi.mocked(fetchApi).mockResolvedValue({
      items: [
        { bizItemId: "biz-2", title: "형상화 아이템", currentStage: 3 },
      ],
    });

    render(
      <MemoryRouter>
        <TodoSection />
      </MemoryRouter>,
    );

    const link = await screen.findByRole("link", { name: /사업기획서 작성/ });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toContain("/shaping/business-plan");
  });
});
