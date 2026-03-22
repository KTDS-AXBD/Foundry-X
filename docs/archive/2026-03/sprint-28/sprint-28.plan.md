---
code: FX-PLAN-029
title: "Sprint 28 — Phase 3 완결: 에이전트 자동 Rebase + Semantic Linting + Plumb Track B 판정"
version: 0.1
status: Draft
category: PLAN
system-version: 2.1.0
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Sprint 28 — Phase 3 완결: 에이전트 자동 Rebase + Semantic Linting + Plumb Track B 판정

> **Summary**: Phase 3의 마지막 미구현 항목 3건(G8, G11, G3)을 해소하여 Phase 3를 완전 종결한다. Sprint 27(G1/G6/G7) + Sprint 28(G8/G11/G3)으로 Phase 3-B/D 전체 완결 → Phase 4 Go/Pivot/Kill 판정 근거 확보.
>
> **Project**: Foundry-X
> **Version**: v2.2 (목표)
> **Author**: Sinclair Seo
> **Date**: 2026-03-21
> **Status**: Draft

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | Sprint 28 — Phase 3 완결 (F102, F103, F105) |
| **시작** | 2026-03-21 |
| **목표 버전** | v2.2 |
| **F-items** | 3개 (F102 자동 rebase, F103 Semantic Linting, F105 Plumb Track B 판정) |

| Perspective | Content |
|-------------|---------|
| **Problem** | 에이전트가 병렬 작업 후 rebase 충돌 시 무조건 human escalation만 가능하여 병목 발생. ESLint 커스텀 룰이 에러만 표시하고 수정 방법을 제안하지 않아 에이전트/개발자 모두 수동 수정 필요. Plumb Track A/B 전환 판단을 위한 데이터 수집·분석 체계가 없어 의사결정 지연. |
| **Solution** | (1) WorktreeManager + MergeQueue 통합 rebase retry loop (최대 3회 + 상태 복구 + human escalation), (2) ESLint flat config 커스텀 룰에 `meta.hasSuggestions` 기반 자동 수정 예시 포함, (3) PlumbBridge 사용 이력/에러율을 KPI 데이터(F100)로 분석하여 Track B 전환 판정 문서 작성 |
| **Function/UX Effect** | rebase 충돌의 70%+를 자동 해결하여 에이전트 작업 완료율(K8) 향상. lint 에러 발생 시 수정 코드 예시가 바로 표시되어 개발 속도 향상. Plumb 전략이 확정되어 SDD 엔진 방향성에 대한 불확실성 해소. |
| **Core Value** | Phase 3 완전 종결 — Sprint 27(기술 기반)+Sprint 28(자율성+품질+전략) → Phase 4 Go 판정 근거 확보 |

---

## 1. Overview

### 1.1 Purpose

Sprint 28은 PRD v5 Phase 3 잔여 항목을 모두 해소한다:
- `에이전트 자동 수정/rebase 구현 (G8)` → **F102** (G7 자동 수정은 Sprint 27 F101)
- `Semantic Linting 실효성 (G11)` → **F103**
- `Plumb Track B 판정 (G3)` → **F105**

Sprint 27과 합산하면 Phase 3-B(G1/G6/G7/G8/G11) + Phase 3-D(G3) 전부 완료.
Phase 3-A(멀티테넌시, ✅) + Phase 3-C(AXIS DS, ✅) 역시 이미 완료되어, **Sprint 28 종료 = Phase 3 완전 종결**.

### 1.2 Background

**현재 상태 (Sprint 26 완료 기준):**
- API 108 endpoints, 41 services, 535 tests
- D1 30 테이블, 17 migrations (0018은 Sprint 27에서 추가 예정)
- WorktreeManager: 에이전트별 git worktree 격리 + gitExecutor DI
- MergeQueueService: 병렬 PR merge queue + 파일 충돌 감지
- ESLint: flat config (`eslint.config.js`), 커스텀 룰 없음
- PlumbBridge: Track A 운용 중, 전환 판정 미실시

**Sprint 27 (병렬 진행 중):**
- F100: KPI 측정 인프라 (kpi_events 테이블 + 분석 대시보드)
- F99: Git↔D1 Reconciliation Job (Cron Trigger)
- F101: 에이전트 hook 실패 자동 수정 루프

### 1.3 Related Documents

- PRD: [[FX-SPEC-PRD-V5]] §7.2-E Semantic Linting, §7.5 Plumb 2트랙, §7.6 에이전트 자율성
- SPEC: [[FX-SPEC-001]] v5.7
- Sprint 27 Plan: [[FX-PLAN-028]] (F100/F99/F101)
- Sprint 26 결과: Match Rate 94%

---

## 2. Scope

### 2.1 In Scope

- [ ] **F102**: 에이전트 자동 rebase — WorktreeManager 확장, 최대 3회 rebase 시도, 충돌 자동 해결 시도, 실패 시 human escalation + 상태 복구
- [ ] **F103**: Semantic Linting 실효성 — ESLint flat config 커스텀 룰 3종 + `meta.hasSuggestions` 자동 수정 예시 + CLI/API 통합
- [ ] **F105**: Plumb Track B 판정 — 사용 이력 데이터 수집 + 에러율/실행 시간 분석 + 전환 판정 ADR 작성

### 2.2 Out of Scope

- F114 실사용자 온보딩 — Sprint 29+ (Phase 4-F)
- F112 GitLab API 지원 — 수요 미확인, Phase 4-E
- rebase 시 3-way merge 알고리즘 자체 구현 — git rebase 명령어 활용
- ESLint 룰 10종 이상 대규모 확장 — 3종 핵심 룰만 (확장은 별도)

---

## 3. Feature Details

### 3.1 F102 — 에이전트 자동 Rebase (P1)

**PRD 근거**: v5 G8, §7.6 "에이전트 자동 rebase (최대 3회 → human escalation)"

#### 3.1.1 AutoRebase 서비스

**새 파일**: `packages/api/src/services/auto-rebase.ts`

| 메서드 | 설명 |
|--------|------|
| `rebaseOnto(worktreeId, targetBranch)` | worktree에서 target branch 위로 rebase 시도 |
| `detectConflicts(rebaseOutput)` | rebase 실패 시 충돌 파일 목록 추출 |
| `resolveConflicts(conflicts, strategy)` | LLM 기반 충돌 해결 시도 (ours/theirs/merge) |
| `abortAndRestore(worktreeId)` | rebase 실패 시 `git rebase --abort` + 원래 상태 복구 |
| `escalateToHuman(agentId, taskId, conflicts)` | AgentInbox에 rebase 실패 escalation 메시지 전송 |

#### 3.1.2 Rebase Retry Flow

```
Agent 작업 완료 → MergeQueue 진입
  → rebase 시도 (target: baseBranch)
  → 성공? → PR 생성/업데이트
  → 충돌 감지
    → Attempt 1: git rebase --abort → 최신 base fetch → 재시도
    → Attempt 2: LLM 기반 충돌 파일 자동 해결 → git rebase --continue
    → Attempt 3: 확장 컨텍스트(충돌 주변 ±50줄) → LLM 재시도
    → 모두 실패 → git rebase --abort + 상태 복구 + human escalation
```

#### 3.1.3 MergeQueueService 통합

기존 `MergeQueueService.processNext()` 메서드에 rebase 단계 추가:

```typescript
// merge-queue.ts 변경
async processNext(): Promise<MergeQueueStatus> {
  const entry = await this.getNextQueued();
  if (!entry) return { status: 'empty' };

  // 새: rebase 시도
  const rebaseResult = await this.autoRebase.rebaseOnto(
    entry.worktreeId, entry.baseBranch
  );

  if (rebaseResult.status === 'conflict_unresolved') {
    await this.autoRebase.escalateToHuman(entry.agentId, entry.id, rebaseResult.conflicts);
    return { status: 'escalated', entry };
  }

  // 기존: PR merge 진행
  return this.mergePR(entry);
}
```

#### 3.1.4 상태 복구 보장

| 시나리오 | 복구 동작 |
|----------|-----------|
| rebase 중 프로세스 크래시 | WorktreeManager.cleanup()에서 `git rebase --abort` 자동 실행 |
| 3회 실패 후 escalation | 원본 브랜치 유지, worktree를 rebase 전 커밋으로 reset |
| LLM 수정 적용 실패 | `git checkout --` 으로 충돌 파일 복원 후 다음 attempt |

#### 3.1.5 Escalation 메시지 스키마

```typescript
interface RebaseEscalation {
  type: 'rebase_escalation';
  agentId: string;
  taskId: string;
  baseBranch: string;
  conflictFiles: string[];
  attempts: { attempt: number; strategy: string; error: string }[];
  suggestedAction: 'manual_rebase' | 'force_push' | 'abandon';
}
```

### 3.2 F103 — Semantic Linting 실효성 (P2)

**PRD 근거**: v5 G11, §7.2-E "커스텀 ESLint 룰에 수정 코드 예시 포함"

#### 3.2.1 커스텀 ESLint 룰 3종

**새 파일**: `packages/cli/src/harness/lint-rules/` (ESLint plugin)

| 룰 이름 | 목적 | 대상 | 수정 예시 |
|---------|------|------|-----------|
| `foundry-x/no-direct-db-in-route` | 라우트에서 D1 직접 접근 금지 (서비스 레이어 강제) | `packages/api/src/routes/**` | `db.prepare(...)` → `xxxService.getXxx()` 호출로 전환 |
| `foundry-x/require-zod-schema` | 라우트 핸들러에 Zod 스키마 검증 필수 | `packages/api/src/routes/**` | `c.req.json()` → `const body = schema.parse(await c.req.json())` |
| `foundry-x/no-orphan-plumb-import` | CLI 외부에서 PlumbBridge 직접 import 금지 | `packages/api/**`, `packages/web/**` | API에서 Plumb 필요 시 CLI subprocess 또는 MCP 경유 |

#### 3.2.2 ESLint Plugin 구조

**새 파일**: `packages/cli/src/harness/lint-rules/index.ts`

```typescript
// ESLint flat config plugin 형식
export const foundryXPlugin = {
  meta: { name: 'eslint-plugin-foundry-x', version: '1.0.0' },
  rules: {
    'no-direct-db-in-route': noDirectDbRule,
    'require-zod-schema': requireZodSchemaRule,
    'no-orphan-plumb-import': noOrphanPlumbRule,
  },
};
```

#### 3.2.3 `meta.hasSuggestions` 활용

각 룰은 ESLint의 `hasSuggestions` API를 사용하여 IDE/CLI에서 자동 수정 제안을 제공:

```typescript
// 예: no-direct-db-in-route
meta: {
  type: 'problem',
  hasSuggestions: true,
  messages: {
    noDirectDb: 'Route handler should not access D1 directly. Use a service method.',
    useSuggestion: 'Replace with service method call',
  },
},
create(context) {
  return {
    CallExpression(node) {
      if (isDbPrepareCall(node)) {
        context.report({
          node,
          messageId: 'noDirectDb',
          suggest: [{
            messageId: 'useSuggestion',
            fix(fixer) { /* 서비스 호출로 전환하는 코드 */ }
          }],
        });
      }
    },
  };
},
```

#### 3.2.4 eslint.config.js 통합

기존 `packages/cli/eslint.config.js`에 플러그인 등록:

```javascript
import { foundryXPlugin } from './src/harness/lint-rules/index.js';

export default [
  // 기존 설정...
  {
    plugins: { 'foundry-x': foundryXPlugin },
    rules: {
      'foundry-x/no-direct-db-in-route': 'error',
      'foundry-x/require-zod-schema': 'warn',
      'foundry-x/no-orphan-plumb-import': 'error',
    },
  },
];
```

**API/Web 패키지에도 적용**: 각 패키지의 eslint.config에 공유 플러그인 import.

### 3.3 F105 — Plumb Track B 판정 (P2)

**PRD 근거**: v5 G3, §7.5 "Track A 실사용 데이터 기반 전환 판단"

#### 3.3.1 판정 기준 (PRD v4 원문 유지)

> Track B 전환 기준: Plumb 버그로 인한 장애 주 2회 이상

#### 3.3.2 데이터 수집 방법

| 데이터 소스 | 수집 대상 | 방법 |
|-------------|-----------|------|
| PlumbBridge 실행 로그 | 실행 횟수, 성공/실패, 응답 시간 | Git log + CLI 로그 분석 |
| GitHub Issues | Plumb 관련 버그 리포트 | `gh issue list` 키워드 검색 |
| KPI 이벤트 (F100) | `cli_invoke` 중 `plumb` 관련 | `kpi_events` 테이블 쿼리 (Sprint 27 의존) |
| 코드베이스 | PlumbBridge 호출 지점 | `grep -r "PlumbBridge\|plumb" packages/cli/` |

#### 3.3.3 판정 프로세스

1. **데이터 수집**: 위 4개 소스에서 지난 4주(Sprint 24~27) 데이터 수집
2. **분석**: 에러율, 평균 응답 시간, 장애 빈도 계산
3. **판정 매트릭스 적용**:

| 조건 | 판정 |
|------|------|
| 장애 주 2회 이상 **AND** 에러율 > 10% | **Go Track B** — TypeScript 재구현 시작 |
| 장애 주 1회 이하 **AND** 에러율 < 5% | **Stay Track A** — Plumb 유지, 판정 6개월 후 재검토 |
| 중간 | **Conditional** — 모니터링 강화 후 Sprint 30에서 재판정 |

4. **산출물**: ADR 문서 (`docs/adr/ADR-001-plumb-track-b.md`)
5. **SPEC 반영**: F105 상태 ✅ + §7 기술 스택에 판정 결과 기록

#### 3.3.4 Plumb 사용 현황 분석 코드 (경량)

**새 파일**: `packages/cli/src/plumb/usage-analyzer.ts`

| 메서드 | 설명 |
|--------|------|
| `collectUsageData()` | Git log에서 plumb 관련 커밋/에러 추출 |
| `calculateMetrics()` | 에러율, 평균 응답 시간, 장애 빈도 계산 |
| `generateReport()` | 판정 근거 마크다운 리포트 생성 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] F102: rebase 충돌 시 최대 3회 자동 재시도 + 복구 동작 확인
- [ ] F102: 3회 실패 시 AgentInbox에 escalation 메시지 전달
- [ ] F102: `git rebase --abort` 후 원본 상태 정상 복구
- [ ] F103: ESLint 커스텀 룰 3종 등록 + 각 룰에 수정 제안 동작
- [ ] F103: 기존 코드에서 위반 0건 (또는 기존 위반은 disable 주석)
- [ ] F105: 판정 데이터 수집 + 분석 리포트 + ADR 문서 작성
- [ ] F105: SPEC.md §7에 판정 결과 반영
- [ ] 전체 typecheck 통과 + 기존 테스트 통과
- [ ] 새 테스트 추가 (F102 ~15건, F103 ~10건, F105 ~5건)

### 4.2 Quality Criteria

- [ ] Test coverage: 신규 서비스 80%+
- [ ] Zero lint errors (커스텀 룰 포함)
- [ ] F102 무한 루프 방지: maxAttempts 3 하드코딩 + 타임아웃 60초

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| rebase 자동 해결이 코드를 망가뜨림 | High | Medium | LLM 수정 후 반드시 `typecheck + lint` 검증, 실패 시 즉시 abort |
| ESLint 커스텀 룰이 기존 코드에서 대량 위반 | Medium | Low | 기존 코드는 `warn` 레벨로 적용, 신규 코드만 `error` |
| Plumb 사용 데이터 부족 (실사용자 미참여) | Medium | High | 코드베이스 분석 + Git 이력 기반 정량화, 실사용 데이터 없음을 판정에 명시 |
| Sprint 27(F100 KPI)과 의존 — F105가 KPI 데이터 활용 | Low | Medium | F105는 Git log 기반 독립 분석도 가능, KPI 데이터는 보충 자료 |
| Sprint 27 미완료 시 migration 번호 충돌 | Medium | Low | Sprint 27의 migration 0018 확인 후 0019 사용, 또는 별도 migration 불필요(F102/F103은 스키마 변경 없음) |

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
| Rebase 전략 | git rebase / git merge / cherry-pick | **git rebase** | PRD G8 명시, 기존 WorktreeManager가 rebase 기반 |
| 충돌 해결 LLM | Claude API / Workers AI / rule-based | **Claude API** | 기존 ClaudeApiRunner 재활용, 코드 맥락 이해 필요 |
| ESLint 룰 범위 | API only / CLI only / 전체 | **전체 (패키지별 규칙 다름)** | 일관성 확보, 룰별 적용 범위 지정 |
| Plumb 판정 방식 | 자동 스크립트 / 수동 분석 / 혼합 | **혼합** | 데이터 수집은 스크립트, 최종 판정은 사람 |
| D1 migration 추가 | 필요 / 불필요 | **불필요** | F102/F103 모두 기존 테이블로 충분, F105는 코드+문서 |

### 6.3 Worker 배분 (Agent Team)

```
┌─────────────────────────────────────────────────┐
│ Worker 1 (W1): F102 — 에이전트 자동 Rebase       │
│   API: auto-rebase.ts 서비스                     │
│   API: merge-queue.ts 확장 (processNext에 통합)   │
│   API: worktree-manager.ts 확장 (abort/restore)  │
│   Test: auto-rebase.test.ts + merge-queue 보강    │
│   Schema: agent.ts 확장 (RebaseEscalation 타입)   │
├─────────────────────────────────────────────────┤
│ Worker 2 (W2): F103 — Semantic Linting           │
│   CLI: lint-rules/ 디렉토리 + 3개 룰 파일         │
│   CLI: eslint.config.js 수정                     │
│   API: eslint.config.mjs 수정 (공유 룰 적용)      │
│   Test: lint-rules 각 룰별 테스트                 │
└─────────────────────────────────────────────────┘

리더 담당:
  - F105: Plumb 판정 — usage-analyzer.ts + ADR 문서
  - 공유 파일 충돌 관리 (shared 타입 확장 등)
  - 최종 typecheck + lint + 전체 테스트 검증
  - SPEC.md 갱신 (F102/F103/F105 상태 전환)
```

### 6.4 파일 충돌 분석

| 파일 | W1 | W2 | 리더 | 충돌 위험 |
|------|:--:|:--:|:----:|:---------:|
| `auto-rebase.ts` (신규) | ✅ | — | — | 없음 |
| `merge-queue.ts` | ✅ | — | — | 낮음 (메서드 추가) |
| `worktree-manager.ts` | ✅ | — | — | 낮음 (메서드 추가) |
| `lint-rules/` (신규) | — | ✅ | — | 없음 |
| `eslint.config.js` | — | ✅ | — | 낮음 |
| `usage-analyzer.ts` (신규) | — | — | ✅ | 없음 |
| `packages/shared/types.ts` | ✅ | — | ✅ | **중간** — 순차 커밋 |

W1과 W2는 완전 독립 파일 작업이므로 **병렬 실행에 최적**.

---

## 7. Convention Prerequisites

### 7.1 Existing Conventions ✅

- [x] CLAUDE.md 코딩 컨벤션
- [x] ESLint flat config
- [x] TypeScript strict mode
- [x] Vitest + app.request() 테스트 패턴
- [x] Zod 스키마 + OpenAPI createRoute 패턴
- [x] WorktreeManager gitExecutor DI 패턴

### 7.2 New Conventions

| Category | Rule |
|----------|------|
| Rebase | maxAttempts=3 하드코딩, 타임아웃 60초/시도, abort 후 반드시 상태 검증 |
| ESLint Plugin | `packages/cli/src/harness/lint-rules/`에 집중, 룰당 별도 파일 |
| Plumb 판정 | ADR 형식 (`docs/adr/ADR-NNN-*.md`), 판정 결과 SPEC §7에 반영 |

### 7.3 Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `ANTHROPIC_API_KEY` | AutoRebase LLM 충돌 해결 (기존) | Server |
| (신규 없음) | — | — |

---

## 8. Implementation Order

### Phase 1: 핵심 서비스 (W1 + W2 병렬)

1. **W1**: `auto-rebase.ts` 서비스 — rebase retry loop + conflict detection + abort/restore
2. **W2**: `lint-rules/` 디렉토리 — 3개 커스텀 룰 + ESLint plugin 구조
3. **리더**: `usage-analyzer.ts` — Plumb 사용 데이터 수집 스크립트

### Phase 2: 통합 + 테스트 (W1 + W2 병렬)

4. **W1**: `merge-queue.ts` processNext()에 rebase 단계 통합 + `worktree-manager.ts` abort 메서드 추가
5. **W1**: `auto-rebase.test.ts` + `merge-queue.test.ts` 보강 (~15건)
6. **W2**: `eslint.config.js` 플러그인 등록 + 각 룰 테스트 (~10건)
7. **W2**: API/Web 패키지 eslint.config에 공유 룰 적용

### Phase 3: 판정 + 마무리 (리더)

8. **리더**: Plumb 사용 데이터 분석 + 판정 매트릭스 적용
9. **리더**: `docs/adr/ADR-001-plumb-track-b.md` 작성
10. **리더**: SPEC.md §7 판정 결과 반영 + F102/F103/F105 상태 갱신
11. **리더**: 공유 파일 (shared/types.ts) 통합 + typecheck + lint + 전체 테스트 검증

---

## 9. Dependencies

### 9.1 Sprint 27 의존성

| 항목 | 의존도 | 대응 |
|------|:------:|------|
| F100 KPI 이벤트 (kpi_events 테이블) | 약함 | F105 판정에 보충 자료로 사용, Git log만으로도 판정 가능 |
| F101 AutoFix 서비스 | 약함 | F102는 F101 패턴 참고하되 독립 구현 |
| D1 migration 0018 | 없음 | Sprint 28은 D1 스키마 변경 없음 |

### 9.2 외부 의존성

| 항목 | 상태 |
|------|------|
| Claude API (ANTHROPIC_API_KEY) | ✅ 설정 완료 |
| ESLint flat config API | ✅ 안정 (v9+) |
| PlumbBridge | ✅ Track A 운용 중 |

---

## 10. Next Steps

1. [ ] Design 문서 작성 (`sprint-28.design.md`)
2. [ ] SPEC.md F102/F103/F105 상태 📋→🔧 전환
3. [ ] Agent Team 2-worker 실행
4. [ ] Phase 3 완료 판정 + Phase 4 Go/Pivot/Kill 결정

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial draft | Sinclair Seo |
