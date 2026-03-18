import { describe, it, expect, vi, afterEach } from "vitest";
import { ConflictDetector } from "../../services/conflict-detector.js";
import type { ExistingSpec } from "../../services/conflict-detector.js";
import { createMockD1 } from "../helpers/mock-d1.js";

describe("ConflictDetector", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const makeExistingSpec = (overrides: Partial<ExistingSpec> = {}): ExistingSpec => ({
    id: "F1",
    title: "사용자 인증 시스템",
    description: "JWT 기반 사용자 인증 및 권한 관리",
    category: "feature",
    priority: "P1",
    dependencies: [],
    status: "planned",
    ...overrides,
  });

  describe("detect()", () => {
    it("유사 제목 → direct conflict를 감지해요", async () => {
      const detector = new ConflictDetector();
      const existing = [makeExistingSpec({ title: "사용자 인증 시스템 구현" })];

      const conflicts = await detector.detect(
        {
          title: "사용자 인증 시스템 개선",
          description: "기존 인증 시스템을 개선합니다",
          priority: "P1",
          dependencies: [],
        },
        existing,
      );

      expect(conflicts.length).toBeGreaterThanOrEqual(1);
      const direct = conflicts.find((c) => c.type === "direct");
      expect(direct).toBeDefined();
      expect(direct!.existingSpec.id).toBe("F1");
    });

    it("의존성 교차 → dependency conflict를 감지해요", async () => {
      const detector = new ConflictDetector();
      const existing = [
        makeExistingSpec({
          id: "F2",
          title: "결제 시스템",
          dependencies: ["사용자 인증", "데이터베이스"],
        }),
      ];

      const conflicts = await detector.detect(
        {
          title: "주문 처리 시스템",
          description: "주문을 처리하는 시스템",
          priority: "P1",
          dependencies: ["사용자 인증", "알림 서비스"],
        },
        existing,
      );

      const depConflict = conflicts.find((c) => c.type === "dependency");
      expect(depConflict).toBeDefined();
      expect(depConflict!.severity).toBe("warning");
    });

    it("P0 중복 → priority conflict를 감지해요", async () => {
      const detector = new ConflictDetector();
      const existing = [
        makeExistingSpec({
          id: "F3",
          title: "보안 취약점 패치",
          priority: "P0",
          status: "in_progress",
        }),
      ];

      const conflicts = await detector.detect(
        {
          title: "성능 최적화 긴급 배포",
          description: "성능 최적화를 긴급하게 배포합니다",
          priority: "P0",
          dependencies: [],
        },
        existing,
      );

      const priorityConflict = conflicts.find((c) => c.type === "priority");
      expect(priorityConflict).toBeDefined();
      expect(priorityConflict!.severity).toBe("critical");
      expect(priorityConflict!.existingSpec.id).toBe("F3");
    });

    it("충돌이 없으면 빈 배열을 반환해요", async () => {
      const detector = new ConflictDetector();
      const existing = [
        makeExistingSpec({ id: "F1", title: "사용자 인증" }),
        makeExistingSpec({ id: "F2", title: "결제 시스템" }),
      ];

      const conflicts = await detector.detect(
        {
          title: "이메일 알림 서비스",
          description: "사용자에게 이메일 알림을 보내는 서비스",
          priority: "P2",
          dependencies: [],
        },
        existing,
      );

      expect(conflicts).toEqual([]);
    });

    it("LLM 실패 시 규칙 기반 결과를 유지해요", async () => {
      const mockLlm = {
        generate: vi.fn().mockRejectedValue(new Error("LLM unavailable")),
      } as any;

      const detector = new ConflictDetector(mockLlm);
      const existing = [makeExistingSpec({ title: "사용자 인증 시스템 구현" })];

      const conflicts = await detector.detect(
        {
          title: "사용자 인증 시스템 개선",
          description: "기존 인증 시스템을 개선합니다",
          priority: "P1",
          dependencies: [],
        },
        existing,
      );

      expect(conflicts.length).toBeGreaterThanOrEqual(1);
      expect(mockLlm.generate).toHaveBeenCalled();
    });
  });

  describe("calculateKeywordOverlap()", () => {
    it("동일 문자열 → 1.0을 반환해요", () => {
      const detector = new ConflictDetector();
      expect(detector.calculateKeywordOverlap("사용자 인증", "사용자 인증")).toBe(1);
    });

    it("완전히 다른 문자열 → 0을 반환해요", () => {
      const detector = new ConflictDetector();
      expect(detector.calculateKeywordOverlap("사용자 인증", "결제 시스템")).toBe(0);
    });

    it("부분 겹침 → 0~1 사이 값을 반환해요", () => {
      const detector = new ConflictDetector();
      const overlap = detector.calculateKeywordOverlap(
        "사용자 인증 시스템",
        "사용자 관리 시스템",
      );
      expect(overlap).toBeGreaterThan(0);
      expect(overlap).toBeLessThan(1);
    });

    it("빈 문자열 → 0을 반환해요", () => {
      const detector = new ConflictDetector();
      expect(detector.calculateKeywordOverlap("", "test")).toBe(0);
      expect(detector.calculateKeywordOverlap("test", "")).toBe(0);
    });
  });

  describe("getExistingSpecs()", () => {
    it("D1에서 spec_conflicts 이력을 조회해요", async () => {
      const db = createMockD1() as unknown as D1Database;

      // spec_conflicts에 레코드 삽입
      await db
        .prepare(
          `INSERT INTO spec_conflicts (id, new_spec_title, existing_spec_id, conflict_type, severity, description)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind("c1", "테스트 Spec", "F99", "direct", "warning", "유사한 제목")
        .run();

      const detector = new ConflictDetector();
      const specs = await detector.getExistingSpecs(db);

      expect(specs.length).toBe(1);
      expect(specs[0]!.id).toBe("F99");
    });
  });
});
