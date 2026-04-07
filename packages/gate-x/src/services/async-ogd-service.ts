import type { GateEnv } from "../env.js";
import type { OgdJob } from "../durable-objects/ogd-coordinator.js";
import type { OgdQueueMessage } from "../workers/ogd-queue-worker.js";

export type { OgdJob };

/** AsyncOgdService — Queue + Durable Object 기반 비동기 O-G-D 파이프라인 서비스 */
export class AsyncOgdService {
  constructor(private env: GateEnv) {}

  /**
   * O-G-D 파이프라인 job 제출.
   * DO에 job을 초기화하고 Queue에 첫 번째 phase 메시지를 enqueue한다.
   */
  async submitJob(
    evaluationId: string,
    orgId: string,
    maxPhases = 3,
  ): Promise<OgdJob> {
    const jobId = crypto.randomUUID();

    // DO 인스턴스 가져오기
    const doId = this.env.OGD_COORDINATOR.idFromName(jobId);
    const stub = this.env.OGD_COORDINATOR.get(doId);

    // DO에 job 초기화
    const initRes = await stub.fetch(
      new Request("http://do/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId, evaluationId, orgId, maxPhases }),
      }),
    );

    if (!initRes.ok) {
      const errBody = await initRes.text();
      throw new Error(`Failed to initialize OGD job: ${errBody}`);
    }

    const job = await initRes.json<OgdJob>();

    // Queue에 첫 번째 phase 메시지 enqueue
    const firstMessage: OgdQueueMessage = {
      jobId,
      evaluationId,
      orgId,
      phase: 0,
      maxPhases,
    };
    await this.env.OGD_QUEUE.send(firstMessage);

    return job;
  }

  /**
   * job 상태 조회.
   * DO에서 현재 OgdJob을 가져온다.
   */
  async getJob(jobId: string): Promise<OgdJob | null> {
    try {
      const doId = this.env.OGD_COORDINATOR.idFromName(jobId);
      const stub = this.env.OGD_COORDINATOR.get(doId);

      const res = await stub.fetch(new Request("http://do/job", { method: "GET" }));
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        return null;
      }
      return await res.json<OgdJob>();
    } catch {
      return null;
    }
  }

  /**
   * 완료된 job의 결과 반환.
   * DONE 상태이면 result를 반환, 아직 완료되지 않았으면 null.
   */
  async getResult(jobId: string): Promise<string | null> {
    const job = await this.getJob(jobId);
    if (!job || job.status !== "DONE") {
      return null;
    }
    return job.result ?? null;
  }
}
