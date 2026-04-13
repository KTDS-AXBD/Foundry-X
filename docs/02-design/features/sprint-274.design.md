---
feature: F517
req: FX-REQ-545
sprint: 274
status: design
date: 2026-04-13
---

# Sprint 274 Design — F517 메타데이터 트레이서빌리티

## §1 개요

REQ↔F-item↔Sprint↔PR↔Commit 체인을 D1에 저장하고, API + Web UI로 역추적 가능하게 만든다.

## §2 D1 스키마 (Migration 0129, 0130)

### `spec_traceability` (Migration 0129)

```sql
CREATE TABLE IF NOT EXISTS spec_traceability (
  id        TEXT PRIMARY KEY,  -- 'F517'
  req_code  TEXT,              -- 'FX-REQ-545'
  sprint    TEXT,              -- '274'
  title     TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'backlog',
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_spec_trace_req ON spec_traceability(req_code);
CREATE INDEX IF NOT EXISTS idx_spec_trace_sprint ON spec_traceability(sprint);
```

### `sprint_pr_links` (Migration 0130)

```sql
CREATE TABLE IF NOT EXISTS sprint_pr_links (
  id          TEXT PRIMARY KEY,  -- 'sprint-274-pr-538'
  sprint_num  TEXT NOT NULL,     -- '274'
  pr_number   INTEGER NOT NULL,
  f_items     TEXT NOT NULL DEFAULT '[]',  -- JSON array: ['F517']
  branch      TEXT,
  pr_title    TEXT,
  pr_url      TEXT,
  pr_state    TEXT NOT NULL DEFAULT 'open',
  commit_shas TEXT NOT NULL DEFAULT '[]',  -- JSON array (first 10)
  synced_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_spr_links_sprint ON sprint_pr_links(sprint_num);
CREATE INDEX IF NOT EXISTS idx_spr_links_pr ON sprint_pr_links(pr_number);
```

## §3 TraceabilityService

파일: `packages/api/src/services/traceability.service.ts`

```typescript
class TraceabilityService {
  // SPEC.md → spec_traceability upsert
  syncFromSpec(): Promise<{ synced: number }>
  // GitHub API → sprint_pr_links upsert
  syncFromGitHub(): Promise<{ synced: number }>
  // 체인 조회: REQ ID 또는 F-item ID
  getTraceChain(id: string): Promise<TraceChain | null>
  // Changelog 항목에 메타 태깅
  enrichChangelog(content: string): Promise<ChangelogEntry[]>
}
```

### 파싱 규칙

**SPEC.md F-item 행 파싱** (기존 parseFItems 재사용):
- `F517` → `req_code = FX-REQ-545`, `sprint = 274`, `title = ...`

**GitHub PR 파싱**:
- PR body에서 F번호 추출: `/F(\d+)/g`
- branch에서 sprint 번호: `sprint/(\d+)`
- PR title에서도 F번호 fallback

**Changelog 메타 태깅**:
- `- F517 title` → D1 조회 → `req_code`, `sprint`, `pr_number` 추가

## §4 API 엔드포인트

파일: `packages/api/src/routes/work.ts` (기존 확장)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/work/trace` | `?id=FX-REQ-545` or `?id=F517` → TraceChain |
| POST | `/api/work/trace/sync` | SPEC+GitHub 동기화 → `{ synced: { spec, prs } }` |
| GET | `/api/work/changelog` | 기존 + 구조화 메타 포함 |

## §5 파일 매핑 (구현 대상)

| 파일 | 변경 타입 | 내용 |
|------|-----------|------|
| `packages/api/src/db/migrations/0129_spec_traceability.sql` | NEW | spec_traceability 테이블 |
| `packages/api/src/db/migrations/0130_sprint_pr_links.sql` | NEW | sprint_pr_links 테이블 |
| `packages/api/src/services/traceability.service.ts` | NEW | TraceabilityService |
| `packages/api/src/schemas/work.ts` | MODIFY | TraceChainSchema, ChangelogEntrySchema 추가 |
| `packages/api/src/routes/work.ts` | MODIFY | /trace + /trace/sync 엔드포인트 |
| `packages/api/src/env.ts` | CHECK | Env 타입 DB 바인딩 확인 (이미 있음) |
| `packages/web/src/routes/work-management.tsx` | MODIFY | 추적 탭 UI 추가 |
| `packages/api/src/tests/traceability.service.test.ts` | NEW | TDD Red/Green 테스트 |

## §6 타입 정의

```typescript
// TraceChain: 쿼리 결과
interface TraceChain {
  id: string;           // 'FX-REQ-545' or 'F517'
  type: 'req' | 'f_item';
  f_items: Array<{
    id: string;         // 'F517'
    title: string;
    status: string;
    sprint?: string;
    req_code?: string;
    prs: Array<{
      number: number;
      title: string;
      url: string;
      state: string;
      commits: string[];
    }>;
  }>;
}

// ChangelogEntry: 구조화된 changelog 항목
interface ChangelogEntry {
  phase: string;
  title: string;
  items: Array<{
    f_item?: string;
    text: string;
    req_code?: string;
    sprint?: string;
    pr_number?: number;
  }>;
}
```

## §7 테스트 계약 (TDD Red Targets)

### Unit Tests (`traceability.service.test.ts`)

```
describe('TraceabilityService F517', () => {
  it('parseFItemLinks — SPEC fixture에서 REQ/F-item/Sprint 링크 추출')
  it('parsePrLinks — PR 목록에서 F번호/Sprint번호 파싱')
  it('enrichChangelog — changelog 항목에 메타 태깅')
})
```

### API Tests (`work.routes.test.ts` 확장)

```
describe('GET /api/work/trace F517', () => {
  it('유효한 REQ id → 200 + TraceChain 반환')
  it('존재하지 않는 id → 404')
  it('F-item id로도 조회 가능')
})
describe('POST /api/work/trace/sync F517', () => {
  it('sync 성공 → 200 + { synced: { spec: N, prs: M } }')
})
```

## §8 갭 분석 체크리스트

- [ ] spec_traceability 마이그레이션 적용 가능
- [ ] sprint_pr_links 마이그레이션 적용 가능
- [ ] parseFItemLinks() REQ 추출 정확도
- [ ] parsePrLinks() F번호 파싱 정확도
- [ ] GET /api/work/trace 200/404 분기
- [ ] POST /api/work/trace/sync D1 upsert
- [ ] enrichChangelog() 메타 태깅
- [ ] Web UI 추적 탭 렌더링
