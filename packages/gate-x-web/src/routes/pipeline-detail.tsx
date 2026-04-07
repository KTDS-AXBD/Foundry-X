import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { gateXApi } from '../lib/api';
import type { Evaluation } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

const phases = [
  { label: 'Phase 1', description: 'O (Orchestration) — 오케스트레이션 단계' },
  { label: 'Phase 2', description: 'G (Generation) — 생성 단계' },
  { label: 'Phase 3', description: 'D (Discrimination) — 검증 단계' },
];

export default function PipelineDetail() {
  const { id } = useParams<{ id: string }>();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    gateXApi
      .getEvaluation(id)
      .then(setEvaluation)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '오류가 발생했어요.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        Pipeline Detail
      </h1>

      {loading && <p style={{ color: '#9ca3af' }}>로딩 중...</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {evaluation && (
        <div>
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '20px 24px',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700 }}>{evaluation.title}</span>
              <StatusBadge status={evaluation.status} />
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>ID: {evaluation.id}</div>
          </div>

          {/* O-G-D Phases */}
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            O-G-D 단계
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {phases.map((phase, idx) => (
              <div
                key={idx}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <span
                  style={{
                    background: '#ede9fe',
                    color: '#5b21b6',
                    borderRadius: 6,
                    padding: '4px 12px',
                    fontWeight: 700,
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {phase.label}
                </span>
                <span style={{ color: '#374151', fontSize: 14 }}>{phase.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
