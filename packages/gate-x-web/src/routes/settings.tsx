import { useEffect, useState } from 'react';
import { gateXApi } from '../lib/api';
import type { ApiKey } from '../lib/api';

export default function Settings() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gateXApi
      .getApiKeys()
      .then(setApiKeys)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '오류가 발생했어요.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const key = await gateXApi.createApiKey(newKeyName.trim());
      setApiKeys((prev) => [...prev, key]);
      setNewKeyName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '키 생성에 실패했어요.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>API Keys</h2>

      {/* Create form */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
        }}
      >
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="API 키 이름"
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 14,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleCreate();
          }}
        />
        <button
          onClick={() => void handleCreate()}
          disabled={creating || !newKeyName.trim()}
          style={{
            padding: '8px 16px',
            background: creating ? '#9ca3af' : '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            cursor: creating ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {creating ? '생성 중...' : '생성'}
        </button>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      {/* Key list */}
      {loading && <p style={{ color: '#9ca3af' }}>로딩 중...</p>}
      {!loading && apiKeys.length === 0 && (
        <p style={{ color: '#9ca3af' }}>API 키가 없어요.</p>
      )}
      {!loading && apiKeys.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {apiKeys.map((key) => (
            <div
              key={key.id}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '14px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{key.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  {key.keyPrefix}••••••••
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                {new Date(key.createdAt).toLocaleDateString('ko-KR')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
