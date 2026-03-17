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
