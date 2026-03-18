---
code: FX-PLAN-016
title: "Phase 3 로드맵 — 멀티테넌시 + 외부 연동 + 고객 파일럿 준비"
version: 0.1
status: Draft
category: PLAN
system-version: 1.2.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Phase 3 로드맵 — 멀티테넌시 + 외부 연동 + 고객 파일럿 준비

## 1. Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | Phase 3 전체 로드맵 |
| **Phase 2 완료** | v1.2.0 (2026-03-18) |
| **Phase 3 기간** | Sprint 15~20 (6 스프린트) |
| **목표 버전** | v1.3.0 ~ v2.0.0 |

### Phase 2 완료 현황

| 지표 | 수치 |
|------|------|
| API Endpoints | 50개 (OpenAPI) |
| Services | 19개 |
| D1 Tables | 15개 |
| Tests | 429 (CLI 106 + API 278 + Web 45) |
| E2E Tests | 20 specs (Playwright) |
| PDCA 평균 Match Rate | 92% |
| Sprint 수 | 9개 (Sprint 6~14) |

### Phase 3 목표

**멀티테넌시 SaaS 전환 + 외부 도구 연동 + 고객 파일럿 준비**

Phase 2까지 Foundry-X는 "단일 사용자/단일 조직" 프로토타입이었어요. Phase 3에서는:

1. **멀티테넌시**: 조직 단위 격리 — organizations, org_members, org-level RBAC
2. **에이전트 고도화**: PlannerAgent + inbox 통신 + git worktree 격리
3. **외부 도구 연동**: Jira 이슈 동기화 + Slack 알림/커맨드
4. **대시보드 고도화**: 조직 관리 UI + 멀티 프로젝트 뷰 + 워크플로우 빌더
5. **안정화**: DB 전환 평가 + 캐싱 + 모니터링
6. **고객 파일럿**: KT DS 내부 팀 온보딩 + Go/Kill 판정 기준

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 단일 조직 한정, 외부 도구 단절, 에이전트 계획 능력 부재 |
| **Solution** | 멀티테넌시 + Jira/Slack 연동 + PlannerAgent + 파일럿 온보딩 |
| **Function UX Effect** | 조직별 격리된 워크스페이스, 기존 도구와 자연스러운 통합 |
| **Core Value** | "Git이 진실, Foundry-X는 렌즈" 철학을 팀 단위로 확장 |

---

## 2. Phase 2 → Phase 3 전환 기준

### Phase 2 완료 체크리스트

| # | 항목 | 상태 |
|---|------|:----:|
| 1 | SDD Triangle 전체 구현 (CLI + API + Web) | ✅ |
| 2 | MCP 1.0 4대 기능 완전 통합 (Tools, Sampling, Prompts, Resources) | ✅ |
| 3 | 에이전트 오케스트레이션 (병렬 실행 + 자동 PR + Merge Queue) | ✅ |
| 4 | 프로덕션 배포 (Workers + Pages + D1) | ✅ |
| 5 | 429 tests + 20 E2E 전체 통과 | ✅ |
| 6 | PDCA Match Rate 90% 이상 | ✅ (92%) |
| 7 | v1.2.0 태그 + CHANGELOG 갱신 | ✅ |

### 전환 전 필수 작업 (F69)

| 항목 | 설명 | 상태 |
|------|------|:----:|
| D1 migration 0007+0008 remote 적용 | Sprint 13~14 마이그레이션 프로덕션 반영 | 🔧 |
| Workers + Pages 프로덕션 재배포 | Sprint 13~14 코드 반영 | 🔧 |
| v1.2.0 git tag | 릴리스 태그 생성 | 🔧 |
| smoke test | health, auth, MCP, agent 전체 통과 확인 | 🔧 |

---

## 3. Sprint 로드맵

### Sprint 15 (v1.3.0) — PlannerAgent + 에이전트 inbox + git worktree 격리

> 에이전트 자율성 강화 — "계획하고, 소통하고, 격리해서 실행하는" 에이전트

| F# | 제목 | Priority | 핵심 산출물 |
|----|------|:--------:|------------|
| F70 | PlannerAgent 도입 | P1 | PlannerAgent 서비스, 코드베이스 리서치 엔진, 인간 승인 플로우 |
| F71 | 에이전트 간 inbox 통신 | P1 | inbox 메시지 큐, Leader/Worker 프로토콜, SSE 이벤트 확장 |
| F72 | git worktree 격리 | P2 | WorktreeManager 서비스, 에이전트별 자동 worktree 할당/정리 |

**F70 세부: PlannerAgent**
- 태스크 실행 전 코드베이스를 분석하여 실행 계획을 수립
- 계획 결과를 사람에게 제시 → 승인/수정/거부 플로우
- AgentRunner 인터페이스 확장 (plan → approve → execute 3단계)
- 출처: [[FX-RESEARCH-014]] 외부 리포 연구

**F71 세부: 에이전트 inbox 통신**
- Leader/Worker 간 비동기 메시지 큐 (D1 기반)
- 메시지 유형: task_assign, progress_update, help_request, result_submit
- SSE 이벤트 확장: agent.message.sent, agent.message.received
- inbox D1 테이블 + API endpoints (send, receive, list)

**F72 세부: git worktree 격리**
- WorktreeManager: 에이전트 태스크 시작 시 자동 worktree 생성
- 태스크 완료 시 자동 merge + worktree 정리
- 충돌 발생 시 ConflictDetector 연계 → 사람 에스컬레이션
- simple-git worktree API 활용

### Sprint 16 (v1.4.0) — 멀티테넌시 기반

> 조직 단위 격리 — "내 팀의 Foundry-X"

| F# | 제목 | Priority | 핵심 산출물 |
|----|------|:--------:|------------|
| F73 | organizations + org_members 테이블 + 초대 플로우 | P1 | D1 마이그레이션, org CRUD API, 초대 이메일/토큰 |
| F74 | 기존 테이블 org_id 마이그레이션 + API 미들웨어 org 필터 | P1 | D1 마이그레이션 (기존 15테이블 + org_id FK), orgFilter 미들웨어 |
| F75 | JWT 확장 (orgId, orgRole) + org-level RBAC | P1 | JWT 페이로드 확장, OrgRole enum, 권한 검사 미들웨어 |

**F73 세부: organizations 기반 구축**
- organizations 테이블: id, name, slug, plan, created_at, updated_at
- org_members 테이블: id, org_id, user_id, role(owner/admin/member), invited_at, joined_at
- 초대 플로우: 이메일 기반 초대 → 토큰 검증 → 가입/연결
- API: POST /orgs, GET /orgs/:id, POST /orgs/:id/invite, POST /orgs/:id/join

**F74 세부: 기존 데이터 org_id 마이그레이션**
- specs, agent_tasks, mcp_servers 등 기존 테이블에 org_id 컬럼 추가
- orgFilter 미들웨어: 모든 API 요청에서 JWT의 orgId로 자동 필터링
- 마이그레이션 전략: nullable org_id → 기본 org 생성 → NOT NULL 전환

**F75 세부: org-level RBAC**
- JWT 페이로드 확장: `{ userId, orgId, orgRole, permissions[] }`
- OrgRole: owner (전권), admin (멤버 관리), member (읽기/쓰기)
- 기존 user-level RBAC와 조합: `max(userRole, orgRole)` 또는 교차 정책

### Sprint 17 (v1.5.0) — 외부 도구 연동 기반

> 기존 도구와 자연스러운 통합 — "Foundry-X가 팀의 허브"

| F# | 제목 | Priority | 핵심 산출물 |
|----|------|:--------:|------------|
| F76 | Webhook 일반화 프레임워크 | P1 | WebhookRegistry, 인바운드/아웃바운드 핸들러, 재시도 로직 |
| F77 | Jira 연동 — 이슈 동기화 | P1 | JiraAdapter, 양방향 동기화, 이슈↔Spec 매핑 |
| F78 | Slack 연동 — 알림 + 에이전트 커맨드 | P2 | SlackAdapter, Block Kit 알림, 슬래시 커맨드 |

**F76 세부: Webhook 일반화**
- WebhookRegistry 서비스: 등록/삭제/목록/테스트
- 인바운드: 외부 서비스 → Foundry-X (signature 검증, 이벤트 라우팅)
- 아웃바운드: Foundry-X → 외부 서비스 (이벤트 필터, 재시도 3회, dead letter)
- D1 테이블: webhooks, webhook_events, webhook_deliveries

**F77 세부: Jira 연동**
- JiraAdapter: Jira REST API v3 클라이언트
- 양방향 동기화: Jira Issue ↔ Foundry-X Spec (상태, 우선순위, 담당자)
- 매핑 규칙: Jira Epic → Foundry-X Feature, Jira Story → Foundry-X Spec item
- Webhook 인바운드로 Jira 이벤트 수신 → 자동 Spec 갱신

**F78 세부: Slack 연동**
- SlackAdapter: Slack Web API + Events API
- 알림: PR 생성, 에이전트 완료, 충돌 감지 → Block Kit 메시지
- 슬래시 커맨드: `/foundry status`, `/foundry agent run <task>`
- 에이전트 결과를 Slack 스레드에 자동 게시

### Sprint 18 (v1.6.0) — 대시보드 고도화

> 조직 단위 관리 + 시각적 워크플로우 — "보면서 관리하는 Foundry-X"

| F# | 제목 | Priority | 핵심 산출물 |
|----|------|:--------:|------------|
| F79 | org 관리 UI | P1 | 조직 생성/초대/권한 관리 페이지, 멤버 목록/역할 변경 |
| F80 | 통합 대시보드 (멀티 프로젝트 뷰) | P1 | 프로젝트 목록, 크로스 프로젝트 건강도, 에이전트 활동 요약 |
| F81 | 에이전트 워크플로우 빌더 | P2 | drag-and-drop 파이프라인 에디터, 워크플로우 템플릿 |

### Sprint 19 (v1.7.0) — 안정화 + 성능

> 프로덕션 품질 확보 — "규모에 대비하는 Foundry-X"

| F# | 제목 | Priority | 핵심 산출물 |
|----|------|:--------:|------------|
| F82 | DB 마이그레이션 전략 (D1→PostgreSQL 옵션 평가) | P1 | 벤치마크 결과, 전환 계획서, Hyperdrive 프록시 설정 |
| F83 | 캐싱 전략 (KV 활용 확대) | P2 | KV 캐시 레이어, 캐시 무효화 정책, 성능 비교 |
| F84 | 모니터링 대시보드 (Grafana/Sentry 연동) | P2 | Workers Analytics 수집, Sentry 에러 트래킹, 알림 규칙 |

**F82 세부: D1 vs PostgreSQL 평가 기준**

| 기준 | D1 유지 | PostgreSQL 전환 |
|------|---------|----------------|
| 동시 접속 | ~100 conn/sec | 수천 conn/sec |
| 트랜잭션 | 제한적 (단일 DB) | 완전한 ACID |
| JOIN 성능 | 소규모 OK | 대규모 최적화 |
| 비용 | 무료 티어 내 | Neon/Supabase $25+/mo |
| 마이그레이션 공수 | 0 | 2~3 Sprint |
| Cloudflare 통합 | 네이티브 | Hyperdrive 프록시 필요 |

→ **Sprint 19에서 멀티테넌시 부하 테스트 후 결정**

### Sprint 20 (v2.0.0) — 고객 파일럿 준비

> 실사용자 검증 — "Foundry-X가 실제로 작동하는가?"

| F# | 제목 | Priority | 핵심 산출물 |
|----|------|:--------:|------------|
| F85 | 온보딩 가이드 + 튜토리얼 | P1 | Getting Started 문서, 비디오 가이드, 샘플 프로젝트 |
| F86 | KT DS SR 시나리오 자동화 파일럿 | P1 | SR 리포 하네스 구축, 에이전트 실행 시나리오, 성과 측정 |
| F87 | Phase 4 Go/Kill 판정 기준 정의 | P1 | 판정 매트릭스, 성공/실패 임계값, 의사결정 프레임워크 |

**F86 세부: KT DS SR 파일럿**
- 대상: KT DS AX BD팀 내부 프로젝트 1~2개
- 시나리오: SR(Service Request) 접수 → 요구사항 분석 → 코드 생성 → 리뷰 → 배포
- 측정 항목: PoC 구축 시간 (L1), 커뮤니케이션 왕복 횟수 (L2), 하네스 무결성
- 기간: 2주 파일럿 → 결과 분석 → Go/Kill 판정

**F87 세부: Go/Kill 판정 기준**

| 판정 | 조건 |
|------|------|
| **Go** | K1~K4 중 3개 이상 달성 + 파일럿 팀 NPS ≥ 7 |
| **Conditional Go** | K1~K4 중 2개 달성 + 개선 계획 수립 |
| **Kill** | K1~K4 중 1개 이하 또는 파일럿 팀 NPS < 5 |

---

## 4. 기술 결정 사항

### 아키텍처 결정 포인트

| # | 결정 사항 | 평가 시점 | 현재 방향 | 대안 |
|---|----------|----------|----------|------|
| TD-1 | D1 유지 vs PostgreSQL 전환 | Sprint 19 | D1 유지 (부하 테스트 후 결정) | Neon PostgreSQL + Hyperdrive |
| TD-2 | 모노리포 유지 vs 분리 | Sprint 18~19 | 모노리포 유지 (Turborepo) | cli/api/web 별도 리포 |
| TD-3 | SSE vs WebSocket 전환 | Sprint 18 | SSE 유지 (단방향 충분) | WebSocket (양방향 필요 시) |
| TD-4 | Workers CPU/메모리 한계 | Sprint 19 | Workers 유지 (50ms CPU) | Workers Unbound / 외부 서버 |
| TD-5 | 인증 강화 | Sprint 16 | JWT + PBKDF2 | OAuth 2.0 / OIDC 도입 |

### TD-1: D1 vs PostgreSQL 상세

**현재 D1 사용 현황:**
- 15개 테이블, 8개 마이그레이션 (0001~0008)
- 단일 조직, 동시 사용자 1명
- Phase 3 멀티테넌시 시 예상 규모: 3~5개 조직, 10~20명 동시 사용자

**전환 트리거 (하나라도 해당 시 전환 검토):**
- D1 쿼리 P95 > 200ms
- JOIN 3개 이상 쿼리에서 성능 저하
- 트랜잭션 격리 필요 (멀티테넌시 데이터 무결성)
- 조직 수 10개 초과

### TD-2: 모노리포 분리 기준

**현재:** 4개 패키지 (cli, api, web, shared) — Turborepo + pnpm workspace

**분리 트리거:**
- 패키지 간 빌드 시간 5분 초과
- 팀 분리 (CLI팀/API팀/Web팀 독립 운영)
- 배포 주기 완전 분리 필요

**Phase 3 권고:** 모노리포 유지 (1인 개발 + shared 패키지 의존성 높음)

---

## 5. 성공 지표 (Phase 3)

### 핵심 지표 (KPI)

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| K1: CLI 주간 호출/사용자 | 10회+ | Workers Analytics |
| K2: --no-verify 우회 비율 | < 20% | git hook 로그 |
| K3: sync 후 수동 수정 파일 | 감소 추세 | CLI telemetry |
| K4: 결정 승인율 | > 70% | agent_tasks 테이블 |

### 보조 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| L1: PoC 구축 시간 단축 | 2~4주 → < 1일 | 파일럿 팀 측정 |
| L2: 팀 협업 효율 | 커뮤니케이션 왕복 50% 감소 | 파일럿 팀 설문 |

### Phase 3 완료 기준

| # | 항목 | 목표 |
|---|------|------|
| 1 | 멀티테넌시 | 3개 이상 조직 동시 운영 |
| 2 | 외부 연동 | Jira + Slack 최소 1건 실연동 |
| 3 | API 성능 | 응답 P95 < 500ms |
| 4 | 테스트 | 600+ tests |
| 5 | PRD KPI | K1~K4 첫 측정 완료 |
| 6 | 파일럿 | KT DS 내부 팀 1개 이상 참여 |

---

## 6. 리스크

| # | 리스크 | 영향도 | 발생확률 | 대응 전략 |
|---|--------|:------:|:--------:|----------|
| R1 | **인력 리스크** — 1인 개발 지속 시 6스프린트 달성 어려움 | High | High | Agent Teams 활용 극대화, Sprint당 F-item 2~3개로 제한, 우선순위 엄격 관리 |
| R2 | **D1 한계** — 멀티테넌시 규모 시 성능 병목 | Medium | Medium | Sprint 19에서 부하 테스트 후 PostgreSQL 전환 결정, Hyperdrive 프록시 대비 |
| R3 | **MCP 생태계** — 외부 MCP 서버 부족 시 연동 효과 제한 | Medium | Low | 자체 MCP 서버 구현으로 기본 기능 확보, 생태계 성장 모니터링 |
| R4 | **사용자 채택** — Phase 3까지 실사용자 미확보 시 방향 재검토 | Critical | Medium | Sprint 20 Go/Kill 판정으로 좀비 프로젝트 방지, Sprint 18부터 내부 팀 조기 온보딩 |
| R5 | **Workers 한계** — CPU time 50ms/invocation 제한 | Low | Low | Workers Unbound 전환 ($0.015/M req), 무거운 작업은 Queue 분리 |
| R6 | **Jira/Slack API 변경** — 외부 API 비호환 업데이트 | Low | Low | Adapter 패턴으로 격리, API 버전 고정 |

---

## 7. 의존성

### Phase 3 시작 전 필수

| 의존성 | 설명 | 담당 | 상태 |
|--------|------|------|:----:|
| F69 v1.2.0 릴리스 | D1 migration remote + 프로덕션 배포 + git tag | Sinclair | 🔧 |
| SPEC v1.2.0 태그 | Sprint 14 완료 상태 SPEC 확정 | Sinclair | 🔧 |

### Sprint별 의존성

| Sprint | 선행 조건 |
|--------|----------|
| Sprint 15 | Phase 2 코드 안정 (v1.2.0 프로덕션 OK) |
| Sprint 16 | multitenancy.design.md 작성 + 승인 |
| Sprint 17 | Sprint 16 멀티테넌시 기반 완료 (org_id 필터링 동작) |
| Sprint 18 | Sprint 16~17 API 완료 (org + webhook + Jira/Slack) |
| Sprint 19 | Sprint 18 대시보드 완료 + 부하 테스트 환경 구축 |
| Sprint 20 | KT DS 내부 팀 파일럿 참여 확보 + Sprint 19 안정화 완료 |

### 외부 의존성

| 항목 | 설명 | 리스크 |
|------|------|--------|
| KT DS 내부 팀 협조 | Sprint 20 파일럿 참여 | 팀 일정/우선순위에 따라 지연 가능 |
| Jira Cloud 접근 권한 | Sprint 17 연동 | KT DS Jira 인스턴스 API 토큰 발급 필요 |
| Slack Workspace 앱 설치 | Sprint 17 연동 | Workspace admin 승인 필요 |

---

## 참조 문서

| 문서 | 코드 |
|------|------|
| PRD v4 | `docs/specs/prd-v4.md` |
| SPEC v3.2 | `SPEC.md` |
| MCP 프로토콜 설계 | [[FX-DSGN-012]] |
| 외부 리포 연구 | [[FX-RESEARCH-014]] |
| Sprint 14 완료 보고서 | [[FX-RPRT-016]] |
