import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PipelineDetail from '../routes/pipeline-detail';

vi.mock('../lib/api', () => ({
  gateXApi: {
    getEvaluation: vi.fn().mockResolvedValue({
      id: 'test-id',
      title: 'Test Evaluation',
      status: 'active',
      orgId: 'org-1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  },
}));

describe('PipelineDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Pipeline Detail heading', () => {
    render(
      <MemoryRouter initialEntries={['/pipelines/test-id']}>
        <Routes>
          <Route path="/pipelines/:id" element={<PipelineDetail />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Pipeline Detail')).toBeInTheDocument();
  });

  it('renders O-G-D phases section after loading', async () => {
    render(
      <MemoryRouter initialEntries={['/pipelines/test-id']}>
        <Routes>
          <Route path="/pipelines/:id" element={<PipelineDetail />} />
        </Routes>
      </MemoryRouter>
    );
    // Phase labels should appear after data loads
    expect(await screen.findByText('O-G-D 단계')).toBeInTheDocument();
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
    expect(screen.getByText('Phase 2')).toBeInTheDocument();
    expect(screen.getByText('Phase 3')).toBeInTheDocument();
  });
});
