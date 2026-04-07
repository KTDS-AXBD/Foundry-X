import { useEffect, useState } from 'react';
import { gateXApi } from '../lib/api';
import type { Evaluation } from '../lib/api';
import PipelineCard from '../components/PipelineCard';

interface Stats {
  total: number;
  active: number;
  go: number;
  kill: number;
}

const statCardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '20px 24px',
  flex: 1,
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, go: 0, kill: 0 });
  const [recent, setRecent] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gateXApi
      .getEvaluations()
      .then((evals) => {
        setStats({
          total: evals.length,
          active: evals.filter((e) => e.status === 'active').length,
          go: evals.filter((e) => e.status === 'go').length,
          kill: evals.filter((e) => e.status === 'kill').length,
        });
        setRecent(evals.slice(0, 5));
      })
      .catch(() => {
        // API not available — keep default 0 values
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        Gate-X Dashboard
      </h1>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Total</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.total}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Active</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1d4ed8' }}>
            {stats.active}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Go</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#15803d' }}>
            {stats.go}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Kill</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>
            {stats.kill}
          </div>
        </div>
      </div>

      {/* Recent Pipelines */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
          최근 파이프라인
        </h2>
        {loading ? (
          <p style={{ color: '#9ca3af' }}>로딩 중...</p>
        ) : recent.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>파이프라인이 없어요.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.map((e) => (
              <PipelineCard key={e.id} evaluation={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
