import type { GateEnv } from "../env.js";
import { callLLM } from "../services/llm/index.js";

export interface OgdQueueMessage {
  jobId: string;
  evaluationId: string;
  orgId: string;
  phase: number;
  maxPhases: number;
}

/** ogdQueueWorker — Cloudflare Queue consumer for O-G-D pipeline phases */
export const ogdQueueWorker = {
  async queue(
    batch: MessageBatch<OgdQueueMessage>,
    env: GateEnv,
  ): Promise<void> {
    for (const msg of batch.messages) {
      const { jobId, evaluationId, orgId, phase, maxPhases } = msg.body;

      try {
        // 1. DO 인스턴스 가져오기
        const doId = env.OGD_COORDINATOR.idFromName(jobId);
        const stub = env.OGD_COORDINATOR.get(doId);

        // 2. DO 상태 → RUNNING
        await stub.fetch(new Request("http://do/start", { method: "POST" }));

        // 3. LLM 호출 (O-G-D 파이프라인 phase 실행)
        const llmResp = await callLLM(
          {
            system: 'You are an AX BD evaluation assistant.',
            prompt: `Evaluate phase ${phase + 1} of O-G-D pipeline for evaluation ID: ${evaluationId} (org: ${orgId}). Provide a concise assessment.`,
            maxTokens: 500,
          },
          env,
        );
        const phaseResult = llmResp.text;

        const isLastPhase = phase + 1 >= maxPhases;

        if (isLastPhase) {
          // 4a. 마지막 phase → /advance + result → DONE
          await stub.fetch(
            new Request("http://do/advance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ result: phaseResult }),
            }),
          );
        } else {
          // 4b. 중간 phase → /advance (result 없이) + 다음 phase enqueue
          await stub.fetch(
            new Request("http://do/advance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            }),
          );

          const nextMessage: OgdQueueMessage = {
            jobId,
            evaluationId,
            orgId,
            phase: phase + 1,
            maxPhases,
          };
          await env.OGD_QUEUE.send(nextMessage);
        }

        msg.ack();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        try {
          const doId = env.OGD_COORDINATOR.idFromName(jobId);
          const stub = env.OGD_COORDINATOR.get(doId);
          await stub.fetch(
            new Request("http://do/fail", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ error: errorMsg }),
            }),
          );
        } catch {
          // DO fail 업데이트 실패 시 무시, retry는 진행
        }
        msg.retry();
      }
    }
  },
};
