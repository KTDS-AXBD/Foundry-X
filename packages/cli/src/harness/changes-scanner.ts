import type { ChangeEntry } from '@foundry-x/shared';
import { parseChanges } from './changes-parser.js';

/** changes/ 디렉토리 전체 스캔 — parseChanges 래퍼 + 정렬 */
export async function scanChanges(cwd: string): Promise<ChangeEntry[]> {
  const changes = await parseChanges(cwd);

  // Sort: proposed first, then approved, then implemented, rejected last
  const statusOrder: Record<ChangeEntry['status'], number> = {
    proposed: 0,
    approved: 1,
    implemented: 2,
    rejected: 3,
  };

  return changes.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}
