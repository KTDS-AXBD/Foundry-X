import { describe, it, expect } from 'vitest';
import {
  calculateMetrics,
  applyDecisionMatrix,
  generateAdrMarkdown,
} from '../usage-analyzer.js';

describe('PlumbUsageAnalyzer', () => {
  describe('calculateMetrics', () => {
    it('calculates weekly failures and error rate correctly', () => {
      const metrics = calculateMetrics({
        callSiteFiles: 4,
        callSites: ['bridge.ts', 'types.ts', 'status.ts', 'sync.ts'],
        errorTypeCount: 4,
        bugFixCommits: 2,
        totalPlumbCommits: 10,
        analysisPeriodWeeks: 4,
        hasKpiData: false,
      });

      expect(metrics.weeklyFailures).toBe(0.5);
      expect(metrics.errorRate).toBe(0.2);
    });

    it('handles zero analysis period', () => {
      const metrics = calculateMetrics({
        callSiteFiles: 0,
        callSites: [],
        errorTypeCount: 0,
        bugFixCommits: 0,
        totalPlumbCommits: 0,
        analysisPeriodWeeks: 0,
        hasKpiData: false,
      });

      expect(metrics.weeklyFailures).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });
  });

  describe('applyDecisionMatrix', () => {
    it('returns go-track-b when weekly failures >= 2 and error rate > 10%', () => {
      const metrics = calculateMetrics({
        callSiteFiles: 4,
        callSites: ['a.ts', 'b.ts', 'c.ts', 'd.ts'],
        errorTypeCount: 4,
        bugFixCommits: 10,
        totalPlumbCommits: 20,
        analysisPeriodWeeks: 4,
        hasKpiData: true,
      });

      const decision = applyDecisionMatrix(metrics);
      expect(decision.decision).toBe('go-track-b');
      expect(decision.rationale).toContain('TypeScript 재구현');
    });

    it('returns stay-track-a when weekly failures <= 1 and error rate < 5%', () => {
      const metrics = calculateMetrics({
        callSiteFiles: 4,
        callSites: ['a.ts', 'b.ts', 'c.ts', 'd.ts'],
        errorTypeCount: 4,
        bugFixCommits: 1,
        totalPlumbCommits: 50,
        analysisPeriodWeeks: 8,
        hasKpiData: false,
      });

      const decision = applyDecisionMatrix(metrics);
      expect(decision.decision).toBe('stay-track-a');
      expect(decision.nextReviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns conditional for boundary cases', () => {
      const metrics = calculateMetrics({
        callSiteFiles: 4,
        callSites: ['a.ts', 'b.ts', 'c.ts', 'd.ts'],
        errorTypeCount: 4,
        bugFixCommits: 5,
        totalPlumbCommits: 10,
        analysisPeriodWeeks: 4,
        hasKpiData: false,
      });

      // weeklyFailures = 1.25, errorRate = 50% → conditional
      const decision = applyDecisionMatrix(metrics);
      expect(decision.decision).toBe('conditional');
      expect(decision.nextReviewDate).toBe('Sprint 30');
    });
  });

  describe('generateAdrMarkdown', () => {
    it('generates markdown with required sections', () => {
      const metrics = calculateMetrics({
        callSiteFiles: 4,
        callSites: ['bridge.ts', 'types.ts', 'status.ts', 'sync.ts'],
        errorTypeCount: 4,
        bugFixCommits: 1,
        totalPlumbCommits: 50,
        analysisPeriodWeeks: 8,
        hasKpiData: false,
      });

      // weeklyFailures=0.125, errorRate=2% → stay-track-a
      const decision = applyDecisionMatrix(metrics);
      const markdown = generateAdrMarkdown(decision);

      expect(markdown).toContain('# ADR-001');
      expect(markdown).toContain('## Status');
      expect(markdown).toContain('## Context');
      expect(markdown).toContain('## Data');
      expect(markdown).toContain('## Decision');
      expect(markdown).toContain('## Consequences');
      expect(markdown).toContain('Track A 유지');
    });
  });
});
