---
code: FX-PLAN-028
title: "Sprint 27 — Phase 3-B 기술 기반 완성: KPI 인프라 + Reconciliation + Hook 자동수정"
version: 0.1
status: Draft
category: PLAN
system-version: 2.0.0
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Sprint 27 — Phase 3-B 기술 기반 완성: KPI 인프라 + Reconciliation + Hook 자동수정

> **Summary**: PRD v5 Phase 3-B의 핵심 미구현 항목 3건(G1, G6, G7)을 해소하여, 통합 플랫폼의 기술 기반을 완성한다. KPI 측정 가능 상태 + Git↔D1 정합성 자동 복구 + 에이전트 자율성 강화.
>
> **Project**: Foundry-X
> **Version**: v2.1 (목표)
> **Author**: Sinclair Seo
> **Date**: 2026-03-21
> **Status**: Draft

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | Sprint 27 — Phase 3-B 기술 기반 완성 (F100, F99, F101) |
| **시작** | 2026-03-21 |
| **목표 버전** | v2.1 |
| **F-items** | 3개 (F100 KPI 인프라, F99 Reconciliation, F101 Hook 자동수정) |

| Perspective | Content |
|-------------|---------|
| **Problem** | PRD v5 성공 지표(K1~K12) 중 측정 인프라가 전혀 없어 데이터 기반 의사결정 불가. Git↔D1 정합성이 수동 의존이라 drift 누적 위험. 에이전트 hook 실패 시 human escalation만 가능하여 자율성 부족. |
| **Solution** | (1) Workers Analytics Engine 기반 KPI 로깅 + 분석 대시보드, (2) Cron Trigger 기반 Git↔D1 자동 Reconciliation Job, (3) 에이전트 hook 실패 시 최대 2회 자동 수정 + human escalation 폴백 |
| **Function/UX Effect** | 대시보드에서 WAU·에이전트 완료율·SDD 정합률 실시간 확인 가능. Git↔D1 drift 자동 감지·복구로 수동 개입 제거. 에이전트 작업 중 hook 실패 시 자동 재시도로 완료율 향상. |
| **Core Value** | "측정 없이 관리 없다" — Phase 4 통합 판단의 데이터 근거 확보 + 에이전트 자율성으로 사람 개입 최소화 |

---

## 1. Overview

### 1.1 Purpose

Sprint 27은 PRD v5 §4 MVP 최소 기준 3건을 해소한다:
- `KPI 측정 인프라 구축 (K7 WAU, K8 에이전트 완료율 최소 측정 가능)` → **F100**
- `Git↔D1 Reconciliation 동작 (G1)` → **F99**
- `에이전트 자동 수정/rebase 구현 (G7)` → **F101** (G8 자동 rebase는 Sprint 28+)

Sprint 26(Phase 4 통합: F106/F108/F109/F111)과 병렬 진행하며, 파일 충돌 없이 독립 실행 가능.

### 1.2 Background

**현재 상태 (Sprint 25 완료 기준):**
- API 97 endpoints, 39 services, 535 tests
- D1 27 테이블, 16 migrations
- 에이전트 오케스트레이션: PlannerAgent + AgentInbox + WorktreeManager
- 모니터링: toucan-js(Sentry) 도입(Sprint 24 F113), 하지만 KPI 로깅 없음
- Cron Trigger: 미사용 (현재 Workers는 fetch 핸들러만)
- Hook 실패 처리: 단순 에러 반환 (자동 재시도 없음)

### 1.3 Related Documents

- PRD: [[FX-SPEC-PRD-V5]] §4 성공 지표 K1~K12, §7.6 에이전트 자율성, §7.7 Reconciliation
- SPEC: [[FX-SPEC-001]] v5.6
- Sprint 25 결과: [[FX-RPRT-026]] (Match Rate 97%)
- Sprint 24 모니터링: F113 ✅ (toucan-js + Sentry 기초)

---

## 2. Scope

### 2.1 In Scope

- [ ] **F100**: KPI 측정 인프라 — API 이벤트 로깅 서비스 + 분석 엔드포인트 + Web 분석 대시보드
- [ ] **F99**: Git↔D1 Reconciliation Job — Cron Trigger + 정합성 비교 + 자동 복구 + 불일치 알림
- [ ] **F101**: 에이전트 hook 실패 자동 수정 루프 — 최대 2회 재시도 + diff 기반 수정 + human escalation

### 2.2 Out of Scope

- F102 에이전트 자동 rebase — Sprint 28+ (F101 안정화 후)
- F103 Semantic Linting — P2, 별도 스프린트
- KPI 대시보드 고급 시각화 (차트 라이브러리 도입) — Phase 4+
- Cloudflare Analytics 외부 서비스 연동 — 자체 D1 기반 우선

---

## 3. Feature Details

### 3.1 F100 — KPI 측정 인프라 (P0)

**PRD 근거**: v5 §4 K1~K12, MVP 기준 "K7 WAU, K8 에이전트 완료율 최소 측정 가능"

#### 3.1.1 KPI 이벤트 로깅 서비스

**새 파일**: `packages/api/src/services/kpi-logger.ts`

| 메서드 | 설명 | 이벤트 타입 |
|--------|------|------------|
| `logPageView(userId, page)` | 대시보드 페이지 조회 | `page_view` |
| `logApiCall(userId, endpoint, method)` | API 호출 기록 | `api_call` |
| `logAgentTask(agentId, taskType, status, duration)` | 에이전트 작업 완료/실패 | `agent_task` |
| `logCliInvocation(userId, command)` | CLI 호출 기록 | `cli_invoke` |
| `getMetrics(timeRange, groupBy)` | 집계 쿼리 | — |

**D1 테이블**: `kpi_events`

```sql
CREATE TABLE kpi_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- page_view, api_call, agent_task, cli_invoke
  user_id TEXT,
  agent_id TEXT,
  metadata TEXT,  -- JSON: { page, endpoint, command, taskType, status, duration }
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES organizations(id)
);
CREATE INDEX idx_kpi_events_tenant_type ON kpi_events(tenant_id, event_type, created_at);
CREATE INDEX idx_kpi_events_user ON kpi_events(user_id, created_at);
```

#### 3.1.2 KPI 분석 엔드포인트

**새 파일**: `packages/api/src/routes/kpi.ts`

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/kpi/summary` | WAU, 에이전트 완료율, SDD 정합률 요약 |
| GET | `/api/kpi/events` | 이벤트 목록 (필터: type, dateRange, userId) |
| GET | `/api/kpi/trends` | 일별/주별 트렌드 (K7~K12 시계열) |
| POST | `/api/kpi/track` | 클라이언트 이벤트 수집 (page_view, cli_invoke) |

#### 3.1.3 Web 분석 대시보드

**새 파일**: `packages/web/src/app/(app)/analytics/page.tsx`

| 섹션 | KPI | 시각화 |
|------|-----|--------|
| WAU 카드 | K7 | 숫자 + 주간 변화율 |
| 에이전트 완료율 | K8 | 숫자 + 성공/실패/진행중 비율 |
| SDD 정합률 | K11 | 숫자 + 최근 체크 시각 |
| API 호출 추이 | K1 참고 | 일별 막대 (CSS만) |
| 최근 이벤트 | — | 테이블 (최근 20건) |

**Sidebar 추가**: "Analytics" 메뉴 아이템 (`/analytics` 경로)

### 3.2 F99 — Git↔D1 Reconciliation Job (P1)

**PRD 근거**: v5 G1, §7.7 "Cron Trigger 기반 자동 정합성 복구"

#### 3.2.1 Reconciliation 서비스

**새 파일**: `packages/api/src/services/reconciliation.ts`

| 메서드 | 설명 |
|--------|------|
| `checkIntegrity(db, githubToken)` | Git 리포 상태 vs D1 데이터 비교 |
| `detectDrift(gitState, dbState)` | 불일치 항목 목록 생성 |
| `reconcile(drifts, strategy)` | 자동 복구 실행 (git-wins / db-wins / manual) |
| `generateReport(results)` | 정합성 리포트 생성 |

**정합성 검사 대상:**

| 항목 | Git 소스 | D1 소스 | 비교 방법 |
|------|----------|---------|-----------|
| Spec items | `SPEC.md` §5 F-items | `spec_items` 테이블 | ID + status 매칭 |
| Requirements | `SPEC.md` §6 Execution Plan | `requirements` 테이블 | REQ-ID + status |
| Wiki pages | `docs/` 디렉토리 | `wiki_pages` 테이블 | path + content hash |
| Agent configs | `.foundry-x/agents/` | `agent_registrations` 테이블 | agent ID + capabilities |

**복구 전략:**
- `git-wins` (기본): Git이 SSOT — D1을 Git 기준으로 갱신
- `db-wins`: D1 데이터 보존 (수동 운영 데이터가 있을 때)
- `manual`: drift 목록만 생성, 복구는 사람이 판단

#### 3.2.2 Cron Trigger 설정

**wrangler.toml 추가:**
```toml
[triggers]
crons = ["0 */6 * * *"]  # 6시간마다 실행
```

**app.ts scheduled 핸들러 export:**
```typescript
export default {
  fetch: app.fetch,
  scheduled: async (event, env, ctx) => {
    // ReconciliationService.run()
  }
};
```

#### 3.2.3 Reconciliation 엔드포인트 (수동 트리거 + 결과 조회)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/reconciliation/run` | 수동 Reconciliation 실행 (admin only) |
| GET | `/api/reconciliation/status` | 최근 실행 결과 + drift 목록 |
| GET | `/api/reconciliation/history` | 실행 이력 (최근 10건) |

**D1 테이블**: `reconciliation_runs`

```sql
CREATE TABLE reconciliation_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL,  -- cron, manual
  status TEXT NOT NULL,  -- running, completed, failed
  drift_count INTEGER DEFAULT 0,
  fixed_count INTEGER DEFAULT 0,
  report TEXT,  -- JSON: drift details
  started_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES organizations(id)
);
```

### 3.3 F101 — 에이전트 Hook 실패 자동 수정 루프 (P1)

**PRD 근거**: v5 G7, §7.6 "에이전트 hook 실패 자동 수정 루프 (최대 2회 → human escalation)"

#### 3.3.1 자동 수정 흐름

```
Agent executeTask()
  → hook (lint/typecheck/test) 실행
  → 실패 감지
  → AutoFixService.attemptFix(error, context)
    → Attempt 1: LLM 기반 수정 제안 생성 → 적용 → hook 재실행
    → 성공? → 완료
    → Attempt 2: 확장 컨텍스트로 재시도 (파일 전체 + 관련 파일)
    → 성공? → 완료
    → 실패 → human escalation (AgentInbox 메시지 + SSE 알림)
```

#### 3.3.2 AutoFix 서비스

**새 파일**: `packages/api/src/services/auto-fix.ts`

| 메서드 | 설명 |
|--------|------|
| `attemptFix(error, fileContext, attempt)` | LLM에 에러+코드 전달 → 수정 diff 생성 |
| `applyFix(diff, filePath)` | diff를 파일에 적용 |
| `rerunHook(hookType, filePath)` | 수정 후 hook 재실행 |
| `escalateToHuman(agentId, taskId, error, attempts)` | AgentInbox에 escalation 메시지 전송 |

**Hook 타입별 수정 전략:**

| Hook | 에러 소스 | 수정 방법 |
|------|-----------|-----------|
| `lint` | ESLint 에러 메시지 | `--fix` 자동 적용 → 실패 시 LLM 수정 |
| `typecheck` | tsc 에러 | LLM에 에러 라인 + 타입 정보 전달 → 수정 diff |
| `test` | Vitest 실패 출력 | LLM에 테스트 + 소스 전달 → 소스 또는 테스트 수정 |

#### 3.3.3 AgentOrchestrator 통합

기존 `executeTask()` 메서드에 retry 래퍼 추가:

```typescript
// agent-orchestrator.ts 변경
async executeTaskWithAutoFix(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
  const result = await this.executeTask(request);
  if (result.status === 'failed' && result.error?.type === 'hook_failure') {
    return this.autoFixService.retryWithFix(request, result, { maxAttempts: 2 });
  }
  return result;
}
```

#### 3.3.4 Escalation 메시지 스키마

```typescript
interface HookEscalation {
  type: 'hook_escalation';
  agentId: string;
  taskId: string;
  hookType: 'lint' | 'typecheck' | 'test';
  error: string;
  attempts: { attempt: number; fix: string; result: string }[];
  filePath: string;
  suggestedAction: string;
}
```

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] F100: `/api/kpi/summary` 응답에 WAU + 에이전트 완료율 포함
- [ ] F100: Web `/analytics` 페이지에서 KPI 카드 렌더링
- [ ] F99: Cron Trigger 등록 + `scheduled` 핸들러 동작
- [ ] F99: `/api/reconciliation/run` 수동 실행 → drift 감지 + 복구
- [ ] F101: hook 실패 시 자동 수정 2회 시도 후 human escalation
- [ ] 전체 typecheck 통과 + 기존 535 테스트 통과
- [ ] 새 테스트 추가 (F100 ~15건, F99 ~15건, F101 ~12건)

### 4.2 Quality Criteria

- [ ] Test coverage: 신규 서비스 80%+
- [ ] Zero lint errors
- [ ] D1 migration 정합 (0017 적용)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Cron Trigger + fetch 공존 시 Workers export 충돌 | High | Low | Hono의 `app.fetch` + separate scheduled handler, 공식 문서 패턴 따름 |
| KPI 이벤트 대량 쓰기 시 D1 성능 | Medium | Medium | 배치 insert + 오래된 이벤트 자동 정리(30일) |
| LLM 자동 수정이 더 나쁜 코드 생성 | High | Medium | diff 크기 제한(50줄) + 수정 후 hook 재검증 필수 |
| Sprint 26(같은 워킹트리)과 파일 충돌 | High | Low | F100/F99/F101 모두 새 파일 생성 위주, app.ts만 공유 → 순차 커밋으로 해결 |

---

## 6. Architecture Considerations

### 6.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

기존 모노리포 + Hono API + Next.js 대시보드 아키텍처 유지.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| KPI 저장소 | D1 / Workers Analytics Engine / KV | **D1** | 기존 인프라 활용, SQL 집계 쿼리 가능, Analytics Engine은 별도 설정 필요 |
| Cron 주기 | 1h / 6h / 24h | **6h** | drift 감지 빈도 vs D1 부하 균형, PRD 요구 "자동" 충족 |
| AutoFix LLM | Claude API / Workers AI | **Claude API** | 기존 ClaudeApiRunner 재활용, 코드 수정 품질 |
| KPI 시각화 | Chart.js / Recharts / CSS only | **CSS only** | 최소 의존성, 추후 확장 가능 |

### 6.3 Worker 배분 (Agent Team)

```
┌─────────────────────────────────────────────────┐
│ Worker 1 (W1): F100 — KPI 측정 인프라            │
│   API: kpi-logger.ts + kpi routes + migration    │
│   Web: analytics/page.tsx + sidebar 추가          │
│   Schema: kpi.ts (Zod)                           │
├─────────────────────────────────────────────────┤
│ Worker 2 (W2): F99 + F101                        │
│   API: reconciliation.ts + auto-fix.ts           │
│   API: reconciliation routes + migration          │
│   API: agent-orchestrator.ts 확장                 │
│   Config: wrangler.toml cron trigger              │
└─────────────────────────────────────────────────┘

공유 파일 (리더가 관리):
  - packages/api/src/app.ts (route 등록 + scheduled export)
  - packages/api/src/env.ts (Env 타입 확장)
  - D1 migration 0017 (kpi_events + reconciliation_runs)
```

---

## 7. Convention Prerequisites

### 7.1 Existing Conventions ✅

- [x] CLAUDE.md 코딩 컨벤션
- [x] ESLint flat config
- [x] TypeScript strict mode
- [x] Vitest + app.request() 테스트 패턴
- [x] Zod 스키마 + OpenAPI createRoute 패턴

### 7.2 New Conventions

| Category | Rule |
|----------|------|
| KPI 이벤트 | `kpi_events.metadata`는 JSON string, 타입별 interface 정의 |
| Cron 핸들러 | `src/scheduled.ts` 분리, app.ts에서 re-export |
| AutoFix | diff 50줄 초과 시 자동 수정 포기 → escalation |

### 7.3 Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `SENTRY_DSN` | 에러 트래킹 (기존) | Server |
| `ANTHROPIC_API_KEY` | AutoFix LLM 호출 (기존) | Server |
| (신규 없음) | — | — |

---

## 8. Implementation Order

### Phase 1: D1 Migration + 기초 서비스 (W1 + W2 병렬)

1. **Migration 0017**: `kpi_events` + `reconciliation_runs` 테이블
2. **W1**: `kpi-logger.ts` 서비스 + `kpi.ts` Zod 스키마
3. **W2**: `reconciliation.ts` 서비스 + `auto-fix.ts` 서비스

### Phase 2: 라우트 + 통합 (W1 + W2 병렬)

4. **W1**: `kpi.ts` 라우트 (4 endpoints) + 테스트
5. **W2**: `reconciliation` 라우트 (3 endpoints) + Cron 핸들러 + 테스트
6. **W2**: `agent-orchestrator.ts` executeTaskWithAutoFix 통합 + 테스트

### Phase 3: Web + 마무리 (W1 → 리더)

7. **W1**: `analytics/page.tsx` 대시보드 + sidebar 추가
8. **리더**: `app.ts` route 등록 + scheduled export + env.ts 갱신
9. **리더**: typecheck + lint + 전체 테스트 검증

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`sprint-27.design.md`)
2. [ ] SPEC.md F99/F100/F101 상태 📋→🔧 전환
3. [ ] Agent Team 2-worker 실행
4. [ ] D1 migration 0017 remote 적용

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial draft | Sinclair Seo |
