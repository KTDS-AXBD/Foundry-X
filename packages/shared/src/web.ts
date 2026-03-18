// ─── Web Dashboard Types (Sprint 5 Part A) ───

/** F27: Wiki 페이지 */
export interface WikiPage {
  slug: string;
  title: string;
  content: string;
  filePath: string;
  lastModified: string;
  author: string;
}

/** F28: 요구사항 아이템 (SPEC.md F-item 파싱) */
export interface RequirementItem {
  id: string;
  reqCode: string;
  title: string;
  version: string;
  status: 'planned' | 'in_progress' | 'done';
  note: string;
}

/** F29: ToDo 아이템 */
export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  assignee: string;
  createdAt: string;
}

/** F29: 팀 내 메시지 */
export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  read: boolean;
  sentAt: string;
}

// ─── Sprint 10: Spec Conflict Types (F54) ───

/** F54: Spec 충돌 유형 */
export type SpecConflictType = 'direct' | 'dependency' | 'priority' | 'scope';

/** F54: Spec 충돌 정보 */
export interface SpecConflict {
  type: SpecConflictType;
  severity: 'critical' | 'warning' | 'info';
  existingSpec: {
    id: string;
    title: string;
    field: string;
    value: string;
  };
  newSpec: {
    field: string;
    value: string;
  };
  description: string;
  suggestion?: string;
}

/** F54: 기존 Spec (D1 또는 SPEC.md 파싱) */
export interface ExistingSpec {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  dependencies: string[];
  status: 'planned' | 'in_progress' | 'done';
}

/** F54: 충돌 해결 요청 */
export interface ConflictResolution {
  conflictId: string;
  resolution: 'accept' | 'reject' | 'modify';
  modifiedValue?: string;
}

/** F36: 하네스 신선도 리포트 */
export interface FreshnessReport {
  documents: FreshnessItem[];
  overallStale: boolean;
  checkedAt: string;
}

export interface FreshnessItem {
  file: string;
  lastModified: string;
  codeLastCommit: string;
  stale: boolean;
  staleDays: number;
}
