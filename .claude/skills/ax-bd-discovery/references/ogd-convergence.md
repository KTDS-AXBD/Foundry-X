# O-G-D 수렴 판정 가이드

> Orchestrator가 각 라운드 종료 시 참조하는 수렴 판정 규칙

## 수렴 조건 (CONVERGED)

모든 조건을 동시에 충족해야 한다:
1. `verdict == "PASS"`
2. `quality_score >= 0.85`
3. `critical_count == 0`
4. `major_count <= 1`

## 판정 흐름

```
Round N 완료 후:

1. Best 추적 갱신
   if quality_score > best_score:
     best_score = quality_score
     best_artifact = round-N artifact
     best_round = N

2. 수렴 체크
   if 수렴 조건 모두 충족:
     → CONVERGED
     → 최종 산출물: round-N artifact
     → ogd-report.md 생성

3. 강제 종료 체크
   if round >= max_rounds:
     → FORCED_STOP
     → 최종 산출물: best_artifact (최고 점수 라운드)
     → residual_findings: 현재 라운드의 미해결 findings
     → ogd-report.md 생성

4. 품질 역전 감지 (Quality Regression)
   if round >= 1 AND quality_score < prev_round_score:
     → 경고 로그: "⚠️ Quality Regression: {prev} → {current}"
     → strategy = "rollback_and_refine"
     → base = best_artifact
     → 다음 Generator에게 best_artifact 기반 개선 지시

5. 계속 진행
   if verdict == "MINOR_FIX":
     → strategy = "targeted_fix"
     → focus = minor 이하 findings만 전달
   if verdict == "MAJOR_ISSUE":
     → strategy = "deep_revision"
     → focus = critical + major findings 전달
```

## 전략별 Generator 지시

| 전략 | Generator에게 전달하는 지시 |
|------|--------------------------|
| `initial` | "태스크와 Rubric을 기반으로 산출물을 생성하라" |
| `targeted_fix` | "이전 산출물의 구조를 유지하면서 지적된 {N}건만 수정하라" |
| `deep_revision` | "전체 구조를 재검토하고 Critical/Major 문제를 근본적으로 해결하라" |
| `rollback_and_refine` | "이 산출물(best)을 기반으로 부분 개선만 수행하라. 기존 강점을 훼손하지 마라" |
| `approach_shift` | "완전히 다른 관점이나 프레임워크로 재작성하라. 이전과 동일한 접근은 금지" |

## 점수 변화 추적

각 라운드의 점수를 기록하여 추세를 파악한다:

```
Round 0: 0.55 (initial)
Round 1: 0.72 (+0.17, deep_revision)
Round 2: 0.87 (+0.15, targeted_fix) → CONVERGED
```

정상 패턴: 매 라운드마다 +0.10~0.20 향상
경고 패턴: 향상 폭 < 0.05 → Mode Collapse 의심
역전 패턴: 점수 하락 → rollback_and_refine 전략 적용

## 에러 상황 판정

| 상황 | 판정 |
|------|------|
| Generator 재시도 1회 후 재실패 | FORCED_STOP(error="generator_failure") |
| Discriminator LOW_CONFIDENCE | Orchestrator가 직접 verdict 결정 |
| 2회 연속 에러 (다른 에이전트라도) | FORCED_STOP(error="consecutive_failures") |
| _workspace/ 파일 손상 | 이전 라운드 복구 시도 → 불가 시 FORCED_STOP |
