/**
 * A-0: work.service.ts parseFItems 정규식 호환성 테스트 — F512 괄호 세부 상태
 *
 * WorkService.parseFItems()는 private이므로, 동일 정규식을 추출하여 검증.
 * inferStatus() 로직도 동일하게 재현하여 테스트.
 */
import { describe, it, expect } from "vitest";

// ── work.service.ts line 104와 동일한 정규식 ──
const LINE_PATTERN =
  /^\|\s*(F\d+)\s*\|\s*([^|]{3,120}?)\s*\|\s*(Sprint\s*\d+|—|\s*)\s*\|\s*([^|]*?)\s*\|/gm;

// ── work.service.ts line 130-139와 동일한 로직 ──
function inferStatus(
  statusCol: string,
  sprintCol: string,
): string {
  if (statusCol.includes("✅")) return "done";
  if (statusCol.includes("🔧")) return "in_progress";
  if (statusCol.includes("🚫")) return "rejected";
  if (statusCol.includes("📋")) return "backlog";
  if (sprintCol.trim() && sprintCol.includes("Sprint")) return "planned";
  return "backlog";
}

function parseFItems(specText: string) {
  const items: Array<{
    id: string;
    title: string;
    status: string;
    sprint?: string;
    statusRaw: string;
  }> = [];

  for (const match of specText.matchAll(LINE_PATTERN)) {
    const id = match[1] ?? "";
    const title = match[2] ?? "";
    const sprintCol = match[3] ?? "";
    const statusCol = match[4] ?? "";
    const sprint = sprintCol.match(/\d+/)?.[0];
    const status = inferStatus(statusCol, sprintCol);

    if (!id) continue;
    items.push({
      id: id.trim(),
      title: title.trim(),
      status,
      sprint,
      statusRaw: statusCol.trim(),
    });
  }

  return items;
}

// ── inferStatus 단위 테스트 ──

describe("inferStatus — existing emoji", () => {
  it("✅ → done", () => expect(inferStatus(" ✅ ", "")).toBe("done"));
  it("🔧 → in_progress", () => expect(inferStatus(" 🔧 ", "")).toBe("in_progress"));
  it("📋 → backlog", () => expect(inferStatus(" 📋 ", "")).toBe("backlog"));
  it("🚫 → rejected", () => expect(inferStatus(" 🚫 ", "")).toBe("rejected"));
  it("empty + Sprint → planned", () => expect(inferStatus("", "Sprint 264")).toBe("planned"));
  it("empty + empty → backlog", () => expect(inferStatus("", "")).toBe("backlog"));
});

describe("inferStatus — Phase 36 bracket sub-status", () => {
  it("🔧(plan) → in_progress", () => expect(inferStatus(" 🔧(plan) ", "")).toBe("in_progress"));
  it("🔧(design) → in_progress", () => expect(inferStatus(" 🔧(design) ", "")).toBe("in_progress"));
  it("🔧(impl) → in_progress", () => expect(inferStatus(" 🔧(impl) ", "")).toBe("in_progress"));
  it("🔧(review) → in_progress", () => expect(inferStatus(" 🔧(review) ", "")).toBe("in_progress"));
  it("🔧(test) → in_progress", () => expect(inferStatus(" 🔧(test) ", "")).toBe("in_progress"));
  it("🔧(blocked) → in_progress", () => expect(inferStatus(" 🔧(blocked) ", "")).toBe("in_progress"));
  it("📋(idea) → backlog", () => expect(inferStatus(" 📋(idea) ", "")).toBe("backlog"));
  it("📋(groomed) → backlog", () => expect(inferStatus(" 📋(groomed) ", "")).toBe("backlog"));
  it("✅(deployed) → done", () => expect(inferStatus(" ✅(deployed) ", "")).toBe("done"));
});

// ── parseFItems 정규식 + inferStatus 통합 테스트 ──

describe("parseFItems regex — existing SPEC rows", () => {
  it("plain ✅ row", () => {
    const row = `| F511 | Work Management 품질 보강 (FX-REQ-534, P1) | Sprint 263 | ✅ | PR #516 |`;
    const items = parseFItems(row);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "F511", status: "done", sprint: "263" });
  });

  it("plain 📋 row", () => {
    const row = `| F512 | 문서 체계 정비 + 아카이브 (FX-REQ-535, P0) | — | 📋 | meta-only |`;
    const items = parseFItems(row);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "F512", status: "backlog" });
  });

  it("plain 🔧 row", () => {
    const row = `| F513 | API 테스트 보강 (FX-REQ-536, P0) | Sprint 264 | 🔧 | TDD 필수 |`;
    const items = parseFItems(row);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "F513", status: "in_progress", sprint: "264" });
  });
});

describe("parseFItems regex — Phase 36 bracket sub-status", () => {
  it("🔧(design) is captured and parsed correctly", () => {
    const row = `| F512 | 문서 체계 정비 (FX-REQ-535, P0) | — | 🔧(design) | A-0 진행 |`;
    const items = parseFItems(row);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "F512", status: "in_progress" });
    expect(items[0]!.statusRaw).toBe("🔧(design)");
  });

  it("📋(groomed) is captured and parsed correctly", () => {
    const row = `| F513 | API 테스트 보강 (FX-REQ-536, P0) | Sprint 264 | 📋(groomed) | TDD |`;
    const items = parseFItems(row);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "F513", status: "backlog", sprint: "264" });
    expect(items[0]!.statusRaw).toBe("📋(groomed)");
  });

  it("✅(deployed) is captured and parsed correctly", () => {
    const row = `| F509 | Walking Skeleton (FX-REQ-526, P0) | Sprint 261 | ✅(deployed) | 완료 |`;
    const items = parseFItems(row);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "F509", status: "done" });
    expect(items[0]!.statusRaw).toBe("✅(deployed)");
  });

  it("mixed plain + bracket rows", () => {
    const spec = [
      `| F509 | Walking Skeleton (FX-REQ-526, P0) | Sprint 261 | ✅ | Gap 98% |`,
      `| F512 | 문서 체계 정비 (FX-REQ-535, P0) | — | 🔧(design) | meta |`,
      `| F513 | API 테스트 (FX-REQ-536, P0) | Sprint 264 | 📋(groomed) | TDD |`,
      `| F514 | 대시보드 확장 (FX-REQ-537, P1) | Sprint 265 | 📋 | F513 의존 |`,
    ].join("\n");

    const items = parseFItems(spec);
    expect(items).toHaveLength(4);
    expect(items.map((i) => i.status)).toEqual([
      "done",
      "in_progress",
      "backlog",
      "backlog",
    ]);
  });
});

// ── board-sync-spec.sh glob 패턴 에뮬레이션 ──

describe("board-sync-spec.sh glob pattern emulation", () => {
  function specToBoard(statusCol: string): string {
    if (statusCol.includes("✅")) return "Done";
    if (statusCol.includes("🔧")) return "In Progress";
    if (statusCol.includes("📋")) return "Sprint Ready";
    return "";
  }

  it("plain ��� → Done", () => expect(specToBoard("✅")).toBe("Done"));
  it("plain 🔧 → In Progress", () => expect(specToBoard("🔧")).toBe("In Progress"));
  it("plain 📋 → Sprint Ready", () => expect(specToBoard("📋")).toBe("Sprint Ready"));

  it("🔧(design) → In Progress", () => expect(specToBoard("🔧(design)")).toBe("In Progress"));
  it("🔧(blocked) → In Progress", () => expect(specToBoard("🔧(blocked)")).toBe("In Progress"));
  it("📋(idea) → Sprint Ready", () => expect(specToBoard("📋(idea)")).toBe("Sprint Ready"));
  it("📋(groomed) → Sprint Ready", () => expect(specToBoard("📋(groomed)")).toBe("Sprint Ready"));
  it("✅(deployed) → Done", () => expect(specToBoard("✅(deployed)")).toBe("Done"));
});
