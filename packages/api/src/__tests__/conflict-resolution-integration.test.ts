import { describe, it, expect, vi } from "vitest";
import { ConflictDetector } from "../services/conflict-detector.js";
import type { ExistingSpec } from "../services/conflict-detector.js";

const makeExistingSpec = (overrides: Partial<ExistingSpec> = {}): ExistingSpec => ({
  id: "F10",
  title: "사용자 인증 시스템",
  description: "JWT 기반 사용자 인증 및 권한 관리",
  category: "feature",
  priority: "P1",
  dependencies: [],
  status: "planned",
  ...overrides,
});

describe("ConflictDetector integration", () => {
  it("generate → detect → conflicts 포함 응답", async () => {
    const detector = new ConflictDetector();

    const existingSpecs = [
      makeExistingSpec({ id: "F10", title: "사용자 인증 시스템 구현" }),
      makeExistingSpec({ id: "F11", title: "결제 시스템 구현" }),
    ];

    const newSpec = {
      title: "사용자 인증 시스템 개선",
      description: "기존 인증 시스템을 개선하여 보안성을 높입니다",
      priority: "P1",
      dependencies: [],
    };

    const conflicts = await detector.detect(newSpec, existingSpecs);

    expect(conflicts.length).toBeGreaterThanOrEqual(1);

    const directConflict = conflicts.find((c) => c.type === "direct");
    expect(directConflict).toBeDefined();
    expect(directConflict!.existingSpec.id).toBe("F10");
    expect(directConflict!.severity).toMatch(/critical|warning/);
    expect(directConflict!.description).toBeTruthy();
    expect(directConflict!.suggestion).toBeTruthy();
  });

  it("resolve(accept) → 정상 반환", async () => {
    const detector = new ConflictDetector();

    const existingSpecs = [
      makeExistingSpec({ id: "F20", title: "대시보드 UI 구현" }),
    ];

    const newSpec = {
      title: "대시보드 UI 리팩토링",
      description: "대시보드 UI를 리팩토링합니다",
      priority: "P2",
      dependencies: [],
    };

    const conflicts = await detector.detect(newSpec, existingSpecs);
    expect(conflicts.length).toBeGreaterThanOrEqual(1);

    // Simulate accept resolution
    const resolved = conflicts.map((c) => ({
      ...c,
      resolution: "accept" as const,
    }));

    expect(resolved[0]!.resolution).toBe("accept");
    expect(resolved[0]!.type).toBeDefined();
    expect(resolved[0]!.existingSpec.id).toBe("F20");
  });

  it("resolve(reject) → 정상 반환", async () => {
    const detector = new ConflictDetector();

    const existingSpecs = [
      makeExistingSpec({
        id: "F30",
        title: "에이전트 오케스트레이션",
        priority: "P0",
        status: "in_progress",
      }),
    ];

    const newSpec = {
      title: "에이전트 병렬 실행 엔진",
      description: "에이전트를 병렬로 실행하는 엔진입니다",
      priority: "P0",
      dependencies: [],
    };

    const conflicts = await detector.detect(newSpec, existingSpecs);
    expect(conflicts.length).toBeGreaterThanOrEqual(1);

    // Simulate reject resolution
    const resolved = conflicts.map((c) => ({
      ...c,
      resolution: "reject" as const,
    }));

    expect(resolved[0]!.resolution).toBe("reject");
    // Priority conflict should be detected for dual P0
    const priorityConflict = conflicts.find((c) => c.type === "priority");
    expect(priorityConflict).toBeDefined();
    expect(priorityConflict!.severity).toBe("critical");
  });

  it("충돌 0건 → 빈 배열", async () => {
    const detector = new ConflictDetector();

    const existingSpecs = [
      makeExistingSpec({ id: "F1", title: "사용자 인증" }),
      makeExistingSpec({ id: "F2", title: "결제 시스템" }),
    ];

    const newSpec = {
      title: "이메일 알림 서비스 구축",
      description: "사용자에게 이메일로 알림을 보내는 마이크로서비스를 구축합니다",
      priority: "P3",
      dependencies: [],
    };

    const conflicts = await detector.detect(newSpec, existingSpecs);
    expect(conflicts).toEqual([]);
  });
});
