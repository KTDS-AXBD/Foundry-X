const API_URL = import.meta.env.VITE_GATE_X_API_URL ?? 'http://localhost:8787';

export interface Evaluation {
  id: string;
  title: string;
  status: string;
  orgId: string;
  createdAt: number;
  updatedAt: number;
}

export interface EvaluationReport {
  id: string;
  evaluationId: string;
  summary: string;
  createdAt: number;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: number;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('gate-x-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const gateXApi = {
  async getEvaluations(): Promise<Evaluation[]> {
    const res = await fetch(`${API_URL}/api/evaluations`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error(`Failed to fetch evaluations: ${res.status}`);
    return res.json() as Promise<Evaluation[]>;
  },

  async getEvaluation(id: string): Promise<Evaluation> {
    const res = await fetch(`${API_URL}/api/evaluations/${id}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error(`Failed to fetch evaluation: ${res.status}`);
    return res.json() as Promise<Evaluation>;
  },

  async getReports(): Promise<EvaluationReport[]> {
    const res = await fetch(`${API_URL}/api/reports`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error(`Failed to fetch reports: ${res.status}`);
    return res.json() as Promise<EvaluationReport[]>;
  },

  async getApiKeys(): Promise<ApiKey[]> {
    const res = await fetch(`${API_URL}/api/settings/api-keys`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error(`Failed to fetch API keys: ${res.status}`);
    return res.json() as Promise<ApiKey[]>;
  },

  async createApiKey(name: string): Promise<ApiKey> {
    const res = await fetch(`${API_URL}/api/settings/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`Failed to create API key: ${res.status}`);
    return res.json() as Promise<ApiKey>;
  },
};
