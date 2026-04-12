# 멀티 에이전트 코딩 도구 비교 분석 v2 + Foundry-X 반영 계획

> 작성일: 2026-04-12 | 작성: Sinclair + Claude
> 기반: SPEC.md v5.78 (Sprint 261) + 코드 실측 + Git HEAD 5cf2131f

---

## 1. 분석 대상 3개 도구

### Auto-Claude (Aperant)
- **GitHub**: [AndyMik90/Auto-Claude](https://github.com/AndyMik90/Auto-Claude) ⭐13.9k
- **핵심**: Electron 데스크톱 앱. 목표 입력 → Spec→Planner→Coder(병렬 12개)→QA→AI머지 전체 자율 파이프라인
- **스택**: TypeScript + Electron + Vercel AI SDK v6, Git Worktree 격리, 3계층 보안 샌드박스
- **특장점**: 칸반 보드 UI, 메모리 계층(세션간 인사이트), GitHub/GitLab/Linear 통합

### Claude Squad
- **GitHub**: [smtg-ai/claude-squad](https://github.com/smtg-ai/claude-squad) ⭐7k+
- **핵심**: Go TUI. Claude Code/Codex/Gemini/Aider를 하나의 터미널에서 동시 관리
- **스택**: Go + tmux + git worktree, 프로파일 시스템 (`config.json`)
- **특장점**: 가볍고 실용적, yolo/자동승인 모드, 세션 일시정지/재개, diff preview

### Multica
- **GitHub**: [multica-ai/multica](https://github.com/multica-ai/multica)
- **핵심**: 코딩 에이전트를 실제 팀원으로 운영하는 오픈소스 관리형 플랫폼
- **스택**: Next.js 16 + Go/Chi + PostgreSQL 17 + pgvector, Docker/K8s 셀프호스팅
- **특장점**: 풀 태스크 라이프사이클(WebSocket), 재사용 스킬 시스템, 에이전트 프로필/보드

---

## 2. Foundry-X 기존 인프라 실측 매핑

### 2.1 이미 있는 것 (3개 도구와 겹치는 영역)

| 외부 도구 기능 | Foundry-X 대응 기능 | 실측 현황 | 충족도 |
|---------------|-------------------|----------|:------:|
| **Auto-Claude: 자율 파이프라인** | O-G-D Agent Loop (F270~F273) | ogd-orchestrator/generator/discriminator 3 에이전트, Rubric 7항목, 수렴 판정 | 🟠 70% |
| **Auto-Claude: 칸반 보드** | F509 Work Management Kanban | `/work-management` 4컬럼 Kanban + 5s polling (Walking Skeleton) | 🟡 40% |
| **Auto-Claude: Git Worktree 격리** | Sprint Worktree (`sprint N` bash) | 운영 중, git-workflow.md 문서화 | ✅ 90% |
| **Auto-Claude: 메모리 계층** | `.auto-memory/` + CLAUDE.md | user/feedback/project/reference 4타입 메모리 시스템 | ✅ 85% |
| **Auto-Claude: QA 루프** | SDD Triangle + auto-reviewer 에이전트 | PostToolUse hook (eslint+typecheck), Match Rate 93~98% | ✅ 90% |
| **Claude Squad: 멀티 에이전트 세션** | tmux 수동 관리 | 비공식, 표준화 안 됨 | 🔴 20% |
| **Claude Squad: 프로파일 시스템** | `.claude/agents/*.md` 21종 | 에이전트 정의 있으나 "세션 프로파일"은 아님 | 🟡 50% |
| **Multica: 스킬 레지스트리** | D1 skill_registry (F275) | 0081 마이그레이션 + API 8 endpoints + 40 tests | ✅ 80% |
| **Multica: 스킬 실행 메트릭** | D1 skill_executions (F274) | 0080 마이그레이션 + API 5 endpoints + 21 tests | ✅ 80% |
| **Multica: 태스크 라이프사이클** | task_states 상태 머신 (F333) | D1 0095 + 10상태 enum + TransitionGuard | 🟠 60% |
| **Multica: 에이전트 팀원 프로필** | `.claude/agents/*.md` | 21종 정의, 웹 대시보드 agents 페이지 존재 | 🟡 50% |
| **Multica: 멀티 워크스페이스** | modules/ 6개 도메인 격리 | auth/portal/gate/launch/billing + core/ 10개 | ✅ 85% |

### 2.2 없는 것 (GAP — 도입 가치 있는 영역)

| GAP | 관련 도구 | 설명 | 우선순위 |
|-----|----------|------|:--------:|
| **G1. 멀티 에이전트 세션 오케스트레이터** | Claude Squad | tmux 세션 표준화 + 에이전트별 worktree 자동 생성/관리 | 🔴 P0 |
| **G2. 에이전트 실행 실시간 모니터링** | Multica | WebSocket 기반 에이전트 활동 스트리밍 + 대시보드 | 🟠 P1 |
| **G3. AI 충돌 해결 (Assisted Merge)** | Auto-Claude | worktree 간 merge 시 AI가 충돌 분석+제안 (사람 승인 게이트 유지) | 🟡 P2 |
| **G4. 자율 코딩 루프 (Spec→Code→Test→PR)** | Auto-Claude | O-G-D를 넘어 전체 코드 생성 파이프라인 자율화 | 🟡 P2 |
| **G5. 에이전트 이슈 할당/보고** | Multica | 에이전트에 이슈 할당 → 자율 실행 → 블로커 보고 | 🟠 P1 |
| **G6. 스킬 학습/복합화** | Multica | 실행 성공 패턴 → 새 스킬 자동 생성 (DERIVED 엔진 F276 확장) | 🟡 P2 |

---

## 3. 반영 로드맵 v2 (실측 기반)

### Phase 34: 멀티 에이전트 세션 표준화 (G1, 1~2 Sprint)

> **가장 시급.** 현재 수동 tmux 관리가 병목이고 `git add .` 금지 규칙의 근본 원인.

**접근 A — Claude Squad 직접 도입** (권장, 빠름)
```
Sprint 262:
  - Claude Squad 설치 (brew install claude-squad)
  - Foundry-X용 프로파일 3종 정의:
    profile "coder"   → claude --model sonnet (코드 작성)
    profile "reviewer" → claude --model opus (코드 리뷰)
    profile "tester"  → claude --model haiku (테스트 실행)
  - `sprint N` bash 함수에 cs 세션 자동 생성 훅 추가
  - CLAUDE.md + git-workflow.md에 멀티 세션 운영 가이드 추가
```

**접근 B — Foundry-X CLI 내장** (장기, 자체 구현)
```
Sprint 262~263:
  - F510: `fx squad` 서브커맨드 — Ink TUI로 세션 관리
  - tmux + worktree 래핑, Sprint 시스템과 통합
  - 에이전트 프로파일 = .claude/agents/*.md 자동 로딩
```

**판정 기준**: 팀이 1명(Sinclair)이면 접근 A로 충분. 팀 확장 시 접근 B 전환.

**기존 자산 활용:**
- Sprint Worktree 시스템 (`sprint N` bash) → cs 세션 생성과 연계
- `.claude/agents/*.md` 21종 → cs 프로파일로 매핑
- git-workflow.md 규칙 → cs --autoyes 제한 (자동 커밋 금지 원칙 유지)

---

### Phase 34-B: 에이전트 이슈 할당 + 실시간 모니터링 (G2+G5, 2~3 Sprint)

> F509 Work Management Walking Skeleton을 확장. F333 TaskState Machine + F334 EventBus 기반.

```
Sprint 264:
  F511: Work Management → Agent 할당 기능
  - /api/work/assign POST (agent_id, task_id)
  - task_states에 AGENT_ASSIGNED → AGENT_RUNNING → AGENT_DONE 전이 추가
  - D1 0126: agent_task_runs (agent_id, task_id, started_at, status, output_summary)
  - 기존 에이전트 21종 중 "실행 가능" 에이전트 태깅 (coder/reviewer/tester)

Sprint 265:
  F512: WebSocket 에이전트 활동 스트리밍
  - Hono WebSocket 업그레이드 (Workers WebSocket API)
  - /work-management 페이지에 실시간 에이전트 상태 패널 추가
  - F334 EventBus → WebSocket 브리지
```

**기존 자산 활용:**
- F509 `/api/work/snapshot` + `/work-management` Kanban → 할당 뷰 확장
- F333 TaskState Machine 10상태 enum → 에이전트 전용 전이 3개 추가
- F334 EventBus + HookResultProcessor → WebSocket 이벤트 소스
- F274 skill_executions 테이블 → 에이전트 실행 메트릭과 조인

---

### Phase 35: DERIVED 엔진 확장 — 스킬 자동 복합화 (G6, 2 Sprint)

> F276 DERIVED 엔진(성공 패턴 자동 추출)이 이미 있음. Multica의 "재사용 가능한 스킬"과 유사.

```
Sprint 267:
  F513: 스킬 복합화 엔진
  - F276 DERIVED + F277 CAPTURED 결합
  - 크로스 도메인 패턴 감지: discovery+shaping 연속 성공 → "발굴→형상화 파이프라인 스킬" 자동 생성
  - F275 skill_registry에 composed_from 필드 추가 (lineage 추적)

Sprint 268:
  F514: 스킬 추천 + 자동 적용
  - /api/skills/recommend GET (context: current_stage, biz_item_type)
  - pgvector 없이 D1 기반 시맨틱 매칭 (TF-IDF or 태그 기반)
  - 웹 BD 프로세스 가이드에 "추천 스킬" 하이라이트 연동
```

**기존 자산 활용:**
- F275 skill_registry (D1 0081, 8 endpoints, success_rate/token_cost 메타)
- F276 DERIVED 엔진 (D1 0082, 반복 성공 패턴 추출)
- F277 CAPTURED 엔진 (D1 0083, 크로스 도메인 캡처)
- F278 BD ROI 벤치마크 (Cold Start vs Warm Run 비교)

---

### Phase 36: AI 어시스트 머지 + 자율 코딩 루프 PoC (G3+G4, 3~4 Sprint)

> **"자동 커밋 절대 금지"** 원칙을 유지하면서 Auto-Claude의 자율성을 가져오는 방법.

```
Sprint 270:
  F515: AI Assisted Merge
  - sprint merge 시 conflict 발생 → Claude에 diff 전달 → 해결 제안 생성
  - 제안을 worktree에 적용 (사람 확인 후 커밋 — 기존 원칙 준수)
  - conflict_resolutions D1 테이블 (이력 + 학습)

Sprint 271~272:
  F516: SDD-based 자율 코딩 루프 PoC
  - O-G-D Loop (F270~F273) 확장: BD 산출물 → 코드 산출물
  - Planner(ogd-orchestrator) → Coder(신규) → Tester(신규) → Reviewer(auto-reviewer)
  - 각 스테이지 사이에 사람 승인 게이트
  - `fx auto <task>` CLI 커맨드 (Ink TUI로 진행 상황 표시)
  - 첫 타겟: API 엔드포인트 1건 자동 생성 (route+service+schema+test+migration)
```

**기존 자산 활용:**
- ogd-orchestrator/generator/discriminator → 코드 생성 파이프라인으로 확장
- auto-reviewer 에이전트 → 코드 리뷰 단계
- SDD Triangle + PostToolUse hook → 품질 게이트
- F335 Orchestration Loop 3모드(retry/adversarial/fix) → 코드 생성에 재활용

---

## 4. 비교: v1 계획 vs v2 계획

| 항목 | v1 (추정 기반) | v2 (실측 기반) | 변경 이유 |
|------|:---:|:---:|------|
| 스킬 레지스트리 | "신규 구축" | **이미 존재** (F274~F278) | D1 0080~0084, 5개 테이블 이미 운영 |
| 칸반 보드 | "웹 대시보드 추가" | **Walking Skeleton 존재** (F509) | `/work-management` 4컬럼 Kanban 이미 있음 |
| 에이전트 프로파일 | "3종 정의" | **21종 정의 완료** | .claude/agents/ 풍부한 에이전트 생태계 |
| TaskState Machine | "신규" | **10상태 구현 완료** (F333) | D1 0095 + TransitionGuard |
| EventBus | "미고려" | **구현 완료** (F334) | HookResultProcessor + ExecutionEventService |
| 자율 파이프라인 | "처음부터 구축" | **O-G-D Loop 확장** | F270~F273 BD 산출물 루프 → 코드 생성으로 전환 |
| 멀티 세션 관리 | "Claude Squad 도입 or CLI" | **동일** (변경 없음) | 여전히 최대 GAP |

**핵심 발견: Foundry-X는 이미 Multica 수준의 스킬 인프라 + Auto-Claude 수준의 QA 루프를 보유.**
**진짜 GAP은 "멀티 세션 오케스트레이션"(Claude Squad 영역)과 "자율 코드 생성"(Auto-Claude 영역) 두 가지.**

---

## 5. F-item 후보 요약

| F# 후보 | 제목 | Phase | Sprint | 선행 |
|---------|------|:-----:|:------:|------|
| F510 | 멀티 에이전트 세션 표준화 (Claude Squad 통합 or CLI) | 34 | 262 | — |
| F511 | Work Management → Agent 할당 | 34-B | 264 | F509, F333 |
| F512 | WebSocket 에이전트 활동 스트리밍 | 34-B | 265 | F334, F511 |
| F513 | 스킬 복합화 엔진 (DERIVED+CAPTURED 확장) | 35 | 267 | F276, F277 |
| F514 | 스킬 추천 + 자동 적용 | 35 | 268 | F275, F513 |
| F515 | AI Assisted Merge | 36 | 270 | F510 |
| F516 | SDD 기반 자율 코딩 루프 PoC | 36 | 271~272 | F270, F335, F515 |

---

## 6. 판정

| 도구 | 도입 방식 | 시급도 |
|------|----------|:------:|
| **Claude Squad** | 직접 설치 + 프로파일 연동 (Phase 34) | 🔴 즉시 |
| **Multica** | 아이디어만 차용 (스킬 복합화, 에이전트 할당) — 인프라는 이미 있음 | 🟡 중기 |
| **Auto-Claude** | 자율 파이프라인 패턴만 차용 — O-G-D Loop 확장으로 대체 | 🟠 장기 |

> **결론**: Foundry-X는 생각보다 많은 것을 이미 갖추고 있어요. 346개 F-item, 21종 에이전트, 8개 스킬셋, TaskState Machine, EventBus, Skill Registry, O-G-D Loop... 외부 도구를 통째로 가져올 필요 없이, **멀티 세션 관리 표준화(G1)**만 해결하면 나머지는 기존 인프라 확장으로 커버 가능해요.

---

*Sources:*
- [Auto-Claude GitHub](https://github.com/AndyMik90/Auto-Claude)
- [Claude Squad GitHub](https://github.com/smtg-ai/claude-squad)
- [Multica GitHub](https://github.com/multica-ai/multica)
- Foundry-X SPEC.md v5.78 (Sprint 261)
- Foundry-X 코드 실측 (2026-04-12)
