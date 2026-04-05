---
code: FX-PLAN-S137
title: "Sprint 137 — F319+F320 Marker.io 피드백 자동화 파이프라인"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 137
f_items: [F319, F320]
---

# FX-PLAN-S137 — Marker.io 피드백 자동화 파이프라인

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F319 Webhook+D1큐 / F320 Agent+PR 자동화 |
| Sprint | 137 |
| 우선순위 | P1 |
| 예상 소요 | ~8h |
| 변경 패키지 | api (routes+services+D1) + scripts (WSL consumer) |

## §1 목표

Marker.io에서 제출된 비주얼 피드백이 GitHub Issue로 생성되면, 이를 자동으로 감지하여 Claude Code Agent가 코드 수정 → 테스트 → PR 생성까지 수행하는 E2E 파이프라인 구축.

## §2 아키텍처

```
[Marker.io Widget] → [GitHub Issue (visual-feedback 라벨)]
                           ↓ webhook
                     [Workers API /webhook/git]
                           ↓ visual-feedback 감지
                     [D1 feedback_queue (pending)]
                           ↓ polling (60s)
                     [WSL consumer script]
                           ↓
                     [Claude Code CLI]
                       ├─ Issue 분석
                       ├─ 코드 수정
                       ├─ typecheck + lint + test
                       └─ PR 생성 (gh pr create)
                           ↓
                     [GitHub PR Review]
                       └─ Approve → merge → deploy.yml 자동 배포
```

## §3 F319: Webhook 수신 + D1 피드백 큐

### 3.1 D1 마이그레이션 (0094)

```sql
CREATE TABLE IF NOT EXISTS feedback_queue (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  github_issue_number INTEGER NOT NULL,
  github_issue_url TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  labels TEXT,  -- JSON array
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','processing','done','failed','skipped')),
  agent_pr_url TEXT,
  agent_log TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_queue_status ON feedback_queue(status);
CREATE INDEX IF NOT EXISTS idx_feedback_queue_org ON feedback_queue(org_id);
```

### 3.2 Webhook 확장

기존 `packages/api/src/routes/webhook.ts`의 Issues 이벤트 핸들러를 확장:

- `action === "opened" || action === "labeled"` 일 때
- `labels`에 `visual-feedback` 포함 시
- `feedback_queue`에 `pending` 상태로 INSERT
- 이미 존재하면 무시 (UNIQUE issue_number)

### 3.3 큐 관리 API (4 endpoints)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/feedback-queue` | 큐 목록 조회 (status 필터, 페이지네이션) |
| GET | `/api/feedback-queue/:id` | 큐 아이템 상세 |
| PATCH | `/api/feedback-queue/:id` | 상태 변경 (processing→done/failed/skipped) |
| POST | `/api/feedback-queue/consume` | 다음 pending 아이템 1건 가져오기 (status→processing 원자적 전환) |

### 3.4 Zod 스키마

`packages/api/src/schemas/feedback-queue.ts`:
- `feedbackQueueItemSchema` — 큐 아이템 응답
- `feedbackQueueListSchema` — 목록 + 페이지네이션
- `feedbackQueueConsumeSchema` — consume 응답

### 3.5 서비스

`packages/api/src/services/feedback-queue-service.ts`:
- `enqueue(orgId, issueData)` — pending INSERT (중복 방지)
- `consume()` — 가장 오래된 pending 1건 → processing
- `complete(id, prUrl)` — done + PR URL 저장
- `fail(id, error)` — failed + retry_count 증가
- `skip(id, reason)` — skipped
- `list(filter)` — 필터링 조회

## §4 F320: 큐 소비자 + Claude Code Agent

### 4.1 WSL 소비자 스크립트

`scripts/feedback-consumer.sh`:

```bash
#!/bin/bash
# Marker.io 피드백 큐 소비자
# Usage: ./scripts/feedback-consumer.sh [--once] [--interval 60]
#
# API_BASE: Workers API URL
# API_TOKEN: 인증 토큰
# REPO_DIR: Foundry-X 리포 경로

INTERVAL=${INTERVAL:-60}
API_BASE="${API_BASE:-https://foundry-x-api.ktds-axbd.workers.dev}"
REPO_DIR="${REPO_DIR:-$(pwd)}"

while true; do
  # 1. 큐에서 다음 아이템 consume
  ITEM=$(curl -s -X POST "$API_BASE/api/feedback-queue/consume" \
    -H "Authorization: Bearer $API_TOKEN")

  if [ "$(echo "$ITEM" | jq -r '.id // empty')" = "" ]; then
    sleep "$INTERVAL"
    continue
  fi

  ITEM_ID=$(echo "$ITEM" | jq -r '.id')
  ISSUE_NUM=$(echo "$ITEM" | jq -r '.github_issue_number')
  TITLE=$(echo "$ITEM" | jq -r '.title')
  BODY=$(echo "$ITEM" | jq -r '.body')

  # 2. Claude Code Agent 실행
  cd "$REPO_DIR"
  git checkout master && git pull origin master

  PROMPT="GitHub Issue #$ISSUE_NUM: $TITLE

$BODY

이 visual feedback을 분석하고 수정해주세요:
1. 문제 파악 (스크린샷 설명 참고)
2. 관련 파일 찾기
3. 코드 수정
4. typecheck + lint + test 통과 확인
5. PR 생성 (gh pr create)"

  BRANCH="fix/feedback-$ISSUE_NUM"
  git checkout -b "$BRANCH"

  # Claude Code 실행 (pipe 모드)
  RESULT=$(echo "$PROMPT" | claude -p --max-turns 20 2>&1)

  # 3. PR URL 추출 + 상태 업데이트
  PR_URL=$(echo "$RESULT" | grep -oP 'https://github.com/[^ ]+/pull/\d+' | head -1)

  if [ -n "$PR_URL" ]; then
    curl -s -X PATCH "$API_BASE/api/feedback-queue/$ITEM_ID" \
      -H "Authorization: Bearer $API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"status\":\"done\",\"agentPrUrl\":\"$PR_URL\"}"
  else
    curl -s -X PATCH "$API_BASE/api/feedback-queue/$ITEM_ID" \
      -H "Authorization: Bearer $API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"status\":\"failed\",\"errorMessage\":\"No PR created\"}"
  fi

  git checkout master

  [ "$1" = "--once" ] && break
  sleep "$INTERVAL"
done
```

### 4.2 Agent 프롬프트 템플릿

`scripts/feedback-agent-prompt.md` — Claude Code에 전달할 시스템 프롬프트:
- Foundry-X 코드베이스 컨텍스트
- visual feedback 처리 가이드라인
- PR 제목/본문 컨벤션
- 자동화 범위 제한 (Web 패키지 우선)

### 4.3 대시보드 UI (선택)

`packages/web/src/routes/feedback-queue.tsx`:
- 큐 목록 테이블 (status별 색상 뱃지)
- 상세 패널 (Issue 내용 + Agent 로그 + PR 링크)
- 수동 skip/retry 버튼

## §5 구현 순서

| 단계 | 파일 | 작업 | 검증 |
|:----:|------|------|------|
| 1 | D1 migration 0094 | feedback_queue 테이블 | migration apply |
| 2 | schemas/feedback-queue.ts | Zod 스키마 | typecheck |
| 3 | services/feedback-queue-service.ts | 큐 서비스 CRUD | unit test |
| 4 | routes/feedback-queue.ts | 4 API endpoints | API test |
| 5 | routes/webhook.ts | visual-feedback 감지 확장 | webhook test |
| 6 | scripts/feedback-consumer.sh | WSL 소비자 | 수동 테스트 |
| 7 | scripts/feedback-agent-prompt.md | Agent 프롬프트 | — |
| 8 | 전체 검증 | turbo typecheck + test | 회귀 0건 |

## §6 검증 체크리스트

- [ ] D1 migration 0094 적용
- [ ] feedback-queue CRUD API 동작
- [ ] webhook → visual-feedback Issue → queue INSERT
- [ ] consume API → pending→processing 원자적 전환
- [ ] WSL consumer script → Claude Code 실행 → PR 생성
- [ ] typecheck / lint / test 전체 통과
- [ ] 기존 webhook 동작 회귀 없음

## §7 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Claude Code pipe 모드 안정성 | Agent 실패 시 큐 stuck | retry_count + 수동 skip UI |
| 동시 실행 충돌 | 여러 피드백 동시 처리 시 git 충돌 | 순차 처리 (1건씩) |
| WSL 다운 시 큐 누적 | pending 무한 증가 | Cron + 대시보드 알림 |
