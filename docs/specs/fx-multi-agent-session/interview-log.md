# fx-multi-agent-session Interview Log

> 작성일: 2026-04-12
> 진행: Claude (interviewer) + Sinclair (interviewee)
> Source: `docs/specs/Multi-Agent-Coding-Tools-Analysis-v2.md` (Discovery 산출물)

---

## Part 1: 왜 (목적/문제)

**Q. F510을 지금 만들어야 하는 '가장 아픈 이유'는?**
→ **C-track 이슈 누적 해소.** C19~C32 14건의 패치가 누적됐는데 아직 근본적 구조 결함이 남아 있음. F510이 이 더미도미를 닫아야 함.

**Q. 근본 결함을 한 줄로 표현하면?**
→ **Lifecycle 표준 spec 부재.** tmux pane ↔ worktree ↔ task ↔ PR ↔ daemon의 lifecycle이 도메인 레벨에서 정의 안 됨. 새 고장나면 별도 patch + feedback memory 녹음. F510은 lifecycle spec(state machine)이 먼저 있고 구현이 따라와야 함.

---

## Part 2: 누구를 위해 (사용자/이해관계자)

**Q. F510의 주 사용자 스코프를 어디까지 잡을까?**
→ **Foundry-X 웹 사용자 포함.** Sinclair(주) + Claude agent(2차) + F509 Kanban에 세션 상태가 보여야 하는 웹 사용자(3차).

- 환경: WSL2 Ubuntu + tmux 3.5a + Foundry-X API(Workers) + Web(Pages)

---

## Part 3: 무엇을 (범위/기능)

**Q. 핵심 기능을 한 문장으로?**
→ **Claude Squad 도입 + 프로파일 연동** (분석 문서 접근 A).

**Must Have (4건 전부 선택):**
1. M1: cs 설치 + 프로파일 3종 정의 (coder/reviewer/tester)
2. M2: `sprint N` bash 함수에 cs 세션 자동 생성 훅 추가
3. M3: git-workflow.md 연동 규칙 (자동 커밋 금지 원칙 유지)
4. M4: 웹 Kanban 세션 상태 노출 (polling 기반)

**Out-of-scope (4건 전부 확인):**
1. fx CLI 서브커맨드 자체 구현 (접근 B)
2. AI Assisted Merge (G3, F515)
3. WebSocket 실시간 스트리밍 (G2, F512)
4. Agent 할당 시스템 (G5, F511)

---

## Part 4: 어떻게 판단할 것인가 (성공 기준)

**Q. MVP 성공 기준?**
→ 3개 선택 (KPI-4 sprint UX 편의는 제외):
1. **KPI-1**: cs 세션 3개 동시 실행 + 격리 성공
2. **KPI-2**: C-track 회귀 0건 4주 유지
3. **KPI-3**: 웹 Kanban에 세션 상태 표시

---

## Part 5: 제약과 리소스

**Q. Claude Squad WSL2 호환성 검증 방법?**
→ **Sprint 전에 선 호환성 검증 (PoC).** 호환 불가 시 접근 B로 pivot.

- 인력: 1인 (Sinclair + Claude agent)
- 기간: Sprint 1~2개
- 기술: cs(Go) + bash + TypeScript(API+Web)
- 비용: cs 오픈소스, 추가 비용 없음
- pivot 조건: cs가 WSL2에서 worktree 생성/격리 불가 시
