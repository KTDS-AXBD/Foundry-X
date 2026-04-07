import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gateXApi } from '../lib/api';
import type { Evaluation } from '../lib/api';

const mockFetch = vi.fn();

describe('gateXApi', () => {
  beforeEach(() => {
    globalThis.fetch = mockFetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getEvaluations', () => {
    it('fetches evaluations successfully', async () => {
      const mockEvals: Evaluation[] = [
        {
          id: 'eval-1',
          title: 'Test Evaluation',
          status: 'active',
          orgId: 'org-1',
          createdAt: 1000000,
          updatedAt: 1000001,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvals,
      });

      const result = await gateXApi.getEvaluations();
      expect(result).toEqual(mockEvals);
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(gateXApi.getEvaluations()).rejects.toThrow(
        'Failed to fetch evaluations: 500'
      );
    });
  });

  describe('getEvaluation', () => {
    it('fetches single evaluation by id', async () => {
      const mockEval: Evaluation = {
        id: 'eval-1',
        title: 'Test Evaluation',
        status: 'go',
        orgId: 'org-1',
        createdAt: 1000000,
        updatedAt: 1000001,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEval,
      });

      const result = await gateXApi.getEvaluation('eval-1');
      expect(result).toEqual(mockEval);
      expect(mockFetch).toHaveBeenCalledOnce();
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('eval-1');
    });

    it('throws error when evaluation not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(gateXApi.getEvaluation('missing')).rejects.toThrow(
        'Failed to fetch evaluation: 404'
      );
    });
  });
});
