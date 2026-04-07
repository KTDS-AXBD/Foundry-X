// ─── F398: 도메인 이벤트 Cron 핸들러 (Sprint 185) ───

import type { Env } from '../../env.js';
import { D1EventBus } from '@foundry-x/harness-kit/events';

export async function processDomainEvents(env: Env): Promise<void> {
  // D1Database is structurally compatible with D1LikeDatabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bus = new D1EventBus(env.DB as any);
  const count = await bus.poll();
  if (count > 0) {
    console.log(`[event-cron] processed ${count} domain events`);
  }
}
