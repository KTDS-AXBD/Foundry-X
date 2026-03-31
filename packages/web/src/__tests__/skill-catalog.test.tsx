import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import SkillCatalog from "../components/feature/ax-bd/SkillCatalog";
import { BD_SKILLS } from "../data/bd-skills";

// SkillDetailSheet uses Sheet from @axis-ds/ui-react which needs portal
// Wrap in MemoryRouter is not needed since no routing in component

describe("SkillCatalog", () => {
  it("renders header with total count", () => {
    const { getByText } = render(<SkillCatalog />);
    expect(getByText("BD 스킬 카탈로그")).toBeDefined();
    expect(getByText(new RegExp(`${BD_SKILLS.length}개 스킬`))).toBeDefined();
  });

  it("renders search input", () => {
    const { getByPlaceholderText } = render(<SkillCatalog />);
    expect(getByPlaceholderText(/스킬 검색/)).toBeDefined();
  });

  it("renders category filter badges", () => {
    const { getAllByText } = render(<SkillCatalog />);
    // Category labels appear in filter badges and on cards, so multiple matches
    expect(getAllByText(/PM Skills/).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/AI Biz/).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/경영전략/).length).toBeGreaterThanOrEqual(1);
  });

  it("filters by search query", () => {
    const { getByPlaceholderText, getByText } = render(<SkillCatalog />);
    const input = getByPlaceholderText(/스킬 검색/);
    fireEvent.change(input, { target: { value: "생태계" } });
    expect(getByText("AI 생태계 맵핑")).toBeDefined();
    expect(getByText(/필터 적용중/)).toBeDefined();
  });

  it("filters by category", () => {
    const { getAllByText, getByText } = render(<SkillCatalog />);
    // Click first AI Biz badge (the filter one)
    const aiBizBadges = getAllByText(/AI Biz/);
    fireEvent.click(aiBizBadges[0]);
    expect(getByText(/필터 적용중/)).toBeDefined();
  });

  it("renders skill cards", () => {
    const { getByText } = render(<SkillCatalog />);
    expect(getByText("AI 생태계 맵핑")).toBeDefined();
    expect(getByText("AI 경쟁 해자 분석")).toBeDefined();
  });
});
