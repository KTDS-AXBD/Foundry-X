# fx-multi-agent-session PRD

**버전:** final
**날짜:** 2026-04-12
**작성자:** AX BD팀
**상태:** ✅ 착수 준비 완료

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Foundry-X 멀티 에이전트 세션을 Claude Squad 도입으로 표준화하여, C-track 14건 패치 누적의 근본 원인(lifecycle spec 부재)을 해소한다.

**배경:**
S257~S260에 걸쳐 tmux pane ↔ worktree ↔ task ↔ PR ↔ daemon 간 lifecycle 관련 C-track 이슈가 14건(C19~C32) 누적되었다. 매번 사후 패치 + feedback memory 기록으로 대응했으나, 근본 원인은 "세션-워크트리 lifecycle 표준 spec 부재"이다. 새 진입점(wtsplit, sprint N, task-start.sh 등)이 추가될 때마다 다른 경로에서 동일 패턴이 재발한다.

**문제-해결 연결 근거:**
기존 진입점(wtsplit, sprint N, task-start.sh, 수동 tmux split 등)이 모두 cs 세션 생성/관리에 포함될 수 있도록 bash 함수 및 운영 정책을 재정의하며, 병존이 불가피한 진입점(task-daemon 등)은 cs와 상태 연동 설계로 충돌을 예방한다. 이를 통해 cs 도입이 기존 문제(진입점 분산, 상태 동기화 실패, 패치 누적) 해소에 실질적으로 기여함을 명확히 한다.

**목표:**
Claude Squad(오픈소스 멀티 에이전트 세션 관리 도구)를 도입하고 Foundry-X 인프라와 연동하여, 세션 생성·격리·모니터링·정리를 표준화된 단일 경로로 통합한다.

**Source:**
- Discovery 산출물: `docs/specs/Multi-Agent-Coding-Tools-Analysis-v2.md` §3 Phase 34

**시장 적합성:**
AI 에이전트 기반 소프트웨어 개발 환경에서, 에이전트 오케스트레이션 및 개발 환경 표준화는 글로벌 시장의 핵심 트렌드다. 격리된 세션/워크트리 관리와 실시간 상태 모니터링은 업계 표준 요구로, 본 기획은 시장 변화에 부합한다.

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

**문제-해결 구조 추가 명시:**
cs 도입 시에도 task-daemon.sh 및 수동 tmux split 등 일부 진입점은 병존하며, cs와의 상태 동기화, 세션 격리 정책을 통해 중복·충돌을 최소화한다. 모든 진입점이 cs를 통해 표준화되는 것은 아니며, 잔여 경로에 대한 명확한 운영 기준을 병행 수립한다.

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

**KPI 보완 설명:**
- KPI-2(회귀 0건/4주)는 최초 2 Sprint(4주) 동안 측정 후, 신규 진입점 추가/운영변경 이벤트 발생 시 2주간 추가 모니터링을 의무화함.
- KPI-1(동시 세션 격리)은 각 세션의 작업(빌드, 실행, 커밋 등)이 완전 독립적으로 수행됨을 3회 반복 검증하여 품질 기준을 강화함.
- KPI-3(웹 가시성)은 Kanban 패널의 polling 데이터와 실제 세션 상태(log, cs CLI, worktree) 일치 여부를 주 2회 샘플링하여 운영 품질을 점검함.

### 5.2 MVP 최소 기준
- [ ] cs 세션 3개 동시 생성 + 각 WT 격리 확인
- [ ] `sprint N` 명령 1회로 cs 세션 자동 생성
- [ ] /work-management에 세션 카드 최소 1개 표시

### 5.3 실패/중단 조건
- **pivot 조건**: cs가 WSL2 + tmux 3.5a 환경에서 worktree 생성/격리 불가 시 접근 B(fx CLI 내장)로 전환
- **중단 조건**: PoC 단계에서 cs의 Go binary가 WSL2에서 빌드/실행 불가 + 대안 없음

**롤백/백업 플랜:**
- cs 기능 실패 또는 중단 시, 기존 manual tmux + worktree + task-daemon 방식으로 즉시 복구 가능하도록 운영 스크립트와 절차 문서를 별도 유지한다.
- 세션/워크트리 상태는 주기적으로 백업(스냅샷)하고, 복구/롤백 테스트를 Sprint별로 1회 이상 실시한다.

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

## 7. 테스트 및 품질 보증(Testing & QA)

| 구분 | 항목 | 내용 |
|------|------|------|
| 기능 테스트 | 핵심 경로 | sprint N → cs 세션 생성/종료, WT 격리, 웹 세션 패널 동작 3회 반복 테스트 |
| 회귀 테스트 | 이슈 재현 | 기존 C19~C32 관련 시나리오 2회 재현, 정상 동작 확인 |
| 통합 테스트 | API 연동 | /api/work/sessions 엔드포인트와 Kanban 패널 데이터 일치성 매 Sprint 검증 |
| 복구/롤백 | 복구 시나리오 | cs 장애 발생 시 manual 복구 절차 실행, 1시간 내 정상화 확인 |
| 자동화 | 스크립트 | 주요 경로(unit/batch) 테스트 스크립트 작성 및 주1회 자동 실행 |
| 보안/권한 | 권한 검증 | 세션/워크트리/agent 파일 접근 권한, 에이전트 환경 변수 격리 준수 확인 |

---

## 8. 운영 및 모니터링 계획

| 구분 | 내용 |
|------|------|
| 세션 상태 모니터링 | cs CLI + API + Kanban 동시 샘플링, 불일치 발생 시 알림 |
| 리소스 사용량 | tmux, worktree, agent별 리소스(CPU/RAM) 모니터링 및 주간 리포트 |
| 장애 알림 | 세션 생성/종료 실패, 상태 동기화 실패시 Slack 알림 |
| 운영 로그 | cs 로그, API 로그, Kanban 액세스 로그를 D1에 집계, 월간 점검 |
| 오픈소스 변경 감시 | cs 공식 릴리스 모니터링, 패치 자동 알림 및 변경점 분석 |
| 보안 패치 | cs 및 연동 컴포넌트 취약점 주기적 체크 및 적용 |

---

## 9. 보안 및 권한 관리

| 항목 | 내용 |
|------|------|
| 세션/워크트리 접근제어 | 각 세션의 HOME/model/account 디렉토리, SSH 키, git config 등 격리 및 권한 설정(700) 적용 |
| 에이전트 권한 | Claude agent 실행 환경에 least privilege 원칙 적용, 불필요한 공유 볼륨/네트워크 차단 |
| API 인증 | /api/work/sessions 엔드포인트에 JWT 기반 인증 및 rate limit 적용 |
| 로그 보안 | 세션/에이전트 로그 내 개인정보/액세스 토큰 masking, 30일 후 자동 삭제 정책 |

---

## 10. 오픈소스 및 시장/경쟁 분석

### 10.1 Claude Squad 오픈소스 유지보수 리스크
- 프로젝트 활발도: 최근 6개월간 커밋/이슈/PR 빈도 월 2회 이상 확인
- 핵심 maintainer 인력 구조 파악 및 릴리스 계획 수집
- 프로젝트 중단/방치 가능성에 대비해 주요 기능별 대체 방안(자체 wrapper, 추상화 레이어 등) 정의

### 10.2 시장 트렌드 및 경쟁
- AI Agent Orchestration 및 개발환경 격리 표준화는 글로벌 클라우드/AI 개발 시장의 명확한 트렌드
- 유사 사례: Github Codespaces, AWS Cloud9 등 격리 세션/워크스페이스 실시간 관리 모델 참고
- Claude Squad 기반 세션 관리가 시장 내 확장성/경쟁력 확보에 기여하는지 지속 검토

---

## 11. 리스크 및 대응 전략

| 우선순위 | 리스크 | 설명 | 대응 방안 |
|----------|--------|------|----------|
| P0 | cs의 WSL2 + tmux 3.5a 환경 미호환 | PoC 실패 시 전체 접근법 무효 | Sprint 262 이전 PoC, 실패 시 접근 B(내장 CLI) 즉시 전환 |
| P0 | 기존 task-daemon과 cs의 상태 충돌 | 이중 lifecycle, 데이터 손실 위험 | 데몬/세션 상태 연동 설계, 병행 운영 시 상태 동기화 자동화 |
| P1 | cs 오픈소스 유지보수 중단 | Vendor lock-in, 기술 부채 | Wrapper/추상화 레이어 도입, 대체 도구 후보군 사전 검토 |
| P1 | 세션 격리 실패 | 환경 오염, 계정/모델 충돌 | 권한/디렉토리 격리 자동화, 상태 검증 자동화 |
| P1 | 상태 동기화 실패 | CLI 파싱/파일/D1간 불일치 | 표준 모니터링 인터페이스 정의, polling/이벤트 기반 병행 검토 |
| P1 | 동시 세션/데몬/수동 tmux 리소스 경합 | 세션/데몬 자원 충돌 | 리소스 모니터링, 경합 탐지시 알림/제어 |
| P2 | 데이터 일관성(실시간성 불일치) | Kanban polling vs 실제 세션 지연 | API/CLI 상태 체크, 불일치 허용 범위 명시 |
| P2 | 관심사 분리 위반 | infra와 business logic 결합 | 기능별 추상화/인터페이스 분리 설계 |
| P2 | 운영 인력 리스크 | 개발/운영 단일 담당 | Onboarding 문서, 자동화 스크립트 강화 |
| P2 | 확장성/유지보수 | 팀원/기능 추가 시 표준화 미흡 | onboarding, 코드/문서 표준화 |
| 공통 | 롤백/백업 플랜 미비 | 도입 실패/에러시 복구 곤란 | 기존 방식 복구 문서화, 스냅샷 백업, 롤백 drill |

---

## 12. Out-of-scope

- PRD 내에서 cs 자체 기능의 근본적 개선(예: 내부 아키텍처 리팩토링, 오픈소스 프로젝트 방향성 제안) 요청은 본 범위를 벗어남.
- WebSocket 기반 세션 상태 실시간 스트리밍(phase F512)은 본 기획에 포함되지 않음.
- AI Assisted Merge, Ink TUI 등은 이번 범위 밖임.

---

## 13. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | cs가 WSL2 + tmux 3.5a에서 정상 동작하는지 PoC 검증 필요 | Sinclair | Sprint 262 전 |
| 2 | cs 프로파일과 .claude/agents/*.md 21종의 매핑 범위 (3종 외 확장 가능성) | [미정] | R1 검토 후 |
| 3 | cs가 기존 task-daemon.sh lifecycle과 어떻게 공존하는지 설계 필요 | [미정] | Design 단계 |
| 4 | M4 웹 API가 cs 상태를 어떻게 읽는지 (cs CLI 출력 파싱 vs 파일 기반 vs D1 연동) | [미정] | Design 단계 |
| 5 | KPI-2 "4주 회귀 0건"의 관찰 기간이 Sprint 2개 범위를 넘음 — 후속 모니터링 계획 필요 | [미정] | Report 단계 |

---

## 14. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 (v1) | 2026-04-12 | 최초 작성 (5파트 인터뷰 기반) | - |
| 1차 (v2) | 2026-04-12 | AI 검토 의견 반영: 문제-해결 구조 명확화, 성공 기준 보완, 리스크/운영/QA/보안/시장 분석/오픈소스 유지보수/롤백플랜 신규 추가 | R1: 79/100 |
| 2차 (final) | 2026-04-12 | R2 검토 82/100 통과 + Ambiguity 0.14. 착수 확정 | R2: 82/100 |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*
*Source: `docs/specs/Multi-Agent-Coding-Tools-Analysis-v2.md` (Discovery 산출물)*

---