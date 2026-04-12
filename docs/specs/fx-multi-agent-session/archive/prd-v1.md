# fx-multi-agent-session PRD

**버전:** v1
**날짜:** 2026-04-12
**작성자:** AX BD팀
**상태:** 🔄 검토 중

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Foundry-X 멀티 에이전트 세션을 Claude Squad 도입으로 표준화하여, C-track 14건 패치 누적의 근본 원인(lifecycle spec 부재)을 해소한다.

**배경:**
S257~S260에 걸쳐 tmux pane ↔ worktree ↔ task ↔ PR ↔ daemon 간 lifecycle 관련 C-track 이슈가 14건(C19~C32) 누적되었다. 매번 사후 패치 + feedback memory 기록으로 대응했으나, 근본 원인은 "세션-워크트리 lifecycle 표준 spec 부재"이다. 새 진입점(wtsplit, sprint N, task-start.sh 등)이 추가될 때마다 다른 경로에서 동일 패턴이 재발한다.

**목표:**
Claude Squad(오픈소스 멀티 에이전트 세션 관리 도구)를 도입하고 Foundry-X 인프라와 연동하여, 세션 생성·격리·모니터링·정리를 표준화된 단일 경로로 통합한다.

**Source:**
- Discovery 산출물: `docs/specs/Multi-Agent-Coding-Tools-Analysis-v2.md` §3 Phase 34

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)
- C19~C32 14건의 tmux/WT/lifecycle 관련 패치 누적 (S257~S260, ~4주)
- 매 패치 비용 ≈ 기능 1~2건 개발 비용 초과 (C27~C32 6건은 S260 단일 세션에서 처리)
- 진입점 4개(wtsplit, sprint N, task-start.sh, 수동 tmux split)가 각각 다른 코드 경로
- feedback memory 7건 누적 (tmux34_bug, daemon_stale_code, sprint_tmux_split 등)
- 세션 상태가 daemon JSONL + sprint signal + Monitor 3곳에 분산

### 2.2 목표 상태 (To-Be)
- Claude Squad가 세션 lifecycle(생성·격리·일시정지·재개·정리)을 표준 관리
- `sprint N` 한 번이면 cs 세션이 자동 생성되고 WT 격리까지 완료
- /work-management 웹 Kanban에 활성 세션 목록 + 상태(busy/idle/done) 노출
- 4주간 lifecycle 관련 C-track 신규 이슈 0건

### 2.3 시급성
- **P0.** 14건 패치의 누적 비용이 이미 기능 개발 비용을 초과. 추가 기능(F511~F516)이 전부 "세션 관리 표준화"를 전제로 하므로 병목 해소가 선행 필수.

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| Sinclair (개발자) | 1인 개발자, CLI + tmux + daemon 환경 | 세션 생성/정리 자동화, 인지부하 감소, 회귀 제거 |
| Claude agent (AI) | WT worker로 자율 실행 | 격리된 worktree에서 독립 실행, HOME/model/account 정합성 |
| 웹 사용자 | Foundry-X /work-management 접속자 | 활성 세션 현황 실시간(polling) 확인 |

### 3.2 이해관계자
| 구분 | 역할 | 영향도 |
|------|------|--------|
| Sinclair | 개발자 + 의사결정자 | 높음 |

### 3.3 사용 환경
- 기기: PC (WSL2 Ubuntu 24.04)
- 네트워크: 인터넷 (GitHub API, Cloudflare Workers)
- 기술 수준: 개발자
- tmux: 3.5a (소스 빌드, `~/.local/bin/tmux`)

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | AC (Acceptance Criteria) |
|---|------|------|--------------------------|
| M1 | cs 설치 + 프로파일 3종 정의 | Claude Squad 설치, coder(sonnet)/reviewer(opus)/tester(haiku) 3 프로파일 정의 | (a) `cs --version` 정상 출력 (b) `cs list` 에서 3 프로파일 확인 (c) .claude/agents/*.md 21종 중 실행 가능 3종 매핑 완료 |
| M2 | sprint N 훅 연동 | `sprint N` bash 함수가 cs 세션을 자동 생성. 기존 tmux split + ccs inject 경로 대체 | (a) `sprint 262` 실행 시 cs 세션 자동 생성 (b) WT 경로가 `~/work/worktrees/Foundry-X/sprint-262`로 격리 (c) 기존 task-start.sh 코드 경로와 비충돌 |
| M3 | git-workflow.md 연동 규칙 | cs --autoyes 제한(자동 커밋 금지), WT 격리 규칙, 기존 git-workflow.md와 정합성 확보 | (a) cs 세션에서 `git add .` / `--no-verify` 금지 규칙 적용 (b) git-workflow.md에 cs 운영 섹션 추가 (c) CLAUDE.md에 cs 관련 가이드 반영 |
| M4 | 웹 Kanban 세션 상태 노출 | F509 /work-management에 활성 cs 세션 목록 + 상태 표시. polling 기반 (5s) | (a) `GET /api/work/sessions` 엔드포인트 신규 (b) /work-management에 "Sessions" 패널 추가 (c) 세션당 상태(busy/idle/done) + agent 프로파일 표시 |

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| S1 | 세션 일시정지/재개 웹 제어 | /work-management에서 세션 일시정지/재개 버튼. cs의 기존 기능 활용 | P1 |
| S2 | 세션 diff preview 웹 노출 | cs diff preview를 API 경유로 웹에 표시 | P1 |
| S3 | 미래 팀 확장 대비 onboarding 문서 | cs 프로파일 + sprint hook 사용법 가이드. 팀원 합류 시 참조 | P2 |

### 4.3 제외 범위 (Out of Scope)
- **fx CLI 서브커맨드 자체 구현 (접근 B)**: Ink TUI로 세션 관리 내장은 이번 스코프 아님. cs 외부 도구에 위임
- **AI Assisted Merge (G3, F515)**: WT 간 merge 시 AI 충돌 해결은 Phase 36 범위
- **WebSocket 실시간 스트리밍 (G2, F512)**: M4는 polling 기반. WebSocket은 F512로 분리
- **Agent 이슈 할당 시스템 (G5, F511)**: 에이전트에 이슈 할당 → 자율 실행은 Phase 34-B 범위

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| Claude Squad (Go binary) | CLI 직접 호출 (`cs` command) | 필수 |
| tmux 3.5a | cs 내부 의존 (cs가 tmux session 관리) | 필수 |
| git worktree | cs 내부 의존 (cs가 worktree 생성/격리) | 필수 |
| Foundry-X API (Workers) | REST API 확장 (`/api/work/sessions`) | 필수 (M4) |
| Foundry-X Web (Pages) | React 컴포넌트 추가 | 필수 (M4) |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| KPI-1: 동시 세션 격리 | 수동 1~2개 | cs 3세션 동시 격리 | `cs list` + `git worktree list` 교차 검증 |
| KPI-2: C-track 회귀 | 14건/4주 (C19~C32) | 0건/4주 | SPEC.md backlog + GitHub Issues |
| KPI-3: 웹 세션 가시성 | 없음 | /work-management 세션 패널 | 브라우저 + 5s polling 동작 확인 |

### 5.2 MVP 최소 기준
- [ ] cs 세션 3개 동시 생성 + 각 WT 격리 확인
- [ ] `sprint N` 명령 1회로 cs 세션 자동 생성
- [ ] /work-management에 세션 카드 최소 1개 표시

### 5.3 실패/중단 조건
- **pivot 조건**: cs가 WSL2 + tmux 3.5a 환경에서 worktree 생성/격리 불가 시 접근 B(fx CLI 내장)로 전환
- **중단 조건**: PoC 단계에서 cs의 Go binary가 WSL2에서 빌드/실행 불가 + 대안 없음

---

## 6. 제약 조건

### 6.1 일정
- PoC (선행): Sprint 262 시작 전 cs WSL2 호환성 검증
- 목표 완료: Sprint 262~263 (1~2 Sprint)
- 마일스톤:
  - MS1: cs 설치 + 프로파일 정의 + PoC 완료
  - MS2: sprint hook 연동 + git-workflow 정합성
  - MS3: 웹 API + Kanban 세션 패널

### 6.2 기술 스택
- CLI/hook: bash (sprint N 함수 확장) + cs (Go binary)
- 백엔드: Hono + Cloudflare Workers + D1 (기존 API 확장)
- 프론트엔드: Vite + React 18 + React Router 7 (기존 Web 확장)
- 인프라: Cloudflare Workers/Pages/D1 (기존 인프라)
- 기존 의존: tmux 3.5a, git worktree, sprint bash 함수, task-start.sh

### 6.3 인력/예산
- 투입 인원: 1명 (Sinclair) + Claude agent
- 예산: cs 오픈소스, 추가 비용 없음

### 6.4 컴플라이언스
- git-workflow.md 자동 커밋 금지 원칙 유지 (cs --autoyes 제한)
- `git add .` / `git add -A` 금지 규칙 cs 환경에서도 적용

---

## 7. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | cs가 WSL2 + tmux 3.5a에서 정상 동작하는지 PoC 검증 필요 | Sinclair | Sprint 262 전 |
| 2 | cs 프로파일과 .claude/agents/*.md 21종의 매핑 범위 (3종 외 확장 가능성) | [미정] | R1 검토 후 |
| 3 | cs가 기존 task-daemon.sh lifecycle과 어떻게 공존하는지 설계 필요 | [미정] | Design 단계 |
| 4 | M4 웹 API가 cs 상태를 어떻게 읽는지 (cs CLI 출력 파싱 vs 파일 기반 vs D1 연동) | [미정] | Design 단계 |
| 5 | KPI-2 "4주 회귀 0건"의 관찰 기간이 Sprint 2개 범위를 넘음 — 후속 모니터링 계획 필요 | [미정] | Report 단계 |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 (v1) | 2026-04-12 | 최초 작성 (5파트 인터뷰 기반) | - |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*
*Source: `docs/specs/Multi-Agent-Coding-Tools-Analysis-v2.md` (Discovery 산출물)*
