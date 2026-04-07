import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import type { Evaluation } from '../lib/api';

interface PipelineCardProps {
  evaluation: Evaluation;
}

export default function PipelineCard({ evaluation }: PipelineCardProps) {
  const createdDate = new Date(evaluation.createdAt).toLocaleDateString('ko-KR');

  return (
    <Link
      to={`/pipelines/${evaluation.id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            '0 2px 8px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
            {evaluation.title}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>생성일: {createdDate}</div>
        </div>
        <StatusBadge status={evaluation.status} />
      </div>
    </Link>
  );
}
