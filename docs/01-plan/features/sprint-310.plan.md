---
id: sprint-310
feature: F556
req: FX-REQ-602
sprint: 310
status: plan
date: 2026-04-19
---

# Sprint 310 Plan — F556 MetaAgent Rubric 튜닝

## 목표

- `rubric_score=100` 천장 현상 완화 → 제안 변별력 확보
- R6(Convergence) rawValue=0 근본원인 식별 및 수정
- 기존 proposals 재채점 regression 테스트
- 튜닝 기준 문서화

## 범위 (FX-REQ-602)

### (a) R6 rawValue=0 근본원인

`diagnostic-collector.ts`에서 Convergence(6번째 축)와 ToolEffectiveness(1번째 축)가
동일 계산식(`endTurnCount / rows.length`)을 사용 → Convergence가 독립적 신호를 제공하지 못함.

**실제 rawValue=0 시나리오**:
- `collectByBizItem` LIKE 패턴 미매칭 → rows=[] → 전 축 rawValue=0
- 모든 row의 stop_reason이 'end_turn'이 아닌 경우 (에러 실행) → Convergence rawValue=0

**수정 방향**: Convergence를 "평균 라운드 수 대비 이상 라운드(3) 비율"로 재정의
- rawValue = avgRounds (실측 라운드 수)
- score = clamp((idealRounds / avgRounds) * 100) — 라운드가 적을수록 수렴성 높음
- Planning과 구분: Planning은 라운드 수 자체, Convergence는 end_turn 달성 비율 × 라운드 효율 복합

### (b) ProposalRubric 천장 완화

현재 3축(R1/R2/R3) 채점이 완전한 proposal에 대해 항상 100점:
- R1(30): title/reasoning/yamlDiff 각 10점 — binary
- R2(40): "+" 라인 존재 20점 + length>50 20점 — trivially satisfied
- R3(30): 키워드 존재 여부 — binary

**수정 방향**: 각 축에 품질 그라디언트 추가

R1 Reproducibility (30pts):
- title 비어있지 않음: +5
- title 15자 이상(구체적): +5
- reasoning 비어있지 않음: +5
- reasoning 100자 이상(충분한 설명): +5
- yamlDiff 비어있지 않음: +10

R2 Executability (40pts):
- yamlDiff에 "+" 라인 존재: +10
- yamlDiff에 "-"와 "+" 모두 존재(proper diff): +10
- yamlDiff 100자 이상: +10
- yamlDiff에 YAML 키-값 패턴(`: ` 포함): +10

R3 Evidence (30pts) — graduated:
- 인과 키워드 포함(because/since/therefore/due to): +10
- 축 이름 참조(ToolEffectiveness/Memory/Planning/Verification/Cost/Convergence): +10
- 구체적 수치 참조(score/ratio/숫자 값): +10

예상 score 분포: 최소 제안=0~20, 보통=50~70, 우수=80~90, 완벽=95~100

### (c) Regression 테스트 + A/B 비교

- 기존 makeProposal() fixture가 이전에는 100점 → 이후에는 85~95점
- 다양한 품질의 proposals에 대해 점수 분포 확인
- ToolEffectiveness vs Convergence 차별화 확인

### (d) 문서화

`docs/specs/fx-hyperfx-agent-stack/rubric-tuning-v1.md` 생성

## 변경 파일 (예상)

| 파일 | 변경 유형 |
|------|---------|
| `packages/api/src/core/agent/services/proposal-rubric.ts` | 수정 (rubric 그라디언트) |
| `packages/api/src/core/agent/services/diagnostic-collector.ts` | 수정 (Convergence 재정의) |
| `packages/api/src/__tests__/services/proposal-rubric.test.ts` | 수정 (A/B regression) |
| `packages/api/src/__tests__/services/diagnostic-collector.test.ts` | 신규 (Convergence 분리 확인) |
| `docs/specs/fx-hyperfx-agent-stack/rubric-tuning-v1.md` | 신규 |

## 성공 기준

- Dogfood proposals 재채점 시 rubric_score ≠ 모두 100
- Convergence 계산식이 ToolEffectiveness와 달라짐
- 기존 테스트 21개 이상 모두 PASS
- Gap Match Rate ≥ 90%
