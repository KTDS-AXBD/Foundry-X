import type { BuilderConfig } from './types.js';

/** API list 엔드포인트가 반환하는 요약 레코드 */
interface JobSummary {
  id: string;
  orgId: string;
  prdTitle: string;
  status: string;
}

/** API 상세 엔드포인트가 반환하는 전체 레코드 (prdContent 포함) */
interface JobDetail extends JobSummary {
  prdContent: string;
  buildLog: string;
  errorMessage: string | null;
}

/** Builder Server가 processJob에 전달하는 통합 인터페이스 */
export interface PolledJob {
  id: string;
  projectId: string;  // API의 orgId
  name: string;       // API의 prdTitle
  prdContent: string;
  feedbackContent: string | null;
}

/**
 * 단일 Job의 상세 정보를 가져옴 (prdContent 포함)
 */
async function fetchJobDetail(
  id: string,
  config: Pick<BuilderConfig, 'apiBaseUrl' | 'apiToken'>,
): Promise<JobDetail | null> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/builder/jobs/${id}`,
    {
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) return null;
  return await response.json() as JobDetail;
}

/**
 * Foundry-X API에서 대기 중인 Prototype Job을 폴링
 * list → 개별 상세 조회로 prdContent 확보
 */
export async function pollForJobs(
  config: Pick<BuilderConfig, 'apiBaseUrl' | 'apiToken'>,
): Promise<PolledJob[]> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/builder/jobs?status=queued`,
    {
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`API polling failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { items: JobSummary[] };
  const jobs: PolledJob[] = [];

  for (const summary of data.items) {
    const detail = await fetchJobDetail(summary.id, config);
    if (detail) {
      jobs.push({
        id: detail.id,
        projectId: detail.orgId,
        name: detail.prdTitle,
        prdContent: detail.prdContent,
        feedbackContent: null,
      });
    }
  }

  return jobs;
}

/**
 * feedback_pending 상태의 Job을 폴링 (피드백 재생성 대상)
 */
export async function pollForFeedbackJobs(
  config: Pick<BuilderConfig, 'apiBaseUrl' | 'apiToken'>,
): Promise<PolledJob[]> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/builder/jobs?status=feedback_pending`,
    {
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Feedback polling failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { items: JobSummary[] };
  const jobs: PolledJob[] = [];

  for (const summary of data.items) {
    const detail = await fetchJobDetail(summary.id, config);
    if (detail) {
      jobs.push({
        id: detail.id,
        projectId: detail.orgId,
        name: detail.prdTitle,
        prdContent: detail.prdContent,
        feedbackContent: null, // 피드백은 별도 API에서 가져와야 함
      });
    }
  }

  return jobs;
}

/**
 * Prototype 상태를 API에 갱신
 */
export async function updatePrototypeStatus(
  id: string,
  update: Record<string, unknown>,
  config: Pick<BuilderConfig, 'apiBaseUrl' | 'apiToken'>,
): Promise<void> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/builder/jobs/${id}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    },
  );

  if (!response.ok) {
    throw new Error(`Status update failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * 폴링 루프 시작 — 주어진 간격으로 반복 실행
 */
export function startPollingLoop(
  handler: () => Promise<void>,
  intervalMs: number,
): { stop: () => void } {
  let running = true;
  let timeoutId: ReturnType<typeof setTimeout>;

  const loop = async () => {
    if (!running) return;
    try {
      await handler();
    } catch (err) {
      console.error('[Poller] Error:', err);
    }
    if (running) {
      timeoutId = setTimeout(loop, intervalMs);
    }
  };

  void loop();

  return {
    stop() {
      running = false;
      clearTimeout(timeoutId);
    },
  };
}
