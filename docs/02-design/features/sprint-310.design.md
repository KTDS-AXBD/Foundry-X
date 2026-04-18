---
id: sprint-310-design
feature: F556
sprint: 310
status: design
date: 2026-04-19
---

# Sprint 310 Design — F556 MetaAgent Rubric 튜닝

## §1 배경 및 문제 정의

### rubric_score=100 천장 현상

F542 Dogfood P2(S290): proposals 6건 실측, rubric_score=100 × 6/6.
F544 Dogfood P3(S292): proposals 3건 실측, rubric_score=100 × 3/3.

현재 ProposalRubric(v1) 채점 기준이 모두 binary/trivially satisfied:

| 축 | 현재 기준 | 문제 |
|----|---------|------|
| R1(30) | title/reasoning/yamlDiff 각 10pt | 필드만 있으면 만점 |
| R2(40) | "+" 라인 존재(20) + length>50(20) | 짧은 diff도 만점 |
| R3(30) | CAUSAL_KW 1개라도 있으면 30 | binary, 품질 불문 |

MetaAgent 생성 proposals는 항상 모든 기준을 충족 → 100점.

### R6(Convergence) rawValue=0 근본원인

`diagnostic-collector.ts`의 Convergence 계산식:
```ts
const rawValue = endTurnCount / rows.length;   // = ratio (0~1)
const score = clamp(rawValue * 100);
```

ToolEffectiveness 계산식:
```ts
const rawValue = endTurnCount / rows.length;   // 완전히 동일
const score = clamp(rawValue * 100);
```

**두 축이 동일 formula** → Convergence가 독립적인 6번째 신호 제공 불가.

rawValue=0 시나리오:
1. rows=[] (collectByBizItem LIKE 패턴 미매칭) → 전 축 fallback {score:50, rawValue:0}
2. rows 존재하나 stop_reason ≠ 'end_turn' (error/max_rounds) → rawValue=0, score=0

## §2 설계 결정

### D1 ProposalRubric v2 — 그라디언트 채점

기존 3축(R1/R2/R3)을 유지하되 각 축 내부를 단계별로 세분화.

**R1 Reproducibility (max 30pts)**:

| 조건 | 점수 |
|------|------|
| title 비어있지 않음 | +5 |
| title 15자 이상 | +5 |
| reasoning 비어있지 않음 | +5 |
| reasoning 100자 이상 | +5 |
| yamlDiff 비어있지 않음 | +10 |

**R2 Executability (max 40pts)**:

| 조건 | 점수 |
|------|------|
| yamlDiff에 "+" 라인 존재 | +10 |
| yamlDiff에 "-"와 "+" 모두 존재 (proper diff) | +10 |
| yamlDiff 80자 이상 (substantial) | +10 |
| yamlDiff에 YAML key-value 패턴 (`/:\s+\S/`) | +10 |

**R3 Evidence (max 30pts)** — graduated:

| 조건 | 점수 |
|------|------|
| 인과 키워드 (because/therefore/since/due to/reason/score/axis) | +10 |
| 6축 이름 참조 (ToolEffectiveness/Memory/.../Convergence) | +10 |
| 구체적 수치 포함 (`/\d+/`) | +10 |

**예상 분포** (Dogfood proposals 기준):
- 최소 (빈 필드): 0점
- 단순 ("because" + 1개 필드): 20~40점
- 보통 MetaAgent 생성 proposals: 75~95점
- 완벽 (reasoning>100자 + proper diff + 3기준): 95~100점

### D2 Convergence 재정의 — 라운드 효율 복합 점수

Convergence(6번째 축)를 ToolEffectiveness와 구별되는 복합 측정으로 재정의:

```
rawValue = avgRounds (실측 평균 라운드 수)
score = clamp(endTurnRate × (IDEAL_ROUNDS / max(avgRounds, 1)) × 100)
unit = "rounds"
```

- `IDEAL_ROUNDS = 3` (기존 Planning 기준 재사용)
- endTurnRate = endTurnCount / rows.length
- rawValue = avgRounds → ToolEffectiveness.rawValue(ratio)와 다른 단위

| 시나리오 | TE rawValue | Convergence rawValue | Convergence score |
|---------|-------------|---------------------|------------------|
| 1 round, end_turn | 1.0 (ratio) | 1.0 (rounds) | 100 |
| 3 rounds, end_turn | 1.0 | 3.0 | 100 |
| 5 rounds, end_turn | 1.0 | 5.0 | 60 |
| 3 rounds, error | 0.0 | 3.0 | 0 |
| rows=[] | 0(fallback) | 0(fallback) | 50(fallback) |

rawValue=0 이슈 해결: rows=[] 시 fallback rawValue=0은 그대로이나, rows가 있으면 avgRounds>0이므로 rawValue>0 보장.

## §3 테스트 계약 (TDD Red Target)

### proposal-rubric.test.ts 갱신

```
F556 A/B ProposalRubric v2
├─ 완전한 제안은 100점 미만을 반환한다 (변별력 확인) [NEW]
├─ R1: makeProposal() 의 R1 점수는 25점이다 (reasoning < 100자) [갱신: 30→25]
├─ R1: title 비어있으면 R1 < 25
├─ R2: makeProposal() 의 R2 점수는 40점이다 [유지]
├─ R2: yamlDiff 비어있으면 R2=0 [유지]
├─ R2: proper diff("-"+"+"모두) 없으면 R2 감점 [NEW]
├─ R3: makeProposal() 의 R3 점수는 30점이다 [유지]
├─ R3: 키워드·축이름·숫자 중 1개만 있으면 R3=10 [NEW]
├─ R3: 키워드 없으면 R3=0 [유지]
├─ 최소 제안(빈 필드) → 0점 [유지]
└─ 총점 = R1+R2+R3 [유지]
```

### diagnostic-collector.test.ts 추가

```
F556 DiagnosticCollector Convergence 재정의
├─ Convergence.rawValue는 avgRounds 값이다 [NEW]
├─ ToolEffectiveness.rawValue와 Convergence.rawValue는 다르다 (rounds>1) [NEW]
└─ Convergence.score: 라운드 효율이 높을수록 높다 [기존 ≥80 유지]
```

## §5 파일 매핑

| 파일 | 변경 유형 | 설명 |
|------|---------|------|
| `packages/api/src/core/agent/services/proposal-rubric.ts` | 수정 | v2 그라디언트 채점 |
| `packages/api/src/core/agent/services/diagnostic-collector.ts` | 수정 | Convergence 재정의 |
| `packages/api/src/__tests__/services/proposal-rubric.test.ts` | 수정 | A/B + 갱신된 기대값 |
| `packages/api/src/__tests__/services/diagnostic-collector.test.ts` | 수정 | Convergence 독립성 검증 |
| `docs/specs/fx-hyperfx-agent-stack/rubric-tuning-v1.md` | 신규 | 튜닝 기준 문서 |

## §6 D1~D4 체크리스트

- D1: ProposalRubric는 discovery-stage-runner.ts에서 호출 — 시그니처 변경 없음 (score()/breakdown() 유지) ✅
- D2: rubricScore는 number 타입 유지, 0~100 범위 보장 ✅
- D3: Breaking change 없음 — 반환 타입 동일, max값만 달라짐 ✅
- D4: TDD Red 파일 존재 — 아래 구현 전 테스트 FAIL 확인 필수 ✅
