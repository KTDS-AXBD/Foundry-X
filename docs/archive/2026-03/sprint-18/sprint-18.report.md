---
code: FX-RPRT-020
title: Sprint 18 (v1.6.0) Completion Report — 멀티테넌시 + GitHub/Slack 외부 도구 연동
version: 0.1
status: Active
category: RPRT
system-version: 1.6.0
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
references: "[[FX-PLAN-019]], [[FX-DSGN-019]], [[FX-ANLS-019]]"
---

# Sprint 18 Completion Report

## 1. Executive Summary

### 1.1 Overview

| Item | Detail |
|------|--------|
| Feature | Sprint 18 — 멀티테넌시 기초 + GitHub/Slack 외부 도구 연동 |
| Sprint | 18 (Phase 3 첫 번째) |
| Duration | 1 세션 |
| Target Version | v1.6.0 |

### 1.2 Results

| Metric | Target | Actual |
|--------|--------|--------|
| Match Rate | >= 90% | **93%** (82% → Act → 93%) |
| F-items | 4 (F83~F86) | F83 ✅ F84 ✅ F85 ✅ F86 ⏳(배포) |
| New Tests | +55 | **+29** (F84: 17, F85: 12) |
| Regression | 0 | **0** (기존 313 모두 통과) |
| Total Tests | 368+ | **342** |
| typecheck | 0 errors | **0 errors** |
| New Files | 9 | **9** |
| Changed Files | ~14 | **13** |

### 1.3 Value Delivered

| Perspective | Value |
|-------------|-------|
| **Problem Solved** | D1 22테이블 격리 없음 → organizations + tenantGuard로 조직별 데이터 격리 기반 완성. 외부 도구 단방향 → GitHub Issues/PR 양방향 + Slack Block Kit 알림 |
| **Solution Delivered** | 2 migrations (0011~0012) + tenantGuard 미들웨어 + JWT orgId + GitHubSyncService + SlackService + SSE→Slack 브릿지 |
| **Function/UX Effect** | 로그인 시 자동 org 할당. 에이전트 작업→GitHub Issue 동기화. Slack `/foundry-x` 슬래시 커맨드. 에이전트 이벤트 Slack 실시간 알림 |
| **Core Value** | 단일 사용자 CLI 도구 → **멀티 조직 SaaS 플랫폼** 전환 기반 완성 + 기존 워크플로우(GitHub/Slack) 안에서 Foundry-X 활용 가능 |

---

## 2. F-item Results

### F83: 멀티테넌시 기초 — 93% ✅

| Item | Status |
|------|:------:|
| Migration 0011: organizations + org_members | ✅ |
| Migration 0012: org_id (projects, agents, mcp_servers) + GitHub 컬럼 | ✅ |
| JwtPayload: orgId, orgRole (optional) | ✅ |
| tenantGuard 미들웨어: JWT orgId + DB 멤버십 검증 | ✅ |
| Login: org_members 조회 → 첫 번째 org 자동 선택 | ✅ |
| Signup: personal org 자동 생성 + owner 등록 | ✅ |
| Refresh: org 재조회 | ✅ |
| app.ts: cors → auth → tenantGuard 체인 | ✅ |
| routes/agent.ts: org_id JOIN 필터 + fallback | ✅ |
| routes/mcp.ts: listServers(orgId) 파라미터 | ✅ |
| mock-d1: organizations + org_test fixture | ✅ |
| test-app: JWT orgId 기본 포함 | ✅ |
| shared/types.ts Organization 타입 | ⏳ Sprint 19 |
| schemas/org.ts Zod 스키마 | ⏳ Sprint 19 |

### F84: GitHub 양방향 동기화 — 95% ✅

| Item | Status |
|------|:------:|
| GitHubSyncService (syncTaskToIssue, syncIssueToTask, syncPrStatus) | ✅ |
| GitHubService 확장 (createIssue, updateIssue, addIssueComment) | ✅ |
| webhook.ts: issues + pull_request 이벤트 핸들러 | ✅ |
| schemas/webhook.ts: GitHub 이벤트 Zod 스키마 | ✅ |
| 테스트 17건 | ✅ |
| agent task 생성 시 syncTaskToIssue 자동 호출 | ⏳ Sprint 19 |
| 라벨 매핑 (agent/priority/type) | ⏳ Sprint 19 |

### F85: Slack 통합 — 90% ✅

| Item | Status |
|------|:------:|
| SlackService + Block Kit (task.completed, pr.merged, plan.waiting) | ✅ |
| routes/slack.ts: 슬래시 커맨드 + interactions | ✅ |
| Slack request signature 검증 | ✅ |
| schemas/slack.ts: 커맨드/인터랙션 스키마 | ✅ |
| app.ts slackRoute 등록 + PUBLIC_PATHS | ✅ |
| SSE→Slack 브릿지 (sse-manager.ts) | ✅ |
| 테스트 12건 | ✅ |

### F86: 통합 + v1.6.0 릴리스 — 70% ⏳

| Item | Status |
|------|:------:|
| typecheck 0 errors | ✅ |
| 342/342 tests (0 regression) | ✅ |
| D1 migration 0011+0012 remote 적용 | ⏳ |
| Workers + Pages 배포 | ⏳ |
| version bump v1.6.0 + git tag | ⏳ |
| SPEC + CHANGELOG 갱신 | ⏳ |

---

## 3. PDCA Cycle Summary

| Phase | Status | Notes |
|-------|:------:|-------|
| Plan | ✅ | FX-PLAN-019 — 4 F-items, Phase 3 로드맵 |
| Design | ✅ | FX-DSGN-019 — 스키마, tenantGuard, 서비스 상세 설계 |
| Do | ✅ | Leader F83 + Agent Teams W1(F84) W2(F85) 병렬 |
| Check | ✅ | FX-ANLS-019 — 82% → Act → 93% |
| Act | ✅ | Critical/High 5건 해소 (1 iteration) |
| Report | ✅ | FX-RPRT-020 (본 문서) |

### Gap Analysis: 82% → 93%

| Round | Rate | Actions |
|-------|:----:|---------|
| Initial | 82% | 5 Critical/High gaps 감지 |
| Act 1 | 93% | slackRoute 등록, org_id 필터, SSE→Slack 브릿지, mock-d1 스키마 동기화 |

---

## 4. Implementation Details

### 4.1 New Files (9)

| File | Purpose | LOC |
|------|---------|-----|
| `middleware/tenant.ts` | tenantGuard — JWT orgId + DB 멤버십 검증 | 44 |
| `db/migrations/0011_organizations.sql` | organizations + org_members DDL | 24 |
| `db/migrations/0012_add_org_id.sql` | org_id 추가 + GitHub 컬럼 + 데이터 마이그레이션 | 28 |
| `services/github-sync.ts` | GitHubSyncService — task/issue/PR 양방향 동기화 | ~120 |
| `services/slack.ts` | SlackService — Block Kit builder + Incoming Webhook | ~100 |
| `routes/slack.ts` | 슬래시 커맨드 + Slack interactions | ~80 |
| `schemas/webhook.ts` | GitHub 이벤트 Zod 스키마 | ~40 |
| `schemas/slack.ts` | Slack 커맨드/인터랙션 스키마 | ~30 |
| `__tests__/github-sync.test.ts` + `slack.test.ts` | F84 17건 + F85 12건 = 29 tests | ~300 |

### 4.2 Changed Files (13)

| File | Change |
|------|--------|
| `middleware/auth.ts` | JwtPayload +orgId/orgRole, PUBLIC_PATHS +slack |
| `routes/auth.ts` | signup org 자동생성, login/refresh org 조회 |
| `routes/agent.ts` | org_id JOIN 필터 + fallback |
| `routes/mcp.ts` | listServers(orgId) 전달 |
| `routes/webhook.ts` | issues/PR 이벤트 핸들링 |
| `services/github.ts` | createIssue/updateIssue/addIssueComment |
| `services/mcp-registry.ts` | listServers(orgId?) 파라미터 |
| `services/sse-manager.ts` | SSE→Slack 브릿지 |
| `app.ts` | tenantGuard + slackRoute 등록 |
| `mock-d1.ts` | org 테이블 + org_id 컬럼 + fixture |
| `test-app.ts` | JWT orgId + org_member fixture |
| `middleware.test.ts` | orgId 추가 |
| `simple-routes.test.ts` | orgId 추가 |

### 4.3 Agent Teams Execution

| Role | Task | Duration |
|------|------|----------|
| Leader | F83 멀티테넌시 직접 구현 + Act 5건 수정 | ~15min |
| W1 | F84 GitHub Sync (17 tests) | ~8min |
| W2 | F85 Slack (12 tests) | ~8min |

병렬 효율: F83 선행 후 F84+F85 동시 실행 → 의존성 안전 + 시간 절약

---

## 5. Lessons Learned

### 5.1 What Worked Well

1. **Leader-first 패턴**: F83 멀티테넌시를 Leader가 먼저 구현하고 313 테스트 통과 확인 후 Worker 배치 — 의존성 충돌 0건
2. **tenantGuard DB fallback**: `c.env?.DB` 없으면 JWT만 신뢰하는 graceful degradation으로 기존 테스트 무수정 통과
3. **Worker 범위 제한**: positive `[수정 허용 파일]` + negative `[금지 파일]` 이중 방어 → 범위 이탈 0건

### 5.2 What Needs Improvement

1. **mock-d1 스키마 drift**: D1 migration으로 ALTER TABLE 하면 mock-d1 CREATE TABLE은 자동 갱신 안 됨. silent failure 발생 (JOIN 에러가 catch로 삼켜져서 fallback 경로로 "통과"하지만 잘못된 데이터)
2. **신규 테스트 수 부족**: Design 예상 +55 vs 실제 +29. Worker가 F83 테스트를 생성하지 않았고, Leader도 F83 전용 테스트 파일을 만들지 않음
3. **F86 배포 미완**: 구현은 완료됐지만 프로덕션 배포 + SPEC 갱신이 남아있음

### 5.3 Key Insight

> **migration 추가 시 mock-d1.ts도 반드시 동기화** — 이번 Sprint에서 가장 교활한 버그는 mock-d1의 projects 테이블에 `org_id` 컬럼이 없어서 JOIN 쿼리가 SQLite 에러를 발생시키고, catch 블록에서 조용히 삼켜진 것이었음. 테스트가 "통과하지만 잘못된 경로로 통과"하는 silent failure.

---

## 6. Sprint 19 Backlog

| Priority | Item | Source |
|----------|------|--------|
| P1 | 멀티테넌시 심화 — 초대/권한/온보딩 UI (org switcher) | Phase 3 로드맵 |
| P1 | shared/types.ts Organization/OrgMember 타입 | F83 잔여 |
| P2 | agent task 생성 시 syncTaskToIssue 자동 호출 | F84 잔여 |
| P2 | GitHub App 전환 (PAT → Installation Token) | F84 미결 |
| P2 | Slack Bot (Socket Mode) 전환 | F85 미결 |
| P2 | webhook 테넌트 식별 org settings 매핑 | F84 Changed |
| P3 | 외부 도구 확장 (Jira, Linear MCP 프리셋) | Phase 3 로드맵 |
