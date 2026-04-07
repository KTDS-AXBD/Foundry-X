import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Pipelines from '../routes/pipelines';

vi.mock('../lib/api', () => ({
  gateXApi: {
    getEvaluations: vi.fn().mockResolvedValue([]),
  },
}));

describe('Pipelines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Pipelines heading', () => {
    render(
      <MemoryRouter>
        <Pipelines />
      </MemoryRouter>
    );
    expect(screen.getByText('Pipelines')).toBeInTheDocument();
  });

  it('renders loading state initially', () => {
    render(
      <MemoryRouter>
        <Pipelines />
      </MemoryRouter>
    );
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });
});
