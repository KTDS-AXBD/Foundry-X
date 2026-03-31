import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SkillExecutionForm from "../components/feature/ax-bd/SkillExecutionForm";
import type { BdSkill } from "../data/bd-skills";

// Mock api-client
vi.mock("@/lib/api-client", () => ({
  postApi: vi.fn(),
  fetchApi: vi.fn(),
  BASE_URL: "/api",
}));

const mockSkill: BdSkill = {
  id: "ai-biz:ecosystem-map",
  name: "AI 생태계 맵핑",
  category: "ai-biz",
  description: "밸류체인, 경쟁구도, 보완재 등 AI 생태계 시각화",
  input: "산업/도메인명, 핵심 플레이어",
  output: "AI 생태계 맵 + 기회 포인트",
  stages: ["2-1", "2-3"],
  type: "skill",
};

describe("SkillExecutionForm", () => {
  it("renders execution form with placeholder", () => {
    const { getByPlaceholderText, getByText } = render(
      <SkillExecutionForm skill={mockSkill} bizItemId="biz1" stageId="2-1" />,
    );
    expect(getByPlaceholderText("산업/도메인명, 핵심 플레이어")).toBeDefined();
    expect(getByText("실행하기")).toBeDefined();
  });

  it("disables execute button when input is empty", () => {
    const { getByText } = render(
      <SkillExecutionForm skill={mockSkill} bizItemId="biz1" stageId="2-1" />,
    );
    const button = getByText("실행하기");
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("enables execute button when input has text", () => {
    const { getByPlaceholderText, getByText } = render(
      <SkillExecutionForm skill={mockSkill} bizItemId="biz1" stageId="2-1" />,
    );
    const textarea = getByPlaceholderText("산업/도메인명, 핵심 플레이어");
    fireEvent.change(textarea, { target: { value: "AI 챗봇 시장 분석" } });
    const button = getByText("실행하기");
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows completed result after execution", async () => {
    const { postApi } = await import("@/lib/api-client");
    (postApi as any).mockResolvedValue({
      artifactId: "art_001",
      skillId: "ai-biz:ecosystem-map",
      version: 1,
      outputText: "## Ecosystem Map\nResult...",
      model: "claude-haiku-4-5-20250714",
      tokensUsed: 300,
      durationMs: 2500,
      status: "completed",
    });

    const { getByPlaceholderText, getByText } = render(
      <SkillExecutionForm skill={mockSkill} bizItemId="biz1" stageId="2-1" />,
    );

    fireEvent.change(getByPlaceholderText("산업/도메인명, 핵심 플레이어"), {
      target: { value: "AI 챗봇 시장" },
    });
    fireEvent.click(getByText("실행하기"));

    await waitFor(() => {
      expect(getByText("완료")).toBeDefined();
      expect(getByText(/300 토큰/)).toBeDefined();
    });
  });

  it("shows error state when execution fails", async () => {
    const { postApi } = await import("@/lib/api-client");
    (postApi as any).mockRejectedValue(new Error("API 키가 설정되지 않았어요"));

    const { getByPlaceholderText, getByText } = render(
      <SkillExecutionForm skill={mockSkill} bizItemId="biz1" stageId="2-1" />,
    );

    fireEvent.change(getByPlaceholderText("산업/도메인명, 핵심 플레이어"), {
      target: { value: "test" },
    });
    fireEvent.click(getByText("실행하기"));

    await waitFor(() => {
      expect(getByText(/API 키가 설정되지 않았어요/)).toBeDefined();
    });
  });
});

describe("ArtifactList", () => {
  it("shows empty state when no artifacts", async () => {
    const { fetchApi } = await import("@/lib/api-client");
    (fetchApi as any).mockResolvedValue({ items: [], total: 0 });

    const ArtifactList = (await import("../components/feature/ax-bd/ArtifactList")).default;
    const { findByText } = render(
      <MemoryRouter>
        <ArtifactList />
      </MemoryRouter>,
    );

    expect(await findByText(/산출물이 없어요/)).toBeDefined();
  });
});
