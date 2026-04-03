# Six Thinking Hats Protocol — BD 형상화 Phase D

Edward de Bono의 Six Thinking Hats 방법론을 BD 형상화 교차 검토에 적용한 프로토콜.

## 1. 6색 모자 정의

| 모자 | 관점 | AI 페르소나 역할 | 평가 초점 |
|------|------|-------------------|-----------|
| White | 데이터/사실 | 데이터 분석가 | 시장 데이터, 수치 근거, 출처 신뢰성 |
| Red | 감정/직관 | 사용자 대변인 | 첫인상, 사용자 반응 예측, 채택 의지 |
| Black | 비판/리스크 | 리스크 관리자 | 실패 시나리오, 기술 부채, 규제 장벽 |
| Yellow | 낙관/가치 | 사업 옹호자 | 성장 가능성, 시장 기회, 경쟁 우위 |
| Green | 창의/대안 | 혁신 촉진자 | 대안 아키텍처, 피봇 가능성, 신규 접근 |
| Blue | 메타/프로세스 | 토론 진행자 | 논의 구조화, 합의안 도출, 의사결정 |

## 2. 라운드 프로토콜

### Round 1: 독립 의견 수집 (Fan-out)

- 단일 에이전트(six-hats-moderator)가 6개 모자 역할을 **순차적으로** 수행
- 각 모자는 Phase C 최종 PRD + 교차 검토 불일치 항목을 평가
- 모자별 출력:
  ```markdown
  ## [Hat Color] 관점
  ### 핵심 의견
  [1~3 문장 요약]
  ### 상세 분석
  [해당 관점의 근거와 분석]
  ### 판정: [accept | concern | reject]
  ```
- 순서: White → Red → Black → Yellow → Green → Blue
  - White 먼저: 사실 기반 토대 확보
  - Blue 마지막: 전체 의견 종합

### Round 2: 반론 교환

교차 반론 규칙:
- **Black(비판) ↔ Yellow(낙관)**: 리스크 vs 기회 논쟁
  - Black의 reject/concern에 대해 Yellow가 반론 + 근거
  - Yellow의 낙관에 대해 Black이 리스크 시나리오 제시
- **Red(감정) ↔ White(데이터)**: 직관 vs 데이터 근거 교환
  - Red의 감정적 우려에 대해 White가 데이터로 반박 또는 지지
- **Green(창의)**: 상충 의견에 대한 대안 제시
  - reject 항목에 대해 최소 1개 대안 아이디어
- **Blue(메타)**: 반론 정리 + 공통 지점 식별

반론 출력:
```markdown
## Round 2 반론
### Black ↔ Yellow
[반론 내용]
### Red ↔ White
[반론 내용]
### Green 대안
[대안 제시]
### Blue 정리
[공통 지점 + 남은 쟁점]
```

### Round 3: 합의안 도출 (Blue Hat 종합)

Blue Hat이 최종 합의안을 도출:

1. **합의 항목**: 5/6 이상 accept → 확정
2. **조건부 합의**: 4/6 accept + concern → 조건 명시 후 확정
3. **미합의 항목**: 3/6 이하 accept → 구체적 사유 + 권고사항
4. **Phase C 회귀 필요 여부 판정**

## 3. 수렴 기준

```
합의율 = count(accept) / 6

>= 5/6 (83%+) → PASS: Phase E 진행
4/6 (67%)     → CONDITIONAL PASS: 미합의 항목 조건부 진행 + Phase E에서 재검토
<= 3/6 (50%-) → FAIL: Phase C 회귀 (Six Hats 피드백 통합)
```

## 4. 출력 형식 템플릿

```markdown
# Phase D: Six Hats 토론 결과

## 1. 교차 검토 요약
[3관점 교차 검토 결과 요약 인용]

## 2. Round 1 — 독립 의견
### White Hat (데이터/사실)
- 핵심 의견: ...
- 판정: [accept/concern/reject]
### Red Hat (감정/직관)
...
### Black Hat (비판/리스크)
...
### Yellow Hat (낙관/가치)
...
### Green Hat (창의/대안)
...
### Blue Hat (메타/프로세스)
...

## 3. Round 2 — 반론 교환
### Black ↔ Yellow
...
### Red ↔ White
...
### Green 대안
...

## 4. Round 3 — 합의안
### 합의 항목 (5/6 이상 accept)
- [항목 목록]
### 조건부 합의 (4/6)
- [항목 + 조건]
### 미합의 항목 + 권고사항
- [항목 + 사유 + 권고]
### 판정
- 결과: [PASS | CONDITIONAL_PASS | FAIL]
- Accept 비율: [N/6]
- Phase C 회귀: [Yes/No]
- 회귀 시 피드백: [미합의 항목 요약 + 각 모자 핵심 의견]
```

## 5. Gotchas

- 6개 역할을 단일 에이전트가 순회하므로, 각 모자 전환 시 "이전 모자의 의견을 잊고" 독립적으로 평가해야 함
- Black Hat이 과도하게 부정적이면 Round 2에서 Yellow가 균형을 맞춤 — 이 구조가 핵심
- Round 3의 Blue Hat 종합은 **투표 집계가 아니라 논증 품질 기반** 판정
- CONDITIONAL_PASS는 Phase E에서 해당 항목을 추가 검증하는 조건부 진행
