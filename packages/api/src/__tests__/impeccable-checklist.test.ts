import { describe, it, expect } from "vitest";
import {
  getDiscriminatorChecklist,
  getDomainChecklistMap,
  IMPECCABLE_DOMAINS,
} from "../data/impeccable-reference.js";

describe("impeccable → Discriminator 체크리스트 정합성 (F464)", () => {
  it("7도메인 전체에서 체크리스트를 도출한다", () => {
    const checklist = getDiscriminatorChecklist();
    expect(checklist.length).toBeGreaterThanOrEqual(20);
  });

  it("도메인별 최소 2개 항목이 존재한다", () => {
    const map = getDomainChecklistMap();
    const domains = Object.keys(IMPECCABLE_DOMAINS);
    for (const domain of domains) {
      expect(map[domain]?.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("모든 체크리스트 항목이 비어있지 않다", () => {
    const checklist = getDiscriminatorChecklist();
    for (const item of checklist) {
      expect(item.trim().length).toBeGreaterThan(0);
    }
  });

  it("getDomainChecklistMap의 전체 항목 수와 getDiscriminatorChecklist가 일치한다", () => {
    const map = getDomainChecklistMap();
    const total = Object.values(map).reduce((sum, items) => sum + items.length, 0);
    expect(getDiscriminatorChecklist().length).toBe(total);
  });
});
