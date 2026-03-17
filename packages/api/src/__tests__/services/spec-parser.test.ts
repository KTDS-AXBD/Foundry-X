import { describe, it, expect } from "vitest";
import {
  parseSpecRequirements,
  parseStatusEmoji,
} from "../../services/spec-parser.js";

describe("parseSpecRequirements", () => {
  const SAMPLE_SPEC = `
# SPEC.md

## 5. Feature Items

| ID | Feature (REQ, Priority) | Version | Status | Notes |
|----|-------------------------|---------|--------|-------|
| F1 | CLI Init (FX-REQ-001, P1) | v0.1 | \u2705 | Phase 1 |
| F2 | CLI Status (FX-REQ-002, P1) | v0.2 | \u2705 | Phase 1 |
| F38 | OpenAPI Spec (FX-REQ-038, P2) | v0.7 | \uD83D\uDD27 | Sprint 7 |
| F44 | SSE Realtime (FX-REQ-044, P1) | v0.8 | \uD83D\uDCCB | Sprint 8 |
| F99 | Cancelled Feature (FX-REQ-099, P3) | v1.0 | \u274C | Dropped |
`;

  it("parses F-items from SPEC.md table rows", () => {
    const items = parseSpecRequirements(SAMPLE_SPEC);
    expect(items).toHaveLength(5);
    expect(items[0]).toEqual({
      id: "F1",
      title: "CLI Init",
      reqCode: "FX-REQ-001",
      priority: "P1",
      version: "v0.1",
      status: "done",
      notes: "Phase 1",
    });
  });

  it("returns empty array for empty/invalid input", () => {
    expect(parseSpecRequirements("")).toEqual([]);
    expect(parseSpecRequirements("no table here")).toEqual([]);
  });

  it("parses all status emoji types correctly", () => {
    const items = parseSpecRequirements(SAMPLE_SPEC);
    const statuses = items.map((i) => i.status);
    expect(statuses).toEqual([
      "done",
      "done",
      "in_progress",
      "planned",
      "rejected",
    ]);
  });

  it("extracts reqCode and priority from parenthetical format", () => {
    const items = parseSpecRequirements(SAMPLE_SPEC);
    expect(items[2]?.reqCode).toBe("FX-REQ-038");
    expect(items[2]?.priority).toBe("P2");
  });

  it("handles rows with extra whitespace", () => {
    const padded =
      "|  F50  |  Padded Feature  (FX-REQ-050,  P1)  |  v1.0  |  \u2705  |  done  |";
    const items = parseSpecRequirements(padded);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Padded Feature");
  });
});

describe("parseStatusEmoji", () => {
  it("maps emoji to status correctly", () => {
    expect(parseStatusEmoji("\u2705")).toBe("done");
    expect(parseStatusEmoji("\uD83D\uDD27")).toBe("in_progress");
    expect(parseStatusEmoji("\uD83D\uDCCB")).toBe("planned");
    expect(parseStatusEmoji("\u274C")).toBe("rejected");
    expect(parseStatusEmoji("unknown")).toBe("planned");
  });
});
