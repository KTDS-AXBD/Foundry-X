---
code: FX-RPRT-021
title: Sprint 21 — F93 GitHub 양방향 동기화 고도화 완료 보고서
version: 1.0
status: Active
category: RPRT
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: F93
req: FX-REQ-093
plan: "[[FX-PLAN-024]]"
design: "[[FX-DSGN-024]]"
analysis: "[[FX-ANLS-021]]"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F93: GitHub 양방향 동기화 고도화 |
| 기간 | 2026-03-19 (단일 세션) |
| Match Rate | **93%** |
| 테스트 | 435/435 (신규 +69건) |
| 반복 | 0회 (1st pass에서 93% 달성) |

### 1.3 Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | Sprint 18에서 GitHub webhook 수신과 기본 동기화만 구축됨. Issue→Task 자동 생성 없음, 외부 PR 리뷰 불가, GitHub에서 Foundry-X 명령 불가 |
| **Solution** | Issue→Task 자동 생성(라벨 옵트인) + 외부 PR 리뷰 API + `@foundry-x` 코멘트 인터랙션 + 리뷰 결과 자동 포스팅/라벨링 + Webhook org 라우팅 구현 |
| **Function UX Effect** | GitHub Issue에 `foundry-x` 라벨 → Task 자동 생성 + 에이전트 자동 할당, `@foundry-x review` 코멘트 → AI 리뷰 + 점수/라벨 자동 표시, `POST /github/pr/:prNumber/review` API로 프로그래밍 방식 리뷰 요청 가능 |
| **Core Value** | "Git이 진실" 철학의 양방향 실현 — GitHub를 떠나지 않고 Foundry-X AI 리뷰/태스크 관리 사용 가능. 5개 서브태스크 전부 단일 세션에서 완료. |

### Results Summary

| 항목 | 목표 | 달성 |
|------|------|------|
| Match Rate | ≥ 90% | **93%** ✅ |
| 신규 테스트 | +40건 | **+69건** ✅ (목표 172% 초과) |
| 전체 테스트 | 406+ | **435** ✅ |
| typecheck | 5/5 | **5/5** ✅ |
| 신규 파일 | ~5개 | **5개** ✅ |
| 수정 파일 | ~8개 | **6개** ✅ (효율적) |
| D1 Migration | 없음 | **없음** ✅ |

## §1 PDCA 전주기 요약

### 1.1 Plan (FX-PLAN-024)

- 5개 서브태스크 정의: A(Issue→Task) → B(외부 PR 리뷰) → C(코멘트 인터랙션) → D(자동 포스팅) → E(Org 라우팅)
- Sprint 20(F92 멀티테넌시)에서 분리하여 독립 Sprint 21로 운영
- 기존 코드 6개 파일(github.ts, github-sync.ts, pr-pipeline.ts, reviewer-agent.ts, webhook.ts, schemas/webhook.ts) 분석 기반으로 설계

### 1.2 Design (FX-DSGN-024)

- 10개 섹션, 121개 세부 항목으로 상세 설계
- 핵심 아키텍처 결정:
  - `GitHubReviewService` 신규 서비스 (PrPipelineService에서 분리)
  - `ReviewerAgent` 공유 (기존 LLM 리뷰어 재사용)
  - `foundry-x` 라벨 옵트인 (과잉 Task 생성 방지)
  - PR당 5분 쿨다운 (Rate Limit + 비용 보호)

### 1.3 Do (구현)

**Agent Teams 병렬 구현** (`/ax-git-team`):

| Worker | 역할 | 파일 | 결과 |
|--------|------|------|------|
| W1: 서비스 레이어 | github-sync.ts + github.ts + github-review.ts + 테스트 | 5파일 | ✅ |
| W2: 스키마+라우트 | schemas/ + routes/ + app.ts + 테스트 | 6파일 | ✅ |

- File Guard 이탈: **0건** (완벽한 범위 분리)
- Worker 간 인터페이스 불일치 1건 (GitHubReviewService 5인자 vs 4인자 호출) → typecheck에서 즉시 발견 → 리더가 수정

### 1.4 Check (FX-ANLS-021)

| Section | Rate |
|---------|:----:|
| Issue→Task 자동 생성 | 89% |
| 외부 PR 리뷰 API | 94% |
| PR 코멘트 인터랙션 | 100% |
| 리뷰 결과 포스팅+라벨링 | 100% |
| Webhook Org 라우팅 | 100% |
| 에러 처리 | 25% |
| 테스트 | 90% |
| **Overall** | **93%** |

## §2 구현 상세

### 2.1 신규 파일 (5개)

| 파일 | 역할 | LOC |
|------|------|:---:|
| `services/github-review.ts` | 외부 PR 리뷰 서비스 + 커맨드 파서 + 포스팅 | ~320 |
| `routes/github.ts` | POST/GET /github/pr/:prNumber/review | ~116 |
| `schemas/github.ts` | prNumberParamsSchema + externalReviewResultSchema | ~22 |
| `__tests__/github-review.test.ts` | 리뷰 서비스 + 파서 테스트 (16건) | ~250 |
| `__tests__/webhook-comment.test.ts` | 코멘트 인터랙션 테스트 (12건) | ~200 |

### 2.2 수정 파일 (6개)

| 파일 | 변경 | Delta |
|------|------|:-----:|
| `services/github-sync.ts` | createTaskFromIssue() + 라벨 유틸리티 + 에이전트 자동 할당 | +80 |
| `services/github.ts` | addLabels(), removeLabel() | +25 |
| `routes/webhook.ts` | issue_comment 핸들러 + resolveOrgFromWebhook() | +120 |
| `schemas/webhook.ts` | githubCommentEventSchema | +20 |
| `app.ts` | githubRoute 등록 + GitHub 태그 | +8 |
| `__tests__/github-sync.test.ts` | Issue→Task 자동 생성 테스트 (+8건) | +80 |

### 2.3 API 엔드포인트 변경

| 상태 | Method | Path | 설명 |
|:----:|--------|------|------|
| 신규 | POST | `/github/pr/{prNumber}/review` | 외부 PR AI 리뷰 요청 |
| 신규 | GET | `/github/pr/{prNumber}/review` | 리뷰 결과 조회 |
| 확장 | POST | `/webhook/git` | issue_comment 이벤트 추가 |

**API 엔드포인트 합계: 63개** (기존 61 + 신규 2)

### 2.4 주요 기능

#### A. Issue→Task 자동 생성
- `foundry-x` 라벨 옵트인: 라벨 없는 Issue는 무시
- 라벨 → task_type 매핑: bug→bug-fix, enhancement→feature, refactor, docs, 기본 task
- 라벨 → agent 자동 할당: `agent:reviewer`→reviewer-agent, `agent:planner`→planner-agent, `agent:runner`→agent-runner
- 중복 방지: github_issue_number 기준

#### B. 외부 PR 리뷰 API
- `POST /github/pr/:prNumber/review` — diff 가져오기 → LLM 리뷰 → GitHub 포스팅 → 라벨링
- `GET /github/pr/:prNumber/review` — 결과 조회
- agent_prs 자동 upsert (외부 PR은 agent_id='external', task_id=NULL)
- 5분 쿨다운 보호 (ReviewCooldownError → 429)

#### C. PR 코멘트 인터랙션
- `@foundry-x review` — AI 리뷰 실행
- `@foundry-x status` — 리뷰 상태 코멘트로 응답
- `@foundry-x approve` — 리뷰 게이트 강제 통과
- `@foundry-x help` — 사용 가능한 커맨드 안내
- PR 코멘트만 처리 (issue.pull_request 존재 여부 판별)

#### D. 리뷰 결과 자동 포스팅 + 라벨링
- GitHub Review API (APPROVE/REQUEST_CHANGES/COMMENT) 활용
- 점수 기반 라벨: sdd:pass/needs-work, quality:good/needs-work, security:review-needed, fx-approved
- 이전 fx-* 라벨 자동 정리 후 새 라벨 추가

#### E. Webhook Org 라우팅
- `resolveOrgFromWebhook()`: 글로벌 시크릿 → org별 시크릿 → org_default 폴백
- organizations.settings JSON에 webhookSecret 필드 지원
- 기존 하드코딩 "org_default" 제거

## §3 테스트 결과

### 3.1 테스트 수치

| 패키지 | 이전 | 이후 | 변화 |
|--------|:----:|:----:|:----:|
| API | 366 | **435** | +69 |
| CLI | 106 | 106 | - |
| Web | 45 | 45 | - |
| E2E | 20 | 20 | - |
| **전체** | **537** | **606** | **+69** |

### 3.2 신규 테스트 분포

| 파일 | 건수 | 커버 범위 |
|------|:----:|----------|
| github-review.test.ts | 16 | 리뷰 서비스 전체 + 커맨드 파서 |
| webhook-comment.test.ts | 12 | issue_comment 핸들러 + org 라우팅 |
| github-sync.test.ts (+8) | 8 | Issue→Task 자동 생성 + 라벨 매핑 |
| 기존 테스트 내 추가 | 33 | 기존 파일 확장 |

### 3.3 typecheck

```
5/5 패키지 통과 ✅
- @foundry-x/cli ✅
- @foundry-x/shared ✅
- @foundry-x/api ✅
- @foundry-x/web ✅ (캐시)
- root ✅ (캐시)
```

## §4 미해결 항목 (백로그)

| # | 항목 | 영향 | 권장 시기 |
|:-:|------|:----:|----------|
| 1 | `PrNotFoundError` 에러 클래스 | Low | Sprint 22+ |
| 2 | Rate Limit 보호 (remaining < 100 → 429) | Medium | 실 운영 전 |
| 3 | LLM 일일 리뷰 제한 카운트 | Medium | 실 운영 전 |
| 4 | 테스트 3건 (clean labels, API error, LLM error) | Low | Sprint 22+ |

## §5 학습 포인트

### 5.1 Agent Teams 효과

- 2명 Worker 병렬 구현으로 서비스+라우트 동시 작업
- File Guard 이탈 0건 — Positive File Constraint가 효과적
- Worker 간 인터페이스 불일치(Constructor 인자 수)는 typecheck가 즉시 포착 → **TypeScript 타입 시스템이 Worker 간 계약 검증 도구로 작동**

### 5.2 설계 결정 검증

- `GitHubReviewService` 분리 (PrPipelineService 변경 없음) → 기존 에이전트 PR 파이프라인에 영향 0
- `foundry-x` 라벨 옵트인 → 과잉 Task 생성 방지 (모든 Issue가 Task로 변환되는 문제 해결)
- `ReviewerAgent` 공유 → LLM 리뷰 로직 중복 없음

### 5.3 Sprint 20(F92)와의 병렬 운영

- 워킹 트리에 F92 미커밋 변경이 있는 상태에서 F93을 진행
- 파일 겹침 없음 (F92는 org/ 관련, F93은 github/ 관련)
- 독립 Sprint로 분리한 결정이 올바름

## §6 다음 단계

- [ ] 코드 커밋 + PR 생성
- [ ] SPEC.md F93 상태 ✅ 갱신 + Sprint 21 마일스톤 추가
- [ ] Workers 배포 (v1.8.0)
- [ ] D1 migration 없음 (기존 스키마로 충분)
- [ ] GitHub webhook 설정 — `issue_comment` 이벤트 추가 필요
