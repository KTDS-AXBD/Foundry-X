import { useEffect, useState } from 'react';
import { gateXApi } from '../lib/api';
import type { Evaluation } from '../lib/api';
import PipelineCard from '../components/PipelineCard';

export default function Pipelines() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gateXApi
      .getEvaluations()
      .then(setEvaluations)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '오류가 발생했어요.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Pipelines</h1>

      {loading && <p style={{ color: '#9ca3af' }}>로딩 중...</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {!loading && !error && evaluations.length === 0 && (
        <p style={{ color: '#9ca3af' }}>파이프라인이 없어요.</p>
      )}
      {!loading && !error && evaluations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {evaluations.map((e) => (
            <PipelineCard key={e.id} evaluation={e} />
          ))}
        </div>
      )}
    </div>
  );
}
