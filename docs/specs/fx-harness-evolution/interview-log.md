# 요구사항 인터뷰 로그 — Phase 17 Self-Evolving Harness v2

**날짜:** 2026-04-06
**인터뷰어:** Claude Code (세션 #207)
**응답자:** Sinclair Seo (AX BD팀)
**입력 문서:** `docs/specs/self-evolving-harness-strategy.md` (FX-STRT-015 v3.0)

---

## 프로젝트 이름

Phase 17 — Self-Evolving Harness v2 (fx-harness-evolution)

---

## Part 1: 왜 (목적/문제)

**핵심 질문:** 지금 어떤 문제가 있어서, 또는 어떤 기회를 잡으려고 이걸 만들려고 하시나요?

**답변:** Guard Rail 자동 제안이 가장 급함. Phase 10~14에서 하네스 인프라를 구축했지만, 텔레메트리 데이터를 실제 행동 변화로 연결하는 루프가 없음.

**후속: 문제의 심각도**

세 가지 문제 동시 해당:
1. **반복 실패 패턴** — Sprint마다 비슷한 실패가 반복되는데, 자동 감지/예방 불가
2. **Rules 진부화** — Rules 5종이 세션 #199 이후 정적 상태, 새 패턴/교훈 미반영
3. **수동 개입 비용** — 텔레메트리 데이터는 쌓이는데 사람이 해석→행동으로 옮기는 시간 과다

---

## Part 2: 누구를 위해 (사용자/이해관계자)

**핵심 질문:** 이걸 누가 사용하거나 영향을 받게 되나요?

**답변:** 주 소비자는 **Claude Code 에이전트**. 자동 생성된 Rule이 `.claude/rules/`에 배치되면 에이전트가 자동 준수.

**후속: 승인 경로**

사람의 역할은 승인 게이트에 한정. **CLI/세션 내 프롬프트** 방식 — `/ax:session-start`에 통합하여 "새 Rule 제안 N건" 알림 → 세션 내에서 승인/거부. 대시보드나 PR 없이 가벼운 방식.

---

## Part 3: 무엇을 (범위/기능)

**핵심 질문:** 핵심 기능을 딱 한 문장으로 말한다면?

**답변:** P1+P2 전체 패키지로 진행.

**Must Have (P1):**
1. Guard Rail 자동 제안 — 반복 실패 패턴 감지 → Rule 초안 생성 → 세션 내 승인
2. O-G-D Loop 범용화 — Phase 16 Prototype 재활용 기반, BD 외 도메인 확장

**Should Have (P2):**
3. 에이전트 자기 평가 데이터 활용 — F148 데이터를 Guard Rail 개선에 연결
4. Skill Evolution 운영 지표 — DERIVED/CAPTURED 실제 재사용률 대시보드

**Out-of-scope:** 전략 문서 부록 B v3.0의 4개 항목 유지:
- `.harness/events/` Git 기반 이벤트
- Guard Rail 완전 자동화 (사람 승인 없이)
- 에이전트 자율 커밋
- 범용 하네스 프로파일 시스템

---

## Part 4: 어떻게 판단할 것인가 (성공 기준)

**핵심 질문:** 이게 성공했다는 걸 어떻게 알 수 있을까요?

**답변:** **반복 실패 감소율**이 핵심 KPI.

**후속: 기준선 데이터**

현재 execution_events 데이터 상태는 미확인. PRD에 "Phase 0: 데이터 상태 진단"을 선행 단계로 포함 필요.

---

## Part 5: 제약과 리소스

**핵심 질문:** 시간, 예산, 인력, 기술 스택 등에서 제약 조건?

**답변:** Phase 16 완료 후 시작. O-G-D 범용화는 F355 성공이 선행 조건.

기술 스택: 기존 Foundry-X (TypeScript + Hono + D1 + Cloudflare Workers)

---

## 요약 확인

✅ 수정/추가 없이 PRD 작성 시작 확인됨.
