---
code: FX-PLAN-024
title: Sprint 21 — GitHub 양방향 동기화 고도화 (PR 자동 리뷰 실 연동 + Issue→Task 자동 생성)
version: 1.0
status: Draft
category: PLAN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: F93
req: FX-REQ-093
priority: P1
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F93: GitHub 양방향 동기화 고도화 — PR 자동 리뷰 실 연동, Issue→Task 자동 생성 |
| 시작일 | 2026-03-19 |
| 예상 범위 | Sprint 21 (API 5~7 endpoints + webhook 확장 + 서비스 3개 수정/신규 + 테스트 +40건) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | Sprint 18(F84)에서 GitHub webhook 수신과 기본 동기화만 구축됨. Issue가 생성돼도 Task가 자동 생성되지 않고, 외부 PR은 리뷰 파이프라인을 탈 수 없으며, GitHub PR 코멘트로 Foundry-X에 명령을 보낼 수 없음 |
| **Solution** | Issue→Task 자동 생성 + 외부 PR 리뷰 API + PR 코멘트 인터랙션(@foundry-x) + 리뷰 결과 GitHub 자동 포스팅 구현 |
| **Function UX Effect** | GitHub Issue 생성 시 Foundry-X Task가 자동 생성되고, 아무 PR에서든 `@foundry-x review`로 AI 리뷰를 받으며, 리뷰 결과가 GitHub PR에 점수/라벨과 함께 자동 표시됨 |
| **Core Value** | GitHub를 떠나지 않고도 Foundry-X의 AI 리뷰/태스크 관리 기능을 사용할 수 있는 진정한 양방향 통합 — "Git이 진실" 철학의 실현 |

## §1 배경

### 1.1 현재 상태 (Sprint 18 F84 구현 완료)

| 구현 완료 | 상세 |
|-----------|------|
| Webhook 수신 | `POST /webhook/git` — push, issues, pull_request 이벤트 처리 |
| Task→Issue (outbound) | `syncTaskToIssue()` — agent_task → GitHub Issue 생성/상태 동기화 |
| Issue→Task (inbound) | `syncIssueToTask()` — 기존 Task의 상태만 업데이트 (신규 생성 ❌) |
| PR→agent_prs (inbound) | `syncPrStatus()` — PR 상태(open/merged/closed) 추적 |
| Agent PR 파이프라인 | `PrPipelineService.createAgentPr()` — 에이전트 생성 코드 → 브랜치 → PR → 리뷰 → 머지 |
| ReviewerAgent | LLM 기반 diff 리뷰 — decision, sddScore, qualityScore, securityIssues 반환 |
| HMAC 서명 검증 | `x-hub-signature-256` → `computeHmacSha256()` |

### 1.2 핵심 갭 (F93에서 해결)

| # | 갭 | 현재 | 목표 | 심각도 |
|:-:|-----|------|------|:------:|
| G1 | Issue→Task **자동 생성** | 기존 Task 매칭만 함 | 새 Issue → agent_task 자동 INSERT | 🔴 |
| G2 | 외부 PR 리뷰 | 에이전트 PR만 리뷰 가능 | 아무 PR이든 GitHub ref로 리뷰 요청 가능 | 🔴 |
| G3 | PR 코멘트 인터랙션 | 미구현 | `@foundry-x review/approve/status` 코멘트 처리 | 🟡 |
| G4 | 리뷰 결과 자동 포스팅 | 에이전트 PR에만 포스팅 | 외부 PR에도 리뷰 코멘트 + 라벨 자동 추가 | 🟡 |
| G5 | Webhook org 라우팅 | 하드코딩 `"org_default"` | org별 webhook secret + org_id 매핑 | 🟡 |

### 1.3 관련 코드

| 파일 | 역할 | LOC |
|------|------|:---:|
| `services/github.ts` | GitHub API wrapper (Octokit 대체, fetch 기반) | 434 |
| `services/github-sync.ts` | 양방향 동기화 (Task↔Issue, PR 상태) | 154 |
| `services/pr-pipeline.ts` | 에이전트 PR 생성→리뷰→머지 파이프라인 | 320 |
| `services/reviewer-agent.ts` | LLM PR 리뷰어 | 133 |
| `routes/webhook.ts` | GitHub Webhook 수신 라우트 | 101 |
| `schemas/webhook.ts` | Zod 스키마 (issues, pull_request 이벤트) | ~60 |

### 1.4 관련 테스트

| 파일 | 테스트 수 | 커버 범위 |
|------|:---------:|----------|
| `github-sync.test.ts` | 17 | Task↔Issue, PR 상태 동기화 |
| `pr-pipeline.test.ts` | 8 | 파이프라인 전체 흐름, 게이트 |
| `reviewer-agent.test.ts` | 8 | LLM 리뷰 파싱, 폴백 |
| `github-pr.test.ts` | 6 | 브랜치/PR 생성 |
| `github-extended.test.ts` | 5 | 머지 큐 메서드 |

## §2 구현 전략

### 2.1 서브태스크 분류

| # | 서브태스크 | 범위 | 우선순위 |
|:-:|-----------|------|:--------:|
| **A** | Issue→Task 자동 생성 | github-sync 확장 + webhook 라우팅 | P1 |
| **B** | 외부 PR 리뷰 API | 신규 라우트 + PR 파이프라인 디커플링 | P1 |
| **C** | PR 코멘트 인터랙션 | webhook `issue_comment` 이벤트 처리 | P1 |
| **D** | 리뷰 결과 자동 포스팅 + 라벨링 | github 서비스 확장 + 포스팅 로직 | P1 |
| **E** | Webhook org 라우팅 | org settings 기반 webhook secret 매핑 | P2 |

### 2.2 구현 순서

```
A (Issue→Task 자동 생성)
  → B (외부 PR 리뷰 API — ReviewerAgent 디커플링)
    → C (PR 코멘트 인터랙션 — webhook 확장)
      → D (리뷰 결과 자동 포스팅 + 라벨링)
        → E (Webhook org 라우팅)
```

**이유**: A는 독립적, B는 ReviewerAgent 재사용을 위해 디커플링 필요, C는 B의 리뷰 API를 호출, D는 B+C의 결과를 GitHub에 포스팅, E는 멀티테넌시(F92) 완성 후 최적.

## §3 서브태스크 A: Issue→Task 자동 생성

### 3.1 현재 → 변경

**현재** (`syncIssueToTask`):
```
Issue webhook → DB에서 github_issue_number 매칭 → 없으면 `no_matching_task` 반환 (무시)
```

**변경 후**:
```
Issue webhook → DB 매칭 시도 → 없으면 → 라벨/제목 파싱 → agent_task 자동 INSERT → 응답
```

### 3.2 자동 생성 로직

`GitHubSyncService.syncIssueToTask()` 확장:

| 조건 | 동작 |
|------|------|
| 기존 Task 있음 | 상태 동기화 (현재와 동일) |
| 기존 Task 없음 + `action === "opened"` | 새 Task 자동 생성 |
| 기존 Task 없음 + 다른 action | 무시 (`no_matching_task`) |

### 3.3 Task 자동 생성 필드 매핑

| agent_tasks 컬럼 | 소스 |
|------------------|------|
| `id` | `task-gh-{issueNumber}-{timestamp}` |
| `agent_id` | `"unassigned"` (기본값, 이후 수동 할당) |
| `task_type` | Issue 라벨에서 추출 (`bug`, `feature`, `task`) |
| `branch` | `github-issue-{issueNumber}` |
| `pr_status` | `"pending"` |
| `github_issue_number` | Issue number |
| `org_id` | webhook 요청의 org_id |
| `result` | Issue body (최대 1000자) |
| `created_at` | `datetime('now')` |

### 3.4 라벨 → task_type 매핑

| GitHub 라벨 | task_type |
|-------------|-----------|
| `bug`, `fix` | `bug-fix` |
| `enhancement`, `feature` | `feature` |
| `refactor` | `refactor` |
| `docs`, `documentation` | `docs` |
| (그 외/없음) | `task` |

### 3.5 중복 방지

- `github_issue_number` 기준으로 중복 체크 (INSERT 전 SELECT)
- 같은 Issue가 `closed` → `reopened`로 올 때는 기존 Task 상태만 업데이트

## §4 서브태스크 B: 외부 PR 리뷰 API

### 4.1 문제

현재 `ReviewerAgent`는 `PrPipelineService.createAgentPr()` 안에서만 호출돼요. 외부(사람이 만든) PR을 리뷰하려면 별도 진입점이 필요해요.

### 4.2 새 API 엔드포인트

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| `POST /github/pr/:prNumber/review` | GitHub PR 번호로 리뷰 요청 | auth |
| `GET /github/pr/:prNumber/review` | 리뷰 결과 조회 | auth |

### 4.3 리뷰 플로우

```
POST /github/pr/42/review
  → GitHubService.getPrDiff(42)
  → ReviewerAgent.reviewPullRequest(diff, context)
  → GitHubService.createPrReview(42, { body, event })
  → GitHubService.addLabels(42, ["sdd-score:85", "quality:92"])
  → DB에 리뷰 결과 저장 (agent_prs 테이블)
  → 응답: { decision, sddScore, qualityScore, summary, comments }
```

### 4.4 agent_prs 레코드 자동 생성

외부 PR은 `agent_prs` 레코드가 없을 수 있어요. 리뷰 요청 시 자동 생성:

```sql
INSERT OR IGNORE INTO agent_prs (id, agent_id, task_id, repo, branch, pr_number, status)
VALUES (?, 'external', 'external-review', ?, ?, ?, 'reviewing')
```

### 4.5 라우트 파일

`packages/api/src/routes/github.ts` 신규 — GitHub 관련 외부 API를 별도 라우트로 분리.

## §5 서브태스크 C: PR 코멘트 인터랙션

### 5.1 webhook `issue_comment` 이벤트 처리

GitHub에서 PR에 달린 코멘트도 `issue_comment` 이벤트로 전달돼요. PR 여부는 `payload.issue.pull_request` 필드로 구분해요.

### 5.2 지원 코멘트 커맨드

| 코멘트 | 동작 |
|--------|------|
| `@foundry-x review` | PR diff를 ReviewerAgent로 리뷰 요청 |
| `@foundry-x status` | 현재 리뷰 상태 코멘트로 응답 |
| `@foundry-x approve` | (admin only) 리뷰 게이트 강제 통과 |
| `@foundry-x help` | 사용 가능한 커맨드 목록 안내 |

### 5.3 파싱 로직

```typescript
function parseFoundryCommand(body: string): { command: string; args: string } | null {
  const match = body.match(/@foundry-x\s+(review|status|approve|help)(?:\s+(.*))?/i);
  if (!match) return null;
  return { command: match[1].toLowerCase(), args: match[2]?.trim() ?? "" };
}
```

### 5.4 Webhook 스키마 확장

`schemas/webhook.ts`에 `githubCommentEventSchema` 추가:

```typescript
export const githubCommentEventSchema = z.object({
  action: z.enum(["created", "edited", "deleted"]),
  comment: z.object({
    id: z.number(),
    body: z.string(),
    user: z.object({ login: z.string() }),
  }),
  issue: z.object({
    number: z.number(),
    pull_request: z.object({ url: z.string() }).optional(),
  }),
});
```

### 5.5 Webhook 라우트 확장

`routes/webhook.ts`에 `issue_comment` 이벤트 분기 추가:

```
if (eventType === "issue_comment") {
  // PR 코멘트인지 확인 (issue.pull_request 존재)
  // @foundry-x 커맨드 파싱
  // 커맨드별 핸들러 호출
}
```

## §6 서브태스크 D: 리뷰 결과 자동 포스팅 + 라벨링

### 6.1 리뷰 결과 GitHub 코멘트 포맷

```markdown
## 🤖 Foundry-X AI Review

| Metric | Score |
|--------|------:|
| SDD Compliance | 85/100 |
| Code Quality | 92/100 |
| Security Issues | 0 |

**Decision:** ✅ Approved

### Comments
- `src/app.ts:42` ⚠️ Consider extracting this into a helper function
- `src/routes/auth.ts:15` ℹ️ Good use of middleware chaining

---
_Reviewed by [Foundry-X](https://fx.minu.best) AI Reviewer_
```

### 6.2 자동 라벨링

리뷰 완료 후 PR에 라벨 자동 추가:

| 조건 | 라벨 |
|------|------|
| sddScore >= 80 | `sdd:pass` |
| sddScore < 80 | `sdd:needs-work` |
| qualityScore >= 70 | `quality:good` |
| qualityScore < 70 | `quality:needs-work` |
| securityIssues > 0 | `security:review-needed` |
| decision === "approve" | `fx-approved` |

### 6.3 GitHubService 확장

```typescript
// 기존 메서드에 추가
addLabels(issueOrPrNumber: number, labels: string[]): Promise<void>
removeLabels(issueOrPrNumber: number, labels: string[]): Promise<void>
```

## §7 서브태스크 E: Webhook Org 라우팅

### 7.1 현재 문제

`webhook.ts`에서 org_id가 `"org_default"`로 하드코딩돼 있어요:
```typescript
const sync = new GitHubSyncService(github, c.env.DB, "org_default");
```

### 7.2 해결: org settings 기반 매핑

1. `organizations.settings` JSON에 `webhookSecret` 필드 추가
2. Webhook 수신 시 HMAC 서명으로 org 식별:
   - 모든 org의 webhookSecret으로 서명 검증 시도
   - 매칭된 org의 org_id 사용
3. 매칭 안 되면 글로벌 `WEBHOOK_SECRET`으로 폴백 (기존 동작 유지)

### 7.3 성능 고려

- org 수가 적은 동안 (< 50개) 선형 탐색 OK
- 향후 캐싱 또는 webhook URL 분리 (`/webhook/git/:orgSlug`) 고려

## §8 테스트 전략

### 8.1 API 테스트 (예상 +40건)

| 범위 | 테스트 항목 | 예상 건수 |
|------|------------|:---------:|
| Issue→Task 자동 생성 | 신규 생성, 라벨 매핑, 중복 방지, reopened 처리 | 8 |
| 외부 PR 리뷰 API | 리뷰 요청, 결과 조회, agent_prs 자동 생성, diff 에러 | 8 |
| PR 코멘트 인터랙션 | @foundry-x review/status/approve/help, 비PR 코멘트 무시 | 10 |
| 리뷰 결과 포스팅 | 코멘트 포맷, 라벨 추가/교체, 스코어 기반 분기 | 8 |
| Webhook org 라우팅 | org별 서명 검증, 폴백, 미매칭 거부 | 6 |

### 8.2 기존 테스트 영향

| 파일 | 영향 |
|------|------|
| `github-sync.test.ts` | Issue→Task 자동 생성 케이스 추가 (+4) |
| `pr-pipeline.test.ts` | 영향 없음 (기존 파이프라인 변경 없음) |
| `reviewer-agent.test.ts` | 영향 없음 |

## §9 D1 Migration

이번 Sprint에서 D1 스키마 변경은 **없어요**. 기존 `agent_tasks`, `agent_prs` 테이블의 컬럼으로 충분해요.

- `agent_tasks.github_issue_number` — 이미 존재 ✅
- `agent_prs.pr_number` — 이미 존재 ✅
- `organizations.settings` — JSON 필드 (webhook secret 저장용) ✅

## §10 변경 파일 예상

### 신규 파일 (~5개)

| 파일 | 용도 |
|------|------|
| `packages/api/src/routes/github.ts` | 외부 PR 리뷰 API 라우트 |
| `packages/api/src/schemas/github.ts` | GitHub API Zod 스키마 |
| `packages/api/src/__tests__/github-review.test.ts` | 외부 PR 리뷰 테스트 |
| `packages/api/src/__tests__/github-comment.test.ts` | PR 코멘트 인터랙션 테스트 |
| `packages/api/src/__tests__/webhook-org.test.ts` | Webhook org 라우팅 테스트 |

### 수정 파일 (~8개)

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/services/github-sync.ts` | Issue→Task 자동 생성 로직 추가 |
| `packages/api/src/services/github.ts` | `addLabels()`, `removeLabels()` 메서드 추가 |
| `packages/api/src/routes/webhook.ts` | `issue_comment` 이벤트 분기 + org 라우팅 |
| `packages/api/src/schemas/webhook.ts` | `githubCommentEventSchema` 추가 |
| `packages/api/src/app.ts` | github 라우트 등록 |
| `packages/api/src/__tests__/github-sync.test.ts` | 자동 생성 테스트 추가 |
| `packages/api/src/__tests__/helpers/mock-d1.ts` | 테스트 헬퍼 확장 (필요시) |
| `packages/shared/src/types.ts` | GitHubReviewRequest/Response 타입 추가 (필요시) |

## §11 위험 요소

| 위험 | 영향 | 완화 |
|------|------|------|
| GitHub API Rate Limit | 리뷰 요청 폭주 시 429 에러 | PR당 1회 리뷰 제한 + 쿨다운 (5분) |
| LLM 비용 증가 | 외부 PR 리뷰로 Claude API 호출 증가 | 일일 리뷰 횟수 제한 (기존 `maxAutoMergePerDay` 활용) |
| Webhook 서명 검증 실패 | org 매핑 불가 → 동기화 중단 | 글로벌 secret 폴백 + 에러 로깅 |
| Issue→Task 과잉 생성 | 모든 Issue가 Task로 변환 | `foundry-x` 라벨이 있는 Issue만 자동 생성 (옵트인) |
| 코멘트 파싱 오류 | 잘못된 커맨드 실행 | 정규식 strict 매칭 + unknown 커맨드 무시 |

## §12 범위 밖 (Not in Scope)

- GitHub Actions CI 통합 (별도 Sprint)
- PR 자동 머지 기능 확장 (기존 게이트 시스템으로 충분)
- GitHub App 설치 플로우 (현재는 PAT 기반)
- Issue 템플릿 자동 생성
- PR 코멘트 이외의 GitHub 인터랙션 (Reactions, Discussions 등)
- Web UI — GitHub 연동 설정 페이지 (F92 Org 설정에서 다룰 수 있음)

## §13 성공 기준

| 기준 | 목표 |
|------|------|
| API 테스트 통과 | +40건 (전체 406+) |
| Match Rate | ≥ 90% |
| typecheck | ✅ 5/5 패키지 |
| Issue→Task E2E | GitHub Issue 생성 → webhook → agent_task 자동 생성 확인 |
| 외부 PR 리뷰 E2E | `POST /github/pr/N/review` → 리뷰 결과 + GitHub 코멘트 확인 |
| 코멘트 인터랙션 E2E | `@foundry-x review` 코멘트 → 리뷰 실행 + 결과 코멘트 확인 |
