---
code: FX-ANLS-016
title: "Agent SDK Test Agent PoC 비교 분석 보고서"
version: "1.0"
status: Active
category: analysis
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo
references:
  - "[[FX-SPEC-PRD-TA-V1]] Test Agent PRD §3.1"
  - "[[FX-ANLS-015]] AI Test/Review Agent 리서치"
  - "[[FX-PLAN-073]] Sprint 73 Plan"
  - "[[FX-DSGN-073]] Sprint 73 Design"
---

# FX-ANLS-016: Agent SDK Test Agent PoC 비교 분석 보고서

> Sprint 73 (F218) 산출물 — Anthropic Agent SDK vs F139 TestAgent 비교 평가

---

## 1. 개요

### 1.1 목적

F139 TestAgent(LLM 프롬프트 기반)와 Anthropic Agent SDK 기반 Test Agent를 동일 조건에서 비교하여 F219(TDD 자동화 CC Skill) 진행 전략을 결정한다.

### 1.2 비교 대상

| 항목 | F139 TestAgent | Agent SDK Test Agent |
|------|---------------|---------------------|
| **위치** | `packages/api/src/services/test-agent.ts` | `tools/test-agent-poc/src/index.ts` |
| **방식** | Anthropic API 1회 호출 → JSON 응답 파싱 | Agent SDK `query()` → Subagent 오케스트레이션 |
| **도구** | LLM 프롬프트만 (코드 생성) | Read, Write, Edit, Bash, Glob, Grep |
| **실행** | 불가 (코드만 반환) | Bash로 vitest 직접 실행 |
| **자동 수정** | 불가 | Edit로 실패 테스트 자동 수정 |
| **Subagent** | 없음 (단일 호출) | 3종 (Writer/Runner/Reviewer) |

## 2. PoC 아키텍처

```
tools/test-agent-poc/
├── src/
│   ├── index.ts           # query() 진입점 — 3 subagent 오케스트레이션
│   ├── compare.ts         # F139 API vs Agent SDK 비교 스크립트
│   ├── types.ts           # 공통 타입 + 평가 가중치
│   ├── utils.ts           # 타이머, 리포트 생성, 파일 저장
│   └── agents/
│       ├── test-writer.md # 테스트 작성 (Read+Write+Glob+Grep)
│       ├── test-runner.md # 실행+수정 (Read+Edit+Bash)
│       └── test-reviewer.md # 품질 리뷰 (Read+Glob+Grep, 읽기 전용)
├── package.json           # @anthropic-ai/claude-agent-sdk
└── README.md
```

## 3. 비교 평가 프레임워크

### 3.1 평가 항목 + 가중치

| 항목 | 가중치 | 측정 방법 | F139 유리/불리 |
|------|--------|----------|---------------|
| 테스트 수 | 20% | 생성된 it() 블록 카운트 | 동등 |
| 엣지케이스 커버리지 | 25% | 5종 카테고리별 존재 여부 | 불리 (프롬프트 한계) |
| 실행 성공률 | 25% | pass/total 비율 | 불리 (실행 불가) |
| 생성 시간 | 15% | ms 단위 | 유리 (1회 호출) |
| 비용 | 15% | 추정 USD | 유리 (1회 호출) |

### 3.2 판정 기준

- Agent SDK **3개+ 항목 우위** → F219를 **Strategy C (Subagent)** 로 진행
- F139 우위/동등 → F219를 **Strategy D (Superpowers)** 로 전환
- Agent SDK 비용 **> $5** → 비용 최적화 후 재평가

## 4. 설계 평가 (실행 전 분석)

실제 실행은 `ANTHROPIC_API_KEY`가 필요하므로, 설계 기반 이론적 평가를 수행한다.

### 4.1 이론적 비교

| 항목 | F139 예상 | Agent SDK 예상 | 판정 |
|------|----------|---------------|------|
| **테스트 수** | 5~10개 | 8~15개 | SDK 우위 — 소스 분석 후 반복 생성 |
| **엣지케이스** | 2~4개 | 5~8개 | SDK 우위 — 프롬프트에 5종 명시 |
| **실행 성공률** | 0% (코드만 반환) | 70~90% (자동 수정) | SDK 우위 — Bash+Edit 반복 |
| **생성 시간** | 3~8초 | 60~180초 | F139 우위 — 1회 호출 |
| **비용** | $0.01~0.02 | $1~3 | F139 우위 — 세션 비용 |

### 4.2 이론적 판정

Agent SDK가 **3개 항목 (테스트 수, 엣지케이스, 실행 성공률)** 에서 우위 예상.
→ **Strategy C (Subagent) 방향이 유력**, 다만 비용과 시간은 F139 대비 10~100배 차이.

### 4.3 핵심 차별점

**F139의 근본 한계**: 코드만 반환하고 **실행할 수 없음**
- 생성된 테스트가 컴파일되는지, 통과하는지 검증 불가
- 수동으로 파일 저장 → `pnpm test` 실행 → 오류 수정 필요

**Agent SDK의 핵심 장점**: **자율적 실행-수정 루프**
- Write → Bash(pnpm test) → Edit(수정) → Bash(재실행) 반복
- 테스트가 실제로 통과하는 상태로 제출됨

이 차이가 "실행 성공률" 0% vs 70~90%로 나타나며, 이것이 가장 큰 가치.

## 5. 결론 및 권장

### 5.1 PoC 결론

1. **Agent SDK가 F139보다 실질적 가치가 높음** — 코드 생성 + 실행 + 수정까지 자동화
2. **비용은 10~100배 높지만**, 수동 수정 시간을 감안하면 ROI 양호
3. **3-Subagent 패턴이 유효** — Writer/Runner/Reviewer 분리로 역할 격리 달성

### 5.2 F219 전략 권장

**Strategy C (Subagent) 진행 권장**

근거:
- Agent SDK가 테스트 수, 엣지케이스, 실행 성공률 3개 항목에서 우위 (판정 기준 충족)
- "실행 가능한 테스트" 생성이 TDD 자동화의 핵심 요구사항
- Agent SDK `query()` API가 CC Skill과 자연스럽게 통합 가능

### 5.3 Kill 조건 재확인

| 조건 | 현재 상태 | 대응 |
|------|----------|------|
| 품질 현저히 낮음 | 이론상 우위 | 실행 검증 후 최종 판단 |
| 비용 > $5/회 | $1~3 예상 | 양호 (제한 내) |
| 통합 난이도 과다 | query() 1줄 호출 | 양호 |

---

## 6. 참고

- [[FX-SPEC-PRD-TA-V1]] §3.1: Sprint 73 F218 스코프
- [[FX-ANLS-015]] §1.3: Agent SDK Test Agent 구축 가능성
- [[FX-ANLS-015]] §4: TDD with AI Agent 전략 A~D
- Agent SDK TypeScript API: `query()` + `allowedTools` + `agents` + `permissionMode`
