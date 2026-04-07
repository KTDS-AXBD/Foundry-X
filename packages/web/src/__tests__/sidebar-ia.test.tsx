// ─── F398: 사이드바 IA 개편 테스트 (Sprint 185) ───
// SSOT: content/navigation/sidebar.json (CMS-driven)

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const sidebarJsonPath = resolve(process.cwd(), "content/navigation/sidebar.json");
const sidebarJson = JSON.parse(readFileSync(sidebarJsonPath, "utf-8"));

describe("사이드바 IA 개편 — 이관 예정 라벨", () => {
  it("'이관 예정' badge가 2개 이상 존재 (수집 + GTM)", () => {
    const groupsWithBadge = sidebarJson.processGroups.filter(
      (g: { badge?: string }) => g.badge === "이관 예정",
    );
    expect(groupsWithBadge.length).toBeGreaterThanOrEqual(2);
  });

  it("collect 그룹에 이관 예정 라벨 (TBD 없음)", () => {
    const collect = sidebarJson.processGroups.find(
      (g: { key: string }) => g.key === "collect",
    );
    expect(collect).toBeDefined();
    expect(collect.badge).toBe("이관 예정");
  });
});

describe("사이드바 IA 개편 — 서비스 경계 그룹", () => {
  const adminKeys = (sidebarJson.adminGroups ?? []).map((g: { key: string }) => g.key);

  it("admin-auth 그룹 존재", () => {
    expect(adminKeys).toContain("admin-auth");
  });

  it("admin-portal 그룹 존재", () => {
    expect(adminKeys).toContain("admin-portal");
  });

  it("admin-gate 그룹 존재", () => {
    expect(adminKeys).toContain("admin-gate");
  });

  it("admin-launch 그룹 존재", () => {
    expect(adminKeys).toContain("admin-launch");
  });

  it("admin-core 그룹 존재", () => {
    expect(adminKeys).toContain("admin-core");
  });

  it("CMS sidebar.json을 SSOT로 사용", () => {
    expect(sidebarJson.navId).toBe("main-sidebar");
  });
});

describe("이벤트 카탈로그 — 8종 타입", () => {
  const catalogPath = resolve(process.cwd(), "../../packages/shared/src/events/catalog.ts");

  it("catalog.ts 파일 존재", () => {
    let content = "";
    try {
      content = readFileSync(catalogPath, "utf-8");
    } catch {
      // shared가 다른 경로일 수 있음
      const altPath = resolve(process.cwd(), "../shared/src/events/catalog.ts");
      content = readFileSync(altPath, "utf-8");
    }
    expect(content).toContain("BizItemCreatedEvent");
    expect(content).toContain("BizItemUpdatedEvent");
    expect(content).toContain("BizItemStageChangedEvent");
    expect(content).toContain("ValidationCompletedEvent");
    expect(content).toContain("ValidationRejectedEvent");
    expect(content).toContain("OfferingGeneratedEvent");
    expect(content).toContain("PrototypeCreatedEvent");
    expect(content).toContain("PipelineStepCompletedEvent");
  });
});
