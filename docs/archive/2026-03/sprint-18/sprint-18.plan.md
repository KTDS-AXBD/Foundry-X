---
code: FX-PLAN-019
title: Sprint 18 (v1.6.0) — 멀티테넌시 설계 + GitHub/Slack 외부 도구 연동
version: 0.1
status: Draft
category: PLAN
system-version: 1.6.0
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
---

# Sprint 18 (v1.6.0) Planning Document

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 모든 데이터가 단일 테넌트 구조. 22개 D1 테이블 중 3개만 project_id 격리. 외부 도구(GitHub/Slack)는 단방향 webhook만 존재하여 에이전트 작업 결과가 외부에 전파되지 않음 |
| **Solution** | F83: organizations 테이블 + tenant_id 컬럼 추가 + RLS 미들웨어 / F84: GitHub Issues/PR 양방향 동기화 / F85: Slack 에이전트 알림 + 명령 수신 / F86: 통합 테스트 + 배포 |
| **Function/UX Effect** | 조직별 데이터 격리로 B2B SaaS 기반 마련. 에이전트 작업이 GitHub Issue/Slack에 실시간 반영. Slack에서 에이전트에 직접 지시 가능 |
| **Core Value** | 단일 사용자 도구 → 멀티 조직 플랫폼 전환 + 기존 워크플로우(GitHub/Slack) 안에서 Foundry-X 활용 가능 |

## Background

### 현재 상태 분석

**D1 테이블 22개 — 테넌시 격리 현황:**

| 격리 수준 | 테이블 | 비고 |
|-----------|--------|------|
| project_id 있음 | wiki_pages, token_usage, agent_sessions | 3개 — 기존 격리 |
| 격리 없음 (글로벌) | users, projects, refresh_tokens | 3개 — 사용자/프로젝트 |
| 격리 없음 (에이전트) | agents, agent_capabilities, agent_constraints, agent_tasks, agent_prs, agent_plans, agent_messages, agent_worktrees | 8개 |
| 격리 없음 (MCP) | mcp_servers, mcp_sampling_log | 2개 |
| 격리 없음 (기타) | spec_conflicts, merge_queue, parallel_executions | 3개 |
| 스키마 전용 | d1_migrations, _cf_KV | 2개 — 시스템 |

**외부 연동 현황:**
- GitHub: webhook 수신(push/PR)만 존재 (`routes/webhook.ts`), 단방향
- Slack: 미구현
- MCP: AI Foundry 프리셋(F80) 존재, 확장 가능

### Phase 3 로드맵 위치

```
Phase 3: 멀티테넌시 + 외부 도구 연동
├── Sprint 18 (v1.6.0) ← 현재: Plan/Design + 핵심 구현
│   ├── F83: 멀티테넌시 기초 (organizations + tenant_id + RLS)
│   ├── F84: GitHub 양방향 동기화
│   ├── F85: Slack 통합
│   └── F86: 통합 + 배포
├── Sprint 19 (v1.7.0): 테넌시 심화 (초대/권한/온보딩 UI)
└── Sprint 20 (v1.8.0): 외부 도구 확장 (Jira, Linear MCP 프리셋)
```

## F-items

| F# | 제목 | Priority | 핵심 작업 | 예상 테스트 |
|----|------|:--------:|-----------|:-----------:|
| F83 | 멀티테넌시 기초 — Organizations + tenant_id + RLS | P0 | organizations 테이블 + D1 migration 0011 + org_members 조인 + tenantGuard 미들웨어 + 기존 테이블 tenant_id 마이그레이션 | +25 |
| F84 | GitHub 양방향 동기화 — Issues/PR 실시간 연동 | P1 | GitHubSyncService + webhook 확장 + agent_tasks↔Issues 매핑 + PR 상태 동기화 + Octokit App 인증 | +15 |
| F85 | Slack 통합 — 에이전트 알림 + 슬래시 커맨드 | P1 | SlackService + Incoming Webhook + /foundry-x 슬래시 커맨드 + 에이전트 이벤트 → Slack 알림 | +10 |
| F86 | Sprint 18 통합 + v1.6.0 릴리스 | P2 | 통합 테스트 + D1 migration remote + Workers/Pages 배포 + SPEC/CHANGELOG 갱신 | +5 |

## 상세 설계 방향

### F83: 멀티테넌시 기초

**접근법: Shared DB + tenant_id (검증됨)**

1. **새 테이블 (migration 0011)**:
   ```sql
   CREATE TABLE organizations (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     slug TEXT NOT NULL UNIQUE,
     plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free','pro','enterprise')),
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );

   CREATE TABLE org_members (
     org_id TEXT NOT NULL REFERENCES organizations(id),
     user_id TEXT NOT NULL REFERENCES users(id),
     role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','admin','member','viewer')),
     joined_at TEXT NOT NULL DEFAULT (datetime('now')),
     PRIMARY KEY (org_id, user_id)
   );
   ```

2. **기존 테이블 변경** (migration 0012 — ALTER TABLE):
   - `projects` ← `org_id TEXT REFERENCES organizations(id)` 추가
   - projects 통해 간접 격리: wiki_pages, token_usage, agent_sessions (이미 project_id 보유)
   - `agents`, `mcp_servers` ← `org_id TEXT` 추가 (조직 수준 리소스)
   - agent_tasks, agent_prs 등은 agents.id FK를 통해 간접 격리

3. **tenantGuard 미들웨어**:
   - JWT에서 org_id 추출 (로그인 시 active org 선택)
   - 모든 DB 쿼리에 org_id 조건 자동 주입
   - 미들웨어 체인: `auth → tenantGuard → route handler`

4. **마이그레이션 전략**:
   - 기존 데이터 → default organization 자동 생성 (`org_default`)
   - users → org_members 자동 매핑 (owner 역할)
   - projects.org_id = `org_default` 배치 업데이트

### F84: GitHub 양방향 동기화

1. **agent_tasks → GitHub Issues 동기화**:
   - 에이전트 태스크 생성 시 → GitHub Issue 자동 생성
   - Issue 상태 변경 → agent_tasks 상태 동기화 (webhook)
   - 라벨 매핑: `agent:planner`, `agent:reviewer`, `priority:P0` 등

2. **GitHub PR → agent_prs 동기화**:
   - PR 이벤트(opened/merged/closed) → agent_prs 상태 업데이트
   - 에이전트 PR 생성 시 → GitHub PR 자동 생성 (기존 PrPipelineService 확장)

3. **인증**: GitHub App (Installation Token) 또는 기존 PAT 확장

### F85: Slack 통합

1. **Outgoing (Foundry-X → Slack)**:
   - Incoming Webhook URL (org 설정에 저장)
   - 이벤트: agent.task.completed, agent.pr.merged, plan.approved
   - Rich Block Kit 메시지 (에이전트 이름 + 작업 요약 + 링크)

2. **Incoming (Slack → Foundry-X)**:
   - `/foundry-x status` — 프로젝트 상태 요약
   - `/foundry-x plan <description>` — PlannerAgent에 계획 요청
   - Slack Interactivity: 계획 승인/거절 버튼

## 의존성

```
F83 (멀티테넌시) ← F84, F85 의존
  ↓
F84 (GitHub) — 독립 진행 가능 (org_id 추가 후)
F85 (Slack) — 독립 진행 가능 (org_id 추가 후)
  ↓
F86 (통합) ← F83, F84, F85 완료 후
```

**우선순위 순서**: F83 → (F84 ∥ F85) → F86

## 리스크

| ID | 리스크 | 확률 | 영향 | 대응 |
|----|--------|:----:|:----:|------|
| R1 | D1 ALTER TABLE 제약 — SQLite는 컬럼 추가 시 DEFAULT 필수 | 중 | 고 | DEFAULT '' + 배치 UPDATE로 마이그레이션 |
| R2 | 기존 API 22개 서비스에 tenant_id 전파 — 대규모 변경 | 고 | 고 | tenantGuard 미들웨어로 c.get('orgId') 중앙 주입, 서비스별 점진적 적용 |
| R3 | GitHub App 설치 복잡도 — Org 단위 권한 설정 | 중 | 중 | PAT 먼저, App은 Sprint 19로 이관 가능 |
| R4 | Slack API rate limit — 대량 알림 시 429 | 저 | 중 | 큐잉 + 배치 전송 (KV 기반) |
| R5 | 기존 테스트 313건 tenant_id 누락으로 실패 | 고 | 고 | test helper에 default org fixture 추가, tenantGuard bypass 옵션 |

## 성공 기준

| 기준 | 목표 |
|------|------|
| typecheck | 5/5 패키지 통과 |
| 기존 테스트 | 313+ API tests 유지 (regression 0) |
| 신규 테스트 | +55건 이상 (F83: 25, F84: 15, F85: 10, F86: 5) |
| PDCA Match Rate | ≥ 90% |
| D1 migration | 0011~0012 로컬+리모트 적용 |
| 배포 | Workers + Pages 프로덕션 정상 |

## Agent Teams 배치 (구현 시)

| Worker | F-item | 예상 범위 |
|--------|--------|-----------|
| Leader | F83 (멀티테넌시) | D1 migration + tenantGuard + 서비스 수정 |
| W1 | F84 (GitHub) | GitHubSyncService + webhook 확장 |
| W2 | F85 (Slack) | SlackService + 슬래시 커맨드 |
| Leader | F86 (통합) | 통합 테스트 + 배포 |

## 미결 사항

1. **GitHub App vs PAT**: Sprint 18에서 PAT 기반으로 구현, App 전환은 Sprint 19 검토
2. **Slack Bot vs Incoming Webhook**: Incoming Webhook으로 시작, Bot(Socket Mode)은 Sprint 19
3. **org 선택 UI**: Sprint 18은 API 레벨만, Web UI(org switcher)는 Sprint 19
4. **기존 데이터 마이그레이션**: default org 자동 생성으로 무중단 전환
