// F620 Sprint 367 CO-I04 — ExpertReviewManager TDD
import { describe, it, expect, vi } from "vitest";
import { ExpertReviewManager, type ReviewStatus } from "./expert-review-manager.service.js";

function makeD1Mock() {
  const rows: Record<string, unknown>[] = [];
  const inserts: unknown[][] = [];
  const updates: unknown[][] = [];
  return {
    rows,
    inserts,
    updates,
    prepare: vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockImplementation((...args: unknown[]) => {
        if (sql.includes("INSERT INTO cross_org_review_queue")) {
          inserts.push(args);
          rows.push({
            review_id: args[0],
            assignment_id: args[1],
            org_id: args[2],
            status: "pending",
            decision: null,
            reclassified_to: null,
            expert_id: null,
            notes: null,
            enqueued_at: args[3],
            signed_off_at: null,
          });
        }
        if (sql.includes("UPDATE cross_org_review_queue")) {
          updates.push(args);
          const reviewId = args[5];
          const row = rows.find((r) => r.review_id === reviewId);
          if (row && row.status !== "signed_off") {
            row.status = "signed_off";
            row.decision = args[0];
            row.reclassified_to = args[1];
            row.expert_id = args[2];
            row.notes = args[3];
            row.signed_off_at = args[4];
          }
        }
        return {
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockImplementation(async () => {
            if (sql.includes("SELECT * FROM cross_org_review_queue WHERE review_id")) {
              return rows.find((r) => r.review_id === args[0]) ?? null;
            }
            return null;
          }),
          all: vi.fn().mockImplementation(async () => {
            if (sql.includes("FROM cross_org_review_queue") && sql.includes("org_id")) {
              const orgId = args[0] as string;
              const status = sql.includes("status = ?") ? (args[1] as string) : null;
              const filtered = rows.filter(
                (r) => r.org_id === orgId && (!status || r.status === status),
              );
              return { results: filtered };
            }
            return { results: [] };
          }),
        };
      }),
    })),
  };
}

function makeAuditBusMock() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

describe("F620 CO-I04 ExpertReviewManager", () => {
  it("enqueueReview — 큐 INSERT + audit emit cross_org.review_enqueued", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const mgr = new ExpertReviewManager(db as unknown as D1Database, bus as never);

    const entry = await mgr.enqueueReview({ assignmentId: "asg-1", orgId: "org-1" });

    expect(entry.reviewId).toBeTruthy();
    expect(entry.status).toBe<ReviewStatus>("pending");
    expect(entry.assignmentId).toBe("asg-1");
    expect(db.inserts).toHaveLength(1);
    expect(bus.emit).toHaveBeenCalledWith(
      "cross_org.review_enqueued",
      expect.objectContaining({ reviewId: entry.reviewId, assignmentId: "asg-1", orgId: "org-1" }),
      expect.objectContaining({ traceId: expect.stringMatching(/^[0-9a-f]{32}$/) }),
      undefined,
      "org-1",
    );
  });

  it("getQueue — orgId 필터 + status optional", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const mgr = new ExpertReviewManager(db as unknown as D1Database, bus as never);

    await mgr.enqueueReview({ assignmentId: "asg-1", orgId: "org-1" });
    await mgr.enqueueReview({ assignmentId: "asg-2", orgId: "org-1" });
    await mgr.enqueueReview({ assignmentId: "asg-3", orgId: "org-2" });

    const allOrg1 = await mgr.getQueue("org-1");
    expect(allOrg1).toHaveLength(2);

    const pendingOrg1 = await mgr.getQueue("org-1", "pending");
    expect(pendingOrg1).toHaveLength(2);

    const signedOff = await mgr.getQueue("org-1", "signed_off");
    expect(signedOff).toHaveLength(0);
  });

  it("signOff — pending → signed_off + audit emit cross_org.review_signed_off", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const mgr = new ExpertReviewManager(db as unknown as D1Database, bus as never);

    const enq = await mgr.enqueueReview({ assignmentId: "asg-1", orgId: "org-1" });

    const signed = await mgr.signOff({
      reviewId: enq.reviewId,
      expertId: "expert-A",
      decision: "reclassify",
      reclassifiedTo: "org_specific",
      notes: "공통 표준 아님",
    });

    expect(signed).not.toBeNull();
    expect(signed?.status).toBe<ReviewStatus>("signed_off");
    expect(signed?.decision).toBe("reclassify");
    expect(signed?.reclassifiedTo).toBe("org_specific");
    expect(signed?.expertId).toBe("expert-A");
    expect(signed?.signedOffAt).toBeGreaterThan(0);
    expect(bus.emit).toHaveBeenLastCalledWith(
      "cross_org.review_signed_off",
      expect.objectContaining({
        reviewId: enq.reviewId,
        expertId: "expert-A",
        decision: "reclassify",
        reclassifiedTo: "org_specific",
        assignmentId: "asg-1",
      }),
      expect.anything(),
      "expert-A",
      "org-1",
    );
  });

  it("signOff — 없는 review_id → null 반환", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const mgr = new ExpertReviewManager(db as unknown as D1Database, bus as never);

    const result = await mgr.signOff({
      reviewId: "non-existent",
      expertId: "expert-A",
      decision: "approve",
    });
    expect(result).toBeNull();
  });
});
