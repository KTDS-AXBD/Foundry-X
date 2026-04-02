# O-G-D Mode Collapse 감지 가이드

> Generator가 동일한 패턴에 갇히는 현상을 감지하고 대응하는 방법

## Mode Collapse란?

GAN에서 Generator가 하나의 패턴만 반복 생성하여 다양성이 사라지는 현상.
O-G-D에서는 Generator가 피드백을 반영할 때 **같은 방식으로만 수정**하여
품질 향상이 정체되는 상태를 의미한다.

## 감지 기준

### 1. 점수 정체 (Stagnation)

```
if round >= 2:
  score_delta = quality_score[N] - quality_score[N-1]
  if abs(score_delta) < 0.05:
    → Mode Collapse 의심
    → "향상 폭이 5% 미만으로 정체됨"
```

### 2. 동일 피드백 반복 (Repetitive Findings)

```
if round >= 2:
  current_findings = discriminator_feedback[N].findings
  prev_findings = discriminator_feedback[N-1].findings
  overlap = current_findings ∩ prev_findings (criterion 기준)
  if len(overlap) / len(current_findings) >= 0.7:
    → Mode Collapse 확정
    → "같은 항목이 70% 이상 반복 지적됨"
```

### 3. 구조 유사도 (Structural Similarity)

```
if round >= 2:
  current_headings = extract_headings(artifact[N])
  prev_headings = extract_headings(artifact[N-1])
  if current_headings == prev_headings AND content_similarity > 0.8:
    → Mode Collapse 의심
    → "산출물 구조와 내용이 80% 이상 유사"
```

## 대응 전략

### approach_shift (관점 전환)

Generator에게 다음을 지시한다:

**변경 방법 예시:**
- 시장 분석 → Top-down에서 Bottom-up으로 전환
- 경쟁 분석 → 기능 비교에서 고객 관점 비교로 전환
- 수익 모델 → 구독에서 거래 수수료로 전환
- 실행 계획 → 자체 개발에서 파트너십 기반으로 전환

**프롬프트 힌트:**
```
"이전 2라운드에서 같은 접근 방식이 반복되고 있다.
 다음 중 하나를 선택하여 완전히 다른 관점으로 재작성하라:
 1. 대상 고객을 B2B에서 B2C로 (또는 반대로) 전환
 2. 수익 모델을 다른 유형으로 교체
 3. 기술 접근 방식을 대안으로 변경
 4. 지리적/산업적 범위를 변경
 이전 라운드의 강점은 가져가되, 프레임워크 자체를 바꿔야 한다."
```

### approach_shift 재시도 제한

```
approach_shift_count = 0
MAX_APPROACH_SHIFTS = 2

if mode_collapse_detected:
  approach_shift_count++
  if approach_shift_count >= MAX_APPROACH_SHIFTS:
    → FORCED_STOP(reason="mode_collapse_unresolved")
    → 최고 점수 라운드의 산출물 채택
    → residual_notes에 "Mode Collapse 미해결" 기록
  else:
    → CONTINUE(strategy="approach_shift")
```

## Rubric 진화 (보조 메커니즘)

Mode Collapse 방지를 위해 Orchestrator가 Rubric 가중치를 라운드별로 조정할 수 있다:

```
rubric_evolve(round, findings):
  # 반복 지적 항목의 가중치 증가 (집중 유도)
  for finding in findings:
    if finding.criterion in repeated_issues(last_2_rounds):
      rubric[finding.criterion].weight *= 1.2

  # 완벽히 충족된 항목의 가중치 감소 (상대적 집중)
  for criterion in rubric:
    if criterion.score >= 0.95 in last_2_rounds:
      criterion.weight *= 0.8

  return normalize(rubric)  # 총합 1.0으로 정규화
```

> 주의: Rubric 진화는 Should-Have(R-12)이므로 PoC에서는 선택적 적용.

## 예방 팁

1. **Generator 프롬프트에 다양성 요구 포함**: "이전 라운드와 다른 접근 방식을 시도하라"
2. **Discriminator에 신규 발견 인센티브**: "이전에 지적하지 않은 새로운 문제를 찾아라"
3. **Context Window 관리**: 최신 2라운드만 전달하여 이전 패턴에 과도하게 영향받지 않도록
