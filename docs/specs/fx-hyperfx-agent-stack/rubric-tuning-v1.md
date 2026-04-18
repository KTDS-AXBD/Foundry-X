---
id: FX-DOC-rubric-tuning-v1
type: spec
feature: F556
sprint: 310
date: 2026-04-19
---

# MetaAgent Rubric 튜닝 v1 (F556)

## 배경

F542 Dogfood P2(Sprint 290), F544 P3(Sprint 292) 결과:
- proposals 6건 + 3건 모두 rubric_score=100
- 변별력 없어 Human Approval 우선순위 판단 불가

## ProposalRubric v2 변경 내용

### 버전

```ts
export const RUBRIC_VERSION = "v2-f556";
```

### R1 재현성 (max 30pts) — 그라디언트 채점

| 조건 | v1 | v2 |
|------|----|----|
| title 존재 | +10 | +5 |
| title 15자 이상 | — | +5 (신규) |
| reasoning 존재 | +10 | +5 |
| reasoning 100자 이상 | — | +5 (신규) |
| yamlDiff 존재 | +10 | +10 |

### R2 실행가능성 (max 40pts) — 그라디언트 채점

| 조건 | v1 | v2 |
|------|----|----|
| "+" 라인 존재 | +20 | +10 |
| "-" + "+" 모두 존재 (proper diff) | — | +10 (신규) |
| 길이 > 80자 | +20 (>50) | +10 (>80) |
| YAML key-value 패턴 | — | +10 (신규) |

### R3 근거명시 (max 30pts) — graduated

| 조건 | v1 | v2 |
|------|----|----|
| 인과 키워드 존재 | +30 (all-or-nothing) | +10 |
| 6축 이름 참조 | — | +10 (신규) |
| 구체적 수치 포함 | — | +10 (신규) |

### 예상 점수 분포 변화

| 제안 유형 | v1 | v2 |
|---------|----|----|
| 빈 제안 | 0 | 0 |
| 키워드만 있는 단순 제안 | 30 | 10 |
| MetaAgent 표준 생성 (reasoning~70자) | 100 | 95 |
| MetaAgent 상세 생성 (reasoning>100자) | 100 | 100 |
| proper diff 없는 제안 | 100 | 85 |

## Convergence 재정의 (DiagnosticCollector R6)

### 근본원인

ToolEffectiveness(R1)와 Convergence(R6) 모두 동일 계산식:
```
rawValue = endTurnCount / rows.length  // ratio
score = rawValue * 100
```
→ 6개 독립 신호 중 2개가 중복 → 6번째 축이 의미 없음

### 수정

Convergence를 "라운드 효율 × end_turn 달성" 복합 측정으로 재정의:

```ts
const endTurnRate = endTurnCount / rows.length;
const avgRounds = rows.reduce((s, r) => s + r.rounds, 0) / rows.length;
rawValue = avgRounds;              // unit: "rounds" (ToolEffectiveness.rawValue=ratio와 구별)
score = clamp(endTurnRate × (3 / max(avgRounds, 1)) × 100);
```

| 시나리오 | TE rawValue | Conv rawValue | Conv score |
|---------|-------------|---------------|------------|
| 1 round, end_turn | 1.0 (ratio) | 1.0 (rounds) | 100 |
| 5 rounds, end_turn | 1.0 | 5.0 | 60 |
| 3 rounds, error | 0.0 | 3.0 | 0 |

### rawValue=0 이슈 해소

- rows=[] fallback: 여전히 rawValue=0 (단위 없이 의미 없는 값)
- rows 있을 때: rawValue=avgRounds > 0 보장 (rounds가 0인 행이 없는 한)
- ToolEffectiveness와 다른 단위("rounds" vs "ratio")로 혼동 방지

## 관련 파일

- `packages/api/src/core/agent/services/proposal-rubric.ts` — v2 구현
- `packages/api/src/core/agent/services/diagnostic-collector.ts` — Convergence 재정의
- `packages/api/src/__tests__/services/proposal-rubric.test.ts` — A/B regression
- `packages/api/src/__tests__/services/diagnostic-collector.test.ts` — Convergence 독립성

## 다음 단계 (F556 후속)

- 4주 관측 후 실제 Dogfood proposals 점수 분포 확인
- rubric_score 분포가 여전히 집중적이면 v3 추가 조정 고려
- Convergence rawValue=0(rows=[]) 시 UI에서 "데이터 없음" 명시 표시
