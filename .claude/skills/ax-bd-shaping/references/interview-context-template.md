# Phase B -- 인터뷰 컨텍스트 템플릿

> Phase A 갭 분석 결과를 기반으로 `/ax:req-interview` 스킬에 주입하는 컨텍스트

## 템플릿

```markdown
# 인터뷰 컨텍스트 (형상화 Phase B 자동 생성)

## 배경
2단계 발굴 산출물의 형상화를 위해, 갭 분석에서 발견된 누락/미흡 항목을 보강하는 인터뷰입니다.

## 산출물 요약
{Phase A에서 추출한 산출물 1줄 요약}

## 현재 상태
- 필수 충족률: {rate}% ({fulfilled}/7)
- 게이트 판정: {PASS/CONDITIONAL}
- 보강 필요 항목 수: {count}개

## 보강 필요 항목
{갭 분석에서 absent 또는 partial인 항목 목록}

### 자동 생성 질문 (갭 기반)
{각 누락 항목에 대해 아래 매핑 테이블 기반으로 질문 생성}

### 표준 질문 (형상화 공통)
- 기술 아키텍처의 핵심 제약사항은 무엇인가요?
- 성공 기준(KPI)을 정량적으로 정의해주세요.
- 주요 리스크 3가지와 대응 방안은?
- 개발 일정 및 마일스톤 계획이 있나요?
- 1차 타겟 고객(Beachhead segment)은 누구인가요?
```

## 갭 -> 질문 매핑

| 누락 항목 | 생성 질문 |
|-----------|-----------|
| 타겟 시장 + TAM/SAM/SOM | "이 사업의 타겟 시장은 어디인가요? 시장 규모(TAM/SAM/SOM)를 알고 계신다면 공유해주세요." |
| 경쟁사 분석 | "이 분야의 주요 경쟁사 3사를 알려주세요. 우리의 차별화 포인트는 무엇인가요?" |
| 페르소나 | "이 제품/서비스의 핵심 사용자는 누구인가요? 그들의 역할, 목표, 어려움을 설명해주세요." |
| Pain Point + JTBD | "고객이 현재 겪고 있는 가장 큰 어려움은 무엇인가요? 어떤 일(Job)을 해결하고 싶어하나요?" |
| Value Proposition | "고객에게 제공하는 핵심 가치는 무엇인가요? 기존 솔루션 대비 어떤 점이 다른가요?" |
| BMC 캔버스 | "비즈니스 모델의 핵심 요소를 설명해주세요: 핵심 파트너, 핵심 자원, 채널, 고객 관계, 수익원." |
| 핵심 기술 요소 | "이 사업에 필요한 핵심 기술은 무엇인가요? 기술 스택을 구체적으로 설명해주세요." |
| 기술 실현가능성 | "비슷한 기술을 활용한 PoC나 사례가 있나요? 기술적 리스크는 무엇인가요?" |
| 수익 모델 | "어떤 과금 방식을 고려하고 있나요? 예상 단가와 고객 수는?" |
| 리스크 식별 | "이 사업의 주요 리스크(기술/시장/규제/조직) 3가지 이상을 알려주세요." |

## HITL vs Auto 모드

| 모드 | 동작 |
|------|------|
| `hitl` (기본) | AskUserQuestion 도구로 사용자에게 직접 인터뷰. 각 질문을 순차적으로 묻고 응답을 수집. |
| `auto` | AI가 산출물 내용을 기반으로 사업 아이디어 제안자 역할로 응답 생성. 산출물에서 추론 가능한 답변은 자동 채우고, 추론 불가능한 항목은 Open Question으로 분류. |

## 인터뷰 결과 형식

Phase B 결과는 `_workspace/shaping/{run-id}/phase-b-interview.md`에 저장:

```yaml
---
run_id: "{run-id}"
mode: "hitl | auto"
source: "{source_path}"
interviewed_at: "{timestamp}"
---
```

```markdown
# Phase B -- 요구사항 인터뷰 결과

## 사업 요구사항 (Business Requirements)
- BR-001: {description} [priority: Must/Should/Could] [source: 인터뷰/갭추론]
- BR-002: ...

## 기술 제약사항 (Technical Constraints)
- TC-001: {description} [impact: High/Medium/Low]
- TC-002: ...

## 성공 기준 (Success Criteria)
- SC-001: {metric} -> target: {target}
- SC-002: ...

## 미해결 질문 (Open Questions)
- OQ-001: {question} -> assumption: "{Generator가 채울 가정}"
- OQ-002: ...
```
