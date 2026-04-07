import { useEffect, useState } from 'react';
import { gateXApi } from '../lib/api';
import type { EvaluationReport } from '../lib/api';

export default function Reports() {
  const [reports, setReports] = useState<EvaluationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gateXApi
      .getReports()
      .then(setReports)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '오류가 발생했어요.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Reports</h1>

      {loading && <p style={{ color: '#9ca3af' }}>로딩 중...</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {!loading && !error && reports.length === 0 && (
        <p style={{ color: '#9ca3af' }}>리포트가 없어요.</p>
      )}
      {!loading && !error && reports.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reports.map((report) => (
            <div
              key={report.id}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '16px 20px',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{report.summary}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                평가 ID: {report.evaluationId} ·{' '}
                {new Date(report.createdAt).toLocaleDateString('ko-KR')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
