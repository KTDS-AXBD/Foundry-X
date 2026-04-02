# Phase A — 입력 점검 체크리스트 (v1.0)

> 2단계 발굴 산출물의 형상화 준비 상태를 평가하는 10항목 체크리스트

## 체크리스트

| # | 카테고리 | 항목 | 필수/선택 | 평가 키워드 |
|---|----------|------|-----------|------------|
| 1 | 시장 | 타겟 시장 정의 + TAM/SAM/SOM | 필수 | TAM, SAM, SOM, 시장 규모, market size, addressable |
| 2 | 시장 | 경쟁사 분석 (3사 이상) | 필수 | 경쟁사, competitor, SWOT, 비교, comparison, 차별화, differentiation |
| 3 | 고객 | 페르소나 정의 (1개 이상) | 필수 | 페르소나, persona, 타겟 고객, target customer, user profile |
| 4 | 고객 | Pain Point + Jobs-to-be-Done | 필수 | pain point, JTBD, jobs to be done, 고충, 니즈, needs |
| 5 | 가치 | Value Proposition 명시 | 필수 | value proposition, 가치 제안, 핵심 가치, unique value |
| 6 | 가치 | BMC 캔버스 (9블록 완성) | 필수 | BMC, business model canvas, 비즈니스 모델, 9블록 |
| 7 | 기술 | 핵심 기술 요소 식별 | 필수 | 기술 스택, tech stack, 아키텍처, architecture, 핵심 기술 |
| 8 | 기술 | 기술 실현가능성 초기 판단 | 선택 | PoC, feasibility, 실현가능성, 기술 리스크, technical risk |
| 9 | 수익 | 수익 모델 초안 | 선택 | 수익 모델, revenue model, 과금, pricing, 매출 |
| 10 | 리스크 | 주요 리스크 식별 (3개 이상) | 선택 | 리스크, risk, 위험, 장애물, barrier, 규제, regulation |

## 평가 로직

각 항목에 대해:

1. **산출물 탐색**: 섹션 제목 + 평가 키워드를 기반으로 관련 내용을 찾는다.
2. **존재 판정**:
   - `present`: 해당 내용이 전용 섹션 또는 명확한 단락으로 존재
   - `partial`: 키워드가 산재하지만 체계적으로 정리되지 않음
   - `absent`: 관련 내용이 전혀 없거나 매우 피상적
3. **품질 점수** (present/partial일 때만):
   - `1.0`: 완전하고 근거가 명확 (출처/수치/분석 포함)
   - `0.7`: 존재하나 일부 불완전 (출처 미비 또는 분석 부족)
   - `0.4`: 피상적으로만 언급 (키워드 수준, 깊이 없음)
   - `0.0`: 전혀 없음 (absent일 때)

## 게이트 로직

```
필수 충족률 계산:
  fulfilled = count(필수 항목 where 상태 != absent AND 점수 >= 0.4)
  rate = fulfilled / 7  (필수 항목 7개)

판정:
  rate >= 0.80 (6/7 이상) -> PASS: Phase B 진행
  0.50 <= rate < 0.80 (4~5/7) -> CONDITIONAL: Phase B에서 보강 필수, 경고 출력
  rate < 0.50 (3/7 이하) -> FAIL: 반려 (2단계로 돌려보내기)
```

## 갭 처리 전략

| 상태 | 필수/선택 | 처리 |
|------|-----------|------|
| absent | 필수 | Phase B 인터뷰에서 해당 항목 보강 질문 자동 추가 |
| partial | 필수 | Phase B 인터뷰에서 심화 질문 추가 + Phase C Generator가 보강 |
| absent | 선택 | Phase C Generator가 유사 사례 기반 자동 생성 |
| partial | 선택 | Phase C Generator가 보강 (인터뷰 불필요) |
| present (점수 < 0.7) | 필수 | Phase C Generator가 품질 개선 |
| present (점수 >= 0.7) | 모두 | 통과 -- 추가 조치 불필요 |

## 보고서 형식

Phase A 결과는 `_workspace/shaping/{run-id}/phase-a-gap-report.md`에 저장:

```markdown
# Phase A -- 입력 점검 & 갭 분석 보고서

## 산출물 정보
- 소스: {source_path}
- 점검일: {timestamp}
- Run ID: {run-id}

## 체크리스트 결과

| # | 카테고리 | 항목 | 필수 | 상태 | 점수 | 비고 |
|---|----------|------|------|------|------|------|
| 1 | 시장 | 타겟 시장 + TAM/SAM/SOM | 필수 | present/partial/absent | 0.8 | ... |
| ... |

## 충족률
- 필수 항목 (7개): {N}/7 충족 ({P}%)
- 선택 항목 (3개): {N}/3 충족
- 종합: {PASS/CONDITIONAL/FAIL} -- {message}

## 갭 처리 전략
| # | 누락 항목 | 처리 | 상세 |
|---|-----------|------|------|
| 1 | {항목} | Phase B 인터뷰 / Phase C Generator | {구체적 조치} |

## 게이트 판정
- 필수 충족률: {P}% -> {PASS/CONDITIONAL/FAIL}
- Phase B 진행: {Y/N}
- 보강 필요 항목: {목록}
```
