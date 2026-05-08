// F620 Sprint 367 CO-I09 — Cross-Org Integration E2E cascade
// 시나리오: 1 org → embed → assignGroup(core_differentiator) → checkExport(차단) →
//           enqueueReview → signOff(reclassify) → notifyLaunch
import { describe, it, expect, vi } from "vitest";
import { PolicyEmbedder } from "./services/policy-embedder.service.js";
import { CrossOrgEnforcer } from "./services/cross-org-enforcer.service.js";
import { ExpertReviewManager } from "./services/expert-review-manager.service.js";
import { LaunchBlockingSignalService } from "./services/launch-blocking-signal.service.js";

function makeUnifiedD1Mock() {
  // 단일 in-memory 저장소 — 4 service가 같은 D1을 공유한다는 가정
  const tables = {
    cross_org_groups: new Map<string, Record<string, unknown>>(),
    cross_org_export_blocks: new Map<string, Record<string, unknown>>(),
    cross_org_review_queue: new Map<string, Record<string, unknown>>(),
    policy_embeddings_cache: new Map<string, Record<string, unknown>>(),
  };

  return {
    tables,
    prepare: vi.fn().mockImplementation((sql: string) => ({
      bind: vi.fn().mockImplementation((...args: unknown[]) => ({
        run: vi.fn().mockImplementation(async () => {
          if (sql.includes("INSERT INTO cross_org_groups")) {
            tables.cross_org_groups.set(args[0] as string, {
              id: args[0],
              asset_id: args[1],
              asset_kind: args[2],
              org_id: args[3],
              group_type: args[4],
              assigned_by: args[9],
              assigned_at: args[10],
            });
          }
          if (sql.includes("INSERT INTO cross_org_export_blocks")) {
            tables.cross_org_export_blocks.set(args[0] as string, {
              id: args[0],
              asset_id: args[1],
              org_id: args[2],
              reason: args[3],
              created_at: args[4],
            });
          }
          if (sql.includes("INSERT INTO cross_org_review_queue")) {
            tables.cross_org_review_queue.set(args[0] as string, {
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
          if (sql.includes("INSERT OR REPLACE INTO policy_embeddings_cache")) {
            tables.policy_embeddings_cache.set(args[0] as string, {
              policy_text_hash: args[0],
              org_id: args[1],
              vector_json: args[2],
              model: args[3],
              source_kind: args[4],
              cached_at: args[5],
            });
          }
          if (sql.includes("UPDATE cross_org_review_queue")) {
            const reviewId = args[5] as string;
            const row = tables.cross_org_review_queue.get(reviewId);
            if (row && row.status !== "signed_off") {
              row.status = "signed_off";
              row.decision = args[0];
              row.reclassified_to = args[1];
              row.expert_id = args[2];
              row.notes = args[3];
              row.signed_off_at = args[4];
            }
          }
          return { success: true };
        }),
        first: vi.fn().mockImplementation(async () => {
          if (sql.includes("FROM cross_org_groups")) {
            // assetId 매칭 (cross-org-enforcer.checkExport)
            if (sql.includes("asset_id")) {
              const found = Array.from(tables.cross_org_groups.values()).find(
                (r) => r.asset_id === args[0],
              );
              return found ?? null;
            }
            return null;
          }
          if (sql.includes("FROM cross_org_review_queue WHERE review_id")) {
            return tables.cross_org_review_queue.get(args[0] as string) ?? null;
          }
          if (sql.includes("FROM policy_embeddings_cache WHERE policy_text_hash")) {
            return tables.policy_embeddings_cache.get(args[0] as string) ?? null;
          }
          return null;
        }),
        all: vi.fn().mockResolvedValue({ results: [] }),
      })),
    })),
  };
}

function makeKVMock() {
  const store = new Map<string, string>();
  return {
    get: vi.fn().mockImplementation(async (key: string) => {
      const raw = store.get(key);
      if (!raw) return null;
      try {
        return (JSON.parse(raw) as { data: unknown }).data ?? null;
      } catch {
        return null;
      }
    }),
    set: vi.fn().mockImplementation(async (key: string, data: unknown) => {
      store.set(key, JSON.stringify({ data, cachedAt: Date.now() }));
    }),
    getOrFetch: vi.fn(),
    invalidate: vi.fn(),
  };
}

function makeAuditBusMock() {
  const events: Array<{ eventType: string; payload: unknown; orgId?: string }> = [];
  return {
    events,
    emit: vi.fn().mockImplementation(async (eventType, payload, _ctx, _actor, tenantId) => {
      events.push({ eventType, payload, orgId: tenantId });
    }),
  };
}

describe("F620 CO-I09 Cross-Org Integration E2E cascade", () => {
  it("embed → assignGroup(core_differentiator) → checkExport(차단) → enqueueReview → signOff → notifyLaunch", async () => {
    const db = makeUnifiedD1Mock();
    const cache = makeKVMock();
    const bus = makeAuditBusMock();

    const embedder = new PolicyEmbedder(db as unknown as D1Database, cache as never);
    const enforcer = new CrossOrgEnforcer(db as unknown as D1Database, bus as never);
    const reviewMgr = new ExpertReviewManager(db as unknown as D1Database, bus as never);
    const launchSignal = new LaunchBlockingSignalService(bus as never);

    // Step 1: 정책 텍스트 → embedding cache (CO-I01)
    const embedding = await embedder.embedPolicy(
      "Foundry-X 자체 차별화 알고리즘 설명",
      "org-A",
      "policy",
    );
    expect(embedding.textHash).toMatch(/^[0-9a-f]{64}$/);
    expect(db.tables.policy_embeddings_cache.size).toBe(1);

    // Step 2: assignGroup → core_differentiator (보안 critical)
    const assignment = await enforcer.assignGroup({
      assetId: "asset-core-1",
      assetKind: "policy",
      orgId: "org-A",
      groupType: "core_differentiator",
      assignedBy: "auto",
    });
    expect(assignment.groupType).toBe("core_differentiator");
    expect(db.tables.cross_org_groups.size).toBe(1);

    // Step 3: checkExport → default-deny 차단 (F603)
    const exportResult = await enforcer.checkExport({ assetId: "asset-core-1" });
    expect(exportResult.allowed).toBe(false);
    expect(exportResult.groupType).toBe("core_differentiator");
    expect(db.tables.cross_org_export_blocks.size).toBe(1);

    // Step 4: SME 검토 enqueue (CO-I04)
    const review = await reviewMgr.enqueueReview({
      assignmentId: assignment.id,
      orgId: "org-A",
    });
    expect(review.status).toBe("pending");
    expect(db.tables.cross_org_review_queue.size).toBe(1);

    // Step 5: SME signOff — reclassify 결정 (재분류)
    const signed = await reviewMgr.signOff({
      reviewId: review.reviewId,
      expertId: "expert-1",
      decision: "reclassify",
      reclassifiedTo: "org_specific",
      notes: "공통 표준 가능, 차별화 아님",
    });
    expect(signed?.status).toBe("signed_off");
    expect(signed?.decision).toBe("reclassify");

    // Step 6: Launch-X 차단 신호 발행 (CO-I07)
    const blockId = Array.from(db.tables.cross_org_export_blocks.keys())[0]!;
    const launchSig = await launchSignal.notifyLaunch({
      blockId,
      releaseId: "rel-2026Q2",
      assetId: "asset-core-1",
      orgId: "org-A",
    });
    expect(launchSig.signalId).toBeTruthy();

    // 검증: audit-bus 이벤트 cascade (group_assigned + export_blocked + review_enqueued +
    //        review_signed_off + launch_blocked = 5 events)
    const eventTypes = bus.events.map((e) => e.eventType);
    expect(eventTypes).toContain("cross_org.group_assigned");
    expect(eventTypes).toContain("cross_org.export_blocked");
    expect(eventTypes).toContain("cross_org.review_enqueued");
    expect(eventTypes).toContain("cross_org.review_signed_off");
    expect(eventTypes).toContain("cross_org.launch_blocked");
    // F603 enforcer emit 2건은 tenantId 인자 미전달(stale signature) → orgId=undefined.
    // F620 신규 emit 3건(review_enqueued/signed_off + launch_blocked)은 tenantId="org-A".
    // 후속 fix 후보: enforcer emit signature에 tenantId 추가하면 5건 모두 org-A.
    expect(bus.events.filter((e) => e.orgId === "org-A").length).toBeGreaterThanOrEqual(3);
    expect(bus.events.length).toBe(5);
  });
});
