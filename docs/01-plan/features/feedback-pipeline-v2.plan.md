---
code: FX-PLAN-FBV2
title: "피드백 파이프라인 v2 — F476 대시보드 + F477 Agent PR 안정화"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-09
updated: 2026-04-09
author: Claude Opus 4.6
f_items: [F476, F477]
---

# FX-PLAN-FBV2 — 피드백 파이프라인 v2

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | Marker.io 피드백이 들어와도 어디서 확인하는지 모르고, Agent 자동 PR 생성이 실패하고 있어요 |
| **Solution** | Admin 대시보드에서 피드백 현황 확인 + Agent 파이프라인의 권한/워크플로우 문제 해소 |
| **Function UX Effect** | 피드백 제출 → 자동 처리 → 결과 알림까지 E2E 가시성 확보, 수동 개입 최소화 |
| **Core Value** | 팀원/사용자의 피드백이 블랙홀에 빠지지 않고 투명하게 추적·처리되는 피드백 루프 완성 |

| 항목 | 값 |
|------|-----|
| Feature | F476 피드백 대시보드 + F477 Agent PR 안정화 |
| 우선순위 | P2 |
| 변경 패키지 | web (routes + components + api-client) / scripts (feedback-consumer.sh) |

## §1 배경 및 현황

### 현재 파이프라인 (Sprint 129 F309 + Sprint 137 F319~F320)

```
Marker.io 위젯 → GitHub Issue → Webhook → D1 feedback_queue → consumer.sh → claude -p → PR
```

### 문제점 (세션 #235 진단)

| # | 문제 | 영향 |
|---|------|------|
| 1 | **피드백 현황 UI 없음** | 피드백이 들어왔는지, 처리됐는지 확인할 방법이 API 직접 호출뿐 |
| 2 | **Agent PR 생성 실패** | `claude -p`가 권한 승인 없이 Edit/Bash 실행 불가 → 코드 분석만 하고 수정 미적용 |
| 3 | **Marker.io 라벨 누락** | Marker.io가 `visual-feedback` 라벨 자동 부착 미지원 → ✅ F475에서 제목 패턴 감지로 해결 |
| 4 | **상태 변경 알림 없음** | 피드백 제출자가 처리 결과를 알 수 없음 → ✅ F475에서 Issue 코멘트 자동화로 해결 |

## §2 F476 — 피드백 관리 대시보드

### 2.1 목표

Admin 메뉴 Portal 서비스 그룹에 "피드백" 페이지를 추가하여 feedback_queue 현황을 한눈에 확인하고 상태를 관리할 수 있게 한다.

### 2.2 UI 구성

```
/feedback-dashboard (Admin 전용)
┌─────────────────────────────────────────────┐
│ 📋 피드백 관리                                │
│                                               │
│ [전체 4] [대기 1] [처리중 0] [완료 1] [실패 2] │  ← 상태 필터 탭
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ #386 | API409 error occurred!      ⏳ 대기 │ │  ← 카드 목록
│ │ 2026-04-08 | Issue #386                   │ │
│ ├───────────────────────────────────────────┤ │
│ │ #385 | Fix business plan display   ❌ 실패 │ │
│ │ 2026-04-08 | 재처리 | 스킵               │ │  ← 액션 버튼
│ ├───────────────────────────────────────────┤ │
│ │ #383 | Add editing of PRD          ❌ 실패 │ │
│ │ 2026-04-08 | 에러: No PR created          │ │
│ ├───────────────────────────────────────────┤ │
│ │ #364 | Fix login button            ✅ 완료 │ │
│ │ 2026-04-07 | PR #365                      │ │  ← PR 링크
│ └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 2.3 변경 범위

| 파일 | 변경 내용 |
|------|----------|
| `packages/web/src/routes/feedback-dashboard.tsx` | **신규** — 피드백 목록 + 상태 필터 + 상세 뷰 |
| `packages/web/src/lib/api-client.ts` | feedback-queue API 호출 함수 추가 |
| `packages/web/content/navigation/sidebar.json` | admin-portal 그룹에 피드백 메뉴 추가 |
| `packages/web/src/routes.ts` | 라우트 등록 (lazy import) |

### 2.4 API 연동

기존 API 그대로 사용 (추가 개발 불필요):

| 호출 | 엔드포인트 | 용도 |
|------|-----------|------|
| 목록 | `GET /api/feedback-queue?status=&limit=&offset=` | 상태별 목록 |
| 상세 | `GET /api/feedback-queue/{id}` | 카드 클릭 시 상세 |
| 상태 변경 | `PATCH /api/feedback-queue/{id}` | 재처리/스킵 버튼 |

**인증**: `X-Webhook-Secret` 헤더 → 프론트엔드에서는 직접 사용 불가. JWT 인증 경로를 추가하거나, 프록시 미들웨어 필요.

### 2.5 인증 고려사항

현재 feedback-queue API는 `X-Webhook-Secret` 헤더로만 인증해요. Admin 대시보드에서 호출하려면:

**방안 A (권장)**: app.ts의 feedback-queue 미들웨어에 JWT 인증 fallback 추가
```typescript
// JWT 토큰이 있고 admin 역할이면 허용
if (jwtPayload?.role === "admin") return next();
// 기존 Webhook Secret 인증
if (secret === env.WEBHOOK_SECRET) return next();
```

**방안 B**: 별도 admin-only 라우트 `/api/admin/feedback` 추가 (기존 JWT 미들웨어 활용)

## §3 F477 — Agent 자동 PR 생성 안정화

### 3.1 근본 원인

`feedback-consumer.sh:87`에서 `claude -p --max-turns 20`으로 Agent를 실행하지만:
- pipe 모드는 비대화형 → Edit/Bash 도구 실행 시 **권한 승인을 받을 수 없음**
- Agent가 코드를 분석하고 수정 계획을 세우지만, 실제 파일 수정과 `gh pr create`가 차단됨
- 결과: error_message에 `Edit (pending approval)` 기록

### 3.2 수정 사항

| # | 수정 | 파일 | 설명 |
|---|------|------|------|
| 1 | `--dangerously-skip-permissions` 추가 | `scripts/feedback-consumer.sh:87` | ✅ F475에서 이미 수정 |
| 2 | Agent 프롬프트 개선 | `scripts/feedback-consumer.sh:74-84` | PR 생성까지 명확한 지시 + 커밋 메시지 규격 |
| 3 | git clean 보장 | `scripts/feedback-consumer.sh:62-65` | stash/clean으로 dirty 상태 방지 |
| 4 | PR URL 추출 강화 | `scripts/feedback-consumer.sh:91` | grep 패턴 확장 + fallback |
| 5 | 재처리 메커니즘 | `scripts/feedback-consumer.sh` | failed 항목 자동 retry (max 3회) |
| 6 | 로그 보존 | `scripts/feedback-consumer.sh` | Agent 전체 로그를 `agent_log` 컬럼에 저장 |

### 3.3 개선된 Agent 프롬프트

```
GitHub Issue #{num}: {title}

{body}

이 피드백을 분석하고 수정해주세요:
1. Issue 내용과 스크린샷 설명을 분석하세요
2. packages/web/src/ 에서 관련 파일을 찾으세요
3. 코드를 수정하세요
4. typecheck를 확인하세요: cd packages/web && npx tsc --noEmit
5. git add로 변경 파일을 스테이징하세요 (개별 파일 지정)
6. git commit -m "fix: [visual-feedback] #{num} — {title}"
7. git push origin {branch}
8. gh pr create --title "fix: [visual-feedback] #{num} — {title}" --body "Closes #{num}"

반드시 PR URL을 출력하세요.
```

### 3.4 git 워크플로우 개선

```bash
# Before (문제)
git checkout master && git pull origin master
git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"

# After (개선)
git checkout master
git stash --include-untracked  # dirty 상태 보호
git pull origin master
git checkout -b "$BRANCH" 2>/dev/null || {
  git checkout "$BRANCH"
  git rebase master
}
```

## §4 구현 순서

### Phase A: 인프라 (F477 — Agent 안정화)

1. `feedback-consumer.sh` 프롬프트 + git 워크플로우 개선
2. failed 항목 1건으로 테스트 실행
3. PR 생성 성공 확인

### Phase B: 프론트엔드 (F476 — 대시보드)

1. app.ts feedback-queue 미들웨어에 JWT admin fallback 추가
2. api-client.ts에 feedback-queue 함수 추가
3. `feedback-dashboard.tsx` 라우트 생성
4. sidebar.json admin-portal에 메뉴 추가
5. E2E 테스트 추가

## §5 성공 기준

| 기준 | 목표 |
|------|------|
| 피드백 대시보드 접근 | Admin 로그인 → 사이드바 → 피드백 → 목록 표시 |
| 상태 필터 | 5개 상태별 필터링 정상 동작 |
| 재처리 | 실패 항목 "재처리" 클릭 → pending 리셋 |
| Agent PR 생성 | pending 항목 → consumer 실행 → PR 생성 성공률 80%+ |
| Issue 코멘트 | 상태 변경 시 GitHub Issue에 자동 코멘트 |

## §6 리스크

| 리스크 | 완화 |
|--------|------|
| `--dangerously-skip-permissions`로 Agent가 의도치 않은 파일 수정 | consumer 프롬프트에 허용 파일 범위 명시 (`packages/web/src/` 한정) |
| 복잡한 피드백(API 에러 등)은 Agent가 해결 못 함 | status=skipped으로 분류 + 수동 처리 안내 코멘트 |
| JWT admin 인증 추가 시 기존 Webhook 인증 깨짐 | fallback 패턴으로 양립 (OR 조건) |
