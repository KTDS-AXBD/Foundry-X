---
id: FX-DESIGN-261
title: Sprint 261 — F509 fx-work-observability Walking Skeleton
sprint: 261
status: APPROVED
created: 2026-04-12
---

# Sprint 261 Design — F509 fx-work-observability

## 1. 아키텍처

```
Web UI (/work-management)
  └─ 5s polling → GET /api/work/snapshot   ← WorkService.getSnapshot()
  └─ on-demand → GET /api/work/context     ← WorkService.getContext()
  └─ user input → POST /api/work/classify  ← WorkService.classify()

WorkService (CF Workers)
  ├─ parseSpecItems(): GitHub raw SPEC.md → regex → WorkItem[]
  ├─ fetchGithubData(): GitHub REST API → commits + PRs
  ├─ classifyWithLLM(): fetch Anthropic /v1/messages
  └─ classifyWithRegex(): keyword heuristic fallback
```

## 2. API 스펙

### GET /api/work/snapshot
- 인증: 없음 (혼자 모드, read-only)
- 응답: `WorkSnapshotSchema`
```json
{
  "summary": { "backlog": 4, "planned": 1, "in_progress": 0, "done_today": 32 },
  "items": [{ "id": "F509", "title": "...", "status": "planned", "sprint": "261" }],
  "prs": [{ "number": 502, "title": "...", "state": "merged" }],
  "commits": [{ "sha": "ab0c672b", "message": "docs(spec)...", "date": "..." }],
  "generated_at": "2026-04-12T..."
}
```

### GET /api/work/context
- 응답: `WorkContextSchema`
- recent_commits: 최근 10개
- worktrees: [] (Workers에서 불가, 빈 배열)
- daemon_events: [] (로컬 /tmp 불가, 빈 배열)
- next_actions: 자동 추론 문자열 배열

### POST /api/work/classify
- 바디: `{ "text": "자연어 한 줄" }`
- 응답: `{ "track": "F", "priority": "P1", "title": "...", "method": "llm" | "regex" }`

## 3. SPEC.md 파싱 전략

GitHub raw URL: `https://raw.githubusercontent.com/{GITHUB_REPO}/master/SPEC.md`
테이블 행 패턴: `| F\d+ | title | Sprint \d+ | emoji | notes |`

Status 매핑:
- 📋 → "backlog"
- 🔧 → "in_progress"
- ✅ → "done"
- 🚫 → "rejected"
- Sprint 있음 + 기타 → "planned"

## 4. Web UI 구조

```
/work-management
├─ Header: "Work Management" + 마지막 갱신 시각
├─ Tab: Kanban | Context | Classify
│
├─ Kanban Tab (기본):
│   ├─ 4컬럼: PLANNED | IN_PROGRESS | DONE | BACKLOG
│   └─ 각 카드: ID, title, sprint, priority badge
│
├─ Context Tab:
│   ├─ 최근 커밋 10개 (sha + message + date)
│   ├─ WT 상태 (Workers에서 불가 → 안내 메시지)
│   └─ 다음 액션 후보 목록
│
└─ Classify Tab:
    ├─ textarea: 자연어 입력
    ├─ POST /api/work/classify
    └─ 결과: track / priority / title badge + method(llm/regex)
```

## 5. 파일 매핑

| 파일 | 역할 |
|------|------|
| `packages/api/src/schemas/work.ts` | Zod 스키마 정의 |
| `packages/api/src/services/work.service.ts` | GitHub API 통합 + NL 분류 |
| `packages/api/src/routes/work.ts` | 3개 엔드포인트 |
| `packages/web/src/routes/work-management.tsx` | Kanban + Context + Classify UI |
| `packages/api/src/app.ts` | workRoute 등록 (Sprint 261) |
| `packages/web/src/router.tsx` | /work-management 라우트 추가 |

## 6. Gap 예상 항목 (의도적 제외)

| 항목 | 사유 |
|------|------|
| /tmp/task-signals 파싱 | CF Workers 로컬 파일 접근 불가 — Walking Skeleton 범위 외 |
| git worktree list | 동일 이유 — daemon events도 동일 |
| D1 캐싱 | Walking Skeleton은 live fetch로 충분 |
| 편집 UI / RBAC | Out of Scope 명시 |
