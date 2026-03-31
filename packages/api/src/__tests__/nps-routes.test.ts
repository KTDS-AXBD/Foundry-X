import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { NpsService } from "../services/nps-service.js";

describe("NpsService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: NpsService;

  beforeEach(() => {
    db = createMockD1();

    (db as any).exec(`
      CREATE TABLE IF NOT EXISTS nps_surveys (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        dismissed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_nps_surveys_user ON nps_surveys(org_id, user_id, triggered_at DESC);

      CREATE TABLE IF NOT EXISTS onboarding_feedback (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        nps_score INTEGER NOT NULL,
        comment TEXT,
        page_path TEXT,
        session_seconds INTEGER,
        feedback_type TEXT DEFAULT 'nps',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    service = new NpsService(db as unknown as D1Database);
  });

  describe("checkEligibility", () => {
    it("returns shouldShow=true for new user with no prior survey", async () => {
      const result = await service.checkEligibility("org_1", "user_1");

      expect(result.shouldShow).toBe(true);
      expect(result.surveyId).toBeTruthy();
      expect(result.surveyId).toMatch(/^nps_/);
    });

    it("returns shouldShow=false if survey exists within 7 days", async () => {
      // First check creates a survey
      await service.checkEligibility("org_1", "user_1");

      // Second check should return false
      const result = await service.checkEligibility("org_1", "user_1");
      expect(result.shouldShow).toBe(false);
      expect(result.surveyId).toBeNull();
    });

    it("allows different users to get surveys independently", async () => {
      const result1 = await service.checkEligibility("org_1", "user_1");
      const result2 = await service.checkEligibility("org_1", "user_2");

      expect(result1.shouldShow).toBe(true);
      expect(result2.shouldShow).toBe(true);
      expect(result1.surveyId).not.toBe(result2.surveyId);
    });

    it("allows surveys from different orgs for same user", async () => {
      const result1 = await service.checkEligibility("org_1", "user_1");
      const result2 = await service.checkEligibility("org_2", "user_1");

      expect(result1.shouldShow).toBe(true);
      expect(result2.shouldShow).toBe(true);
    });
  });

  describe("completeSurvey", () => {
    it("marks survey as completed", async () => {
      const { surveyId } = await service.checkEligibility("org_1", "user_1");
      await service.completeSurvey(surveyId!);

      const row = await (db as unknown as D1Database)
        .prepare("SELECT completed_at FROM nps_surveys WHERE id = ?")
        .bind(surveyId)
        .first<{ completed_at: string | null }>();

      expect(row?.completed_at).toBeTruthy();
    });

    it("does not overwrite existing completed_at", async () => {
      const { surveyId } = await service.checkEligibility("org_1", "user_1");
      await service.completeSurvey(surveyId!);

      const first = await (db as unknown as D1Database)
        .prepare("SELECT completed_at FROM nps_surveys WHERE id = ?")
        .bind(surveyId)
        .first<{ completed_at: string }>();

      await service.completeSurvey(surveyId!);

      const second = await (db as unknown as D1Database)
        .prepare("SELECT completed_at FROM nps_surveys WHERE id = ?")
        .bind(surveyId)
        .first<{ completed_at: string }>();

      expect(first?.completed_at).toBe(second?.completed_at);
    });
  });

  describe("dismissSurvey", () => {
    it("marks survey as dismissed", async () => {
      const { surveyId } = await service.checkEligibility("org_1", "user_1");
      await service.dismissSurvey(surveyId!);

      const row = await (db as unknown as D1Database)
        .prepare("SELECT dismissed_at FROM nps_surveys WHERE id = ?")
        .bind(surveyId)
        .first<{ dismissed_at: string | null }>();

      expect(row?.dismissed_at).toBeTruthy();
    });
  });

  describe("getOrgSummary", () => {
    it("returns zero stats when no feedback exists", async () => {
      const summary = await service.getOrgSummary("org_1");

      expect(summary.averageNps).toBe(0);
      expect(summary.totalResponses).toBe(0);
      expect(summary.responseRate).toBe(0);
      expect(summary.weeklyTrend).toEqual([]);
      expect(summary.recentFeedback).toEqual([]);
    });

    it("computes correct average NPS", async () => {
      (db as any).exec(`
        INSERT INTO onboarding_feedback (id, tenant_id, user_id, nps_score, created_at)
        VALUES ('fb_1', 'org_1', 'user_1', 8, datetime('now'));
        INSERT INTO onboarding_feedback (id, tenant_id, user_id, nps_score, created_at)
        VALUES ('fb_2', 'org_1', 'user_2', 6, datetime('now'));
      `);

      const summary = await service.getOrgSummary("org_1");

      expect(summary.averageNps).toBe(7);
      expect(summary.totalResponses).toBe(2);
    });

    it("computes response rate from survey data", async () => {
      // Create 2 surveys, complete 1
      const s1 = await service.checkEligibility("org_1", "user_1");
      await service.checkEligibility("org_1", "user_2");
      await service.completeSurvey(s1.surveyId!);

      const summary = await service.getOrgSummary("org_1");
      expect(summary.responseRate).toBe(0.5);
    });

    it("returns recent feedback limited to 5", async () => {
      for (let i = 0; i < 7; i++) {
        (db as any).exec(`
          INSERT INTO onboarding_feedback (id, tenant_id, user_id, nps_score, created_at)
          VALUES ('fb_r${i}', 'org_1', 'user_1', ${(i % 10) + 1}, datetime('now', '-${i} hours'));
        `);
      }

      const summary = await service.getOrgSummary("org_1");
      expect(summary.recentFeedback).toHaveLength(5);
    });
  });
});
