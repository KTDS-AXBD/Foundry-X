/**
 * A-0: SPEC.md 파서 호환성 테스트 — F512 괄호 세부 상태 도입 사전 검증
 *
 * Phase 36에서 F-item 상태를 `🔧` → `🔧(design)` 형태로 확장할 때,
 * 기존 파서 3곳(spec-parser.ts, work.service.ts, board-sync-spec.sh)이
 * 올바르게 동작하는지 검증한다.
 */
import { describe, it, expect } from "vitest";
import {
  parseSpecRequirements,
  parseStatusEmoji,
} from "../services/spec-parser.js";

// ── parseStatusEmoji: 기존 이모지 ──

describe("parseStatusEmoji — existing emoji", () => {
  it("✅ → done", () => {
    expect(parseStatusEmoji("✅")).toBe("done");
  });

  it("🔧 → in_progress", () => {
    expect(parseStatusEmoji("🔧")).toBe("in_progress");
  });

  it("📋 → planned", () => {
    expect(parseStatusEmoji("📋")).toBe("planned");
  });

  it("❌ → rejected", () => {
    expect(parseStatusEmoji("❌")).toBe("rejected");
  });

  it("unknown → planned (default)", () => {
    expect(parseStatusEmoji("???")).toBe("planned");
  });
});

// ── parseStatusEmoji: Phase 36 괄호 세부 상태 ──

describe("parseStatusEmoji — Phase 36 bracket sub-status", () => {
  it("🔧(plan) → in_progress", () => {
    expect(parseStatusEmoji("🔧(plan)")).toBe("in_progress");
  });

  it("🔧(design) → in_progress", () => {
    expect(parseStatusEmoji("🔧(design)")).toBe("in_progress");
  });

  it("🔧(impl) → in_progress", () => {
    expect(parseStatusEmoji("🔧(impl)")).toBe("in_progress");
  });

  it("🔧(review) → in_progress", () => {
    expect(parseStatusEmoji("🔧(review)")).toBe("in_progress");
  });

  it("🔧(test) → in_progress", () => {
    expect(parseStatusEmoji("🔧(test)")).toBe("in_progress");
  });

  it("🔧(blocked) → in_progress", () => {
    expect(parseStatusEmoji("🔧(blocked)")).toBe("in_progress");
  });

  it("📋(idea) → planned", () => {
    expect(parseStatusEmoji("📋(idea)")).toBe("planned");
  });

  it("📋(groomed) → planned", () => {
    expect(parseStatusEmoji("📋(groomed)")).toBe("planned");
  });

  it("✅(deployed) → done", () => {
    expect(parseStatusEmoji("✅(deployed)")).toBe("done");
  });
});

// ── parseSpecRequirements: 전체 행 파싱 ──

describe("parseSpecRequirements — full row parsing", () => {
  const EXISTING_ROW = `| F509 | fx-work-observability Walking Skeleton (FX-REQ-526, P0) | v33 | ✅ | Gap 98% |`;
  const BRACKET_ROW = `| F512 | 문서 체계 정비 (FX-REQ-535, P0) | v36 | 🔧(design) | A-0 선행 |`;
  const BACKLOG_ROW = `| F513 | API 테스트 보강 (FX-REQ-536, P0) | v36 | 📋(groomed) | TDD 필수 |`;

  it("parses existing row with plain emoji", () => {
    const result = parseSpecRequirements(EXISTING_ROW);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "F509",
      reqCode: "FX-REQ-526",
      priority: "P0",
      status: "done",
    });
  });

  it("parses row with bracket sub-status 🔧(design)", () => {
    const result = parseSpecRequirements(BRACKET_ROW);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "F512",
      reqCode: "FX-REQ-535",
      priority: "P0",
      status: "in_progress",
    });
  });

  it("parses row with bracket sub-status 📋(groomed)", () => {
    const result = parseSpecRequirements(BACKLOG_ROW);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "F513",
      reqCode: "FX-REQ-536",
      priority: "P0",
      status: "planned",
    });
  });

  it("parses mixed rows (plain + bracket)", () => {
    const mixed = [EXISTING_ROW, BRACKET_ROW, BACKLOG_ROW].join("\n");
    const result = parseSpecRequirements(mixed);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.status)).toEqual([
      "done",
      "in_progress",
      "planned",
    ]);
  });
});
