// ─── F398: 사이드바 IA 개편 테스트 (Sprint 185) ───

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const sidebarPath = resolve(process.cwd(), "src/components/sidebar.tsx");
const sidebarContent = readFileSync(sidebarPath, "utf-8");

describe("사이드바 IA 개편 — 이관 예정 라벨", () => {
  it("'이관 예정' badge가 2개 이상 존재 (수집 + GTM)", () => {
    const matches = sidebarContent.match(/badge:\s*["']이관 예정["']/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("collect 그룹에 이관 예정 라벨 (TBD 없음)", () => {
    expect(sidebarContent).not.toMatch(/key:\s*["']collect["'][^}]*badge:\s*["']TBD["']/s);
  });
});

describe("사이드바 IA 개편 — 서비스 경계 그룹", () => {
  it("admin-auth 그룹 존재", () => {
    expect(sidebarContent).toContain('"admin-auth"');
  });

  it("admin-portal 그룹 존재", () => {
    expect(sidebarContent).toContain('"admin-portal"');
  });

  it("admin-gate 그룹 존재", () => {
    expect(sidebarContent).toContain('"admin-gate"');
  });

  it("admin-launch 그룹 존재", () => {
    expect(sidebarContent).toContain('"admin-launch"');
  });

  it("admin-core 그룹 존재", () => {
    expect(sidebarContent).toContain('"admin-core"');
  });

  it("DEFAULT_ADMIN_GROUPS 배열 사용", () => {
    expect(sidebarContent).toContain("DEFAULT_ADMIN_GROUPS");
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
