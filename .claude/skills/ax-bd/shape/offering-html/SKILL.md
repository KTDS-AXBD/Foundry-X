---
name: offering-html
domain: ax-bd
stage: shape
version: "1.0"
description: "AX BD팀 사업기획서(HTML) 생성 스킬 — 발굴 산출물 기반 18섹션 표준 목차, 디자인 토큰 기반 렌더링"
input_schema: DiscoveryPackage + OfferingConfig
output_schema: OfferingHTML
upstream: [ax-bd/discover/packaging]
downstream: [ax-bd/validate/gan-cross-review]
agent: ax-bd-offering-agent
triggers:
  - 사업기획서
  - offering
  - 형상화 HTML
  - business proposal
  - offering html
evolution:
  track: DERIVED
  registry_id: null
---

# Offering HTML — AX BD 사업기획서 생성 스킬

AX BD팀이 발굴한 사업 아이템을 KT 연계 AX 사업기획서(HTML)로 형상화하는 스킬.
KT 연계 AX 사업개발 체계의 **3. 형상화** 단계를 자동화한다.

## When

- 발굴 단계(2-0~2-8) 산출물이 **2-8 Packaging** 까지 완료된 후
- 사용자가 "사업기획서 만들어줘" 또는 "offering 생성" 요청 시
- OfferingConfig.format = "html" 인 경우

## How (8단계 생성 프로세스)

```
[1] 아이템 확인
    └── 발굴 단계(2-0~2-8) 산출물 확인
    └── 어떤 단계까지 완료되었는지 파악
        ↓
[2] 목차 확정
    └── 18섹션 표준 목차에서 필수/선택 결정
    └── 선택 섹션(02-4, 02-5) 포함 여부 판단:
        - 기존 고객: 02-4 포함 (레버리지 자산)
        - 신규 고객: 02-4 → "고객 접근 전략"으로 대체
        - 신규 시장: 02-5 → "시장 진입 장벽 분석"으로 대체
        ↓
[3] 핵심 정보 수집
    └── DiscoveryPackage에서 섹션별 데이터 매핑
    └── 부족한 정보는 사용자에게 AskUserQuestion
        ↓
[4] 초안 생성 (v0.1)
    └── base.html + 17종 컴포넌트 조합
    └── design-tokens.md 기반 CSS variable 적용
    └── OfferingConfig.purpose에 따라 톤 결정:
        - report:   경영 언어, exec-summary 강조
        - proposal: 기술 상세, 솔루션 강조
        - review:   리스크 중심, no-go 기준 강조
        ↓
[5] 피드백 반영
    └── 섹션별 수정 요청 반영 → 버전 업 (v0.2~v0.4)
        ↓
[6] 교차검증 (자동)
    └── §04-5 사업성 교차검증 섹션 자동 구성
    └── 7개 표준 질문 기반 추진론/반대론/판정
    └── ogd-orchestrator → GAN 교차검증 호출
    └── six-hats-moderator → 6색 모자 토론 호출
    └── expert-ta~qa → 전문가 5인 리뷰 호출
        ↓
[7] 보고용 마무리 (v0.5+)
    └── 본부장/대표 보고 수준 품질 확인
    └── 경영 언어 원칙 최종 점검
        ↓
[8] 최종 확정 (v1.0)
    └── 보고 대상·일정 확인 후 최종본
```

## 표준 목차 (18섹션)

| # | 섹션 | 핵심 질문 | 필수 |
|---|------|---------|------|
| 0 | Hero | 사업의 한줄 요약 | ● |
| 0.5 | Executive Summary | 3분 Go/No-Go 판단 | ● |
| 01 | 추진 배경 및 목적 | 왜 이 사업을 하는가 (3축) | ● |
| 02 | 사업기회 점검 | — | ● |
| 02-1 | 왜 이 문제/영역 | 시장·기술 트렌드 | ● |
| 02-2 | 왜 이 기술/접근법 | 차별점 | ● |
| 02-3 | 왜 이 고객/도메인 | 고객 선정 근거 | ● |
| 02-4 | 기존 사업 현황 | 레버리지 자산 | ○ |
| 02-5 | Gap 분석 | 현재 vs 목표 | ○ |
| 02-6 | 글로벌·국내 동향 | 경쟁사, 벤치마크 | ● |
| 03-1 | 솔루션 개요 | Before/After | ● |
| 03-2 | 시나리오/Use Case | PoC + 본사업 | ● |
| 03-3 | 사업화 로드맵 | 단기→중기→장기 | ● |
| 04-1 | 데이터 확보 방식 | 계층별 전략 | ● |
| 04-2 | 시장 분석 및 경쟁 환경 | TAM/SAM/SOM | ● |
| 04-3 | 사업화 방향 및 매출 계획 | 3개년 시나리오 | ● |
| 04-4 | 추진 체계 및 투자 계획 | 조직·비용 | ● |
| 04-5 | 사업성 교차검증 | GAN 추진론/반대론 | ● |
| 04-6 | 기대효과 | 경영 언어 | ● |
| 05 | KT 연계 GTM 전략(안) | KT 조직개편 반영 | ● |

> ● = 필수, ○ = 선택

## 작성 원칙

### 경영 언어
- "~할 수 있다" → "~를 제안 예정", "~를 추진"
- 금액에 반드시 "약" 표기
- "최초", "첫" 표현 금지 → "선도적 사례", "초기 시장"
- 볼드는 핵심 키워드에만 (1불릿당 2~3개)

### KT 연계
- KT 연계 없는 사업은 이 포맷의 대상이 아님
- KT와의 현재 상태를 솔직하게 기술
- 단계적: kt ds 주도 → KT 사전 협의 → KT 공동 제안

### 고객 유형별 톤
- 분석·보고 기관: "분석 근거 제공 + 대응 옵션 비교"
- 의사결정 주체: "추천안 제시" 가능
- B2C 서비스: 시나리오 대신 "페르소나 기반 Use Case"

## Output Format

### 파일명
```
AX Discovery_사업기획서_{고객명}_v{버전}_{YYMMDD}.html
```

### 버전 관리
| 버전 | 의미 |
|------|------|
| v0.1 | 초안 (목차 + 핵심 내용) |
| v0.2~0.4 | 피드백 반영 수정 |
| v0.5+ | 본부장/대표 보고용 |
| v1.0 | 최종 확정본 |

## 디자인 시스템

- 토큰 정의: [design-tokens.md](design-tokens.md)
- 기반 템플릿: [templates/base.html](templates/base.html)
- 컴포넌트: [templates/components/](templates/components/) (17종)
- 구현 예시: [examples/KOAMI_v0.5.html](examples/KOAMI_v0.5.html)

## 교차검증 체크리스트

- [ ] Executive Summary가 경영 언어로 작성되었는가
- [ ] 추진배경 3축이 모두 채워졌는가 (특히 KT 적합성)
- [ ] 데이터 확보 방안이 구체적인가 (계층별, PoC/본사업 구분)
- [ ] TAM/SAM/SOM 추정 근거가 명시되었는가
- [ ] 교차검증이 냉철한가 (No-Go도 가능한 수준)
- [ ] KT 연계 GTM이 현실적인가
- [ ] 로드맵에 장기 방향이 있는가
- [ ] 금액에 "약" 표기가 되었는가
- [ ] "최초", "첫" 표현이 없는가
- [ ] 시나리오 톤이 고객 유형에 맞는가

## Examples

실제 구현 예시: [examples/KOAMI_v0.5.html](examples/KOAMI_v0.5.html)
- KOAMI Ontology 기반 산업 공급망 인과 예측 엔진
- 18섹션 전체 구현 + 17종 컴포넌트 활용
