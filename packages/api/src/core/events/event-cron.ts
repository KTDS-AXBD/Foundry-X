// ─── F398+F406: 도메인 이벤트 Cron 핸들러 + 유실 복구 (Sprint 185+191) ───

import type { Env } from '../../env.js';
import { D1EventBus } from '@foundry-x/shared';

export async function processDomainEvents(env: Env): Promise<void> {
  // D1Database is structurally compatible with D1LikeDatabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bus = new D1EventBus(env.DB as any);

  // 1. 일반 pending 이벤트 처리
  const processed = await bus.poll();

  // 2. 실패 이벤트 재시도 (next_retry_at 도달한 것만)
  const retried = await bus.retry();

  if (processed > 0 || retried > 0) {
    console.log(`[event-cron] processed=${processed} retried=${retried}`);
  }
}
