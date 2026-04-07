---
name: offering-html
domain: ax-bd
stage: shape
version: "2.1"
description: "AX BD팀 사업기획서(HTML) 생성 스킬 v2.1 — 20섹션 목차 + 발굴 산출물 자동 매핑 + 경영 언어 원칙 내장 + GAN 교차검증 자동화"
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
changelog:
  - version: "2.1"
    date: "2026-04-07"
    sprint: 199
    changes:
      - "F416: section-mapping.md 생성 — 발굴 산출물(2-0~2-8)→20섹션 매핑 테이블 + 역매핑 + 자동 탐색 절차"
      - "F417: writing-rules.md 생성 — 경영 언어 10항목 체크리스트 + KT 연계 3축 + 고객 유형별 톤 3종 + 최종 점검 자동화"
      - "F416: SKILL.md Step 1에 산출물 자동 탐색 키워드 패턴 추가"
      - "F416: SKILL.md Step 3에 정방향/역방향 매핑 + 부족 정보 처리 로직 추가"
      - "F417: SKILL.md Step 4에 경영 언어 10항목 + 고객 톤 자동 적용 로직 추가"
      - "F417: SKILL.md Step 7에 10항목 전수 검토 자동 검색 패턴 추가"
  - version: "2.0"
    date: "2026-04-07"
    sprint: 198
    changes:
      - "F414: 가이드 §3 기준 20섹션 목차로 전면 재구성 (18섹션 → Why/What/How/Proof/Next 5그룹)"
      - "F414: Exec Summary 표준 불릿 풀 6종 추가"
      - "F414: 01-1 추진배경 3축(수익성/KT적합성/실행력) 필수 구조 명시"
      - "F414: 선택 섹션(01-5, 01-6) 고객 유형별 대체 가이드 추가"
      - "F415: 신규 컴포넌트 5종 추가 (exec-summary, three-axis, gan-verdict, tam-card, compare-table)"
      - "F415: design-tokens.md v2 — 가이드 §5 정합성 보정"
  - version: "1.0"
    date: "2026-02-01"
    sprint: 165
    changes: ["최초 작성 — F365"]
---

# Offering HTML v2 — AX BD 사업기획서 생성 스킬

AX BD팀이 발굴한 사업 아이템을 KT 연계 AX 사업기획서(HTML)로 형상화하는 스킬.
KT 연계 AX 사업개발 체계의 **3. 형상화** 단계를 자동화한다.

## When

- 발굴 단계(2-0~2-8) 산출물이 완료된 후 (2-8 Packaging 완료 권장)
- 사용자가 "사업기획서 만들어줘" 또는 "offering 생성" 요청 시
- OfferingConfig.format = "html" 인 경우

> **선결 체크:** KT 연계가 없는 사업은 이 포맷의 대상이 아니다.
> KT 연계를 먼저 확인하고, 없으면 사용자에게 경고 후 중단.

## How (8단계 생성 프로세스)

```
[1] 아이템 확인 — section-mapping.md §2 "자동 매핑 절차" 참조
    ├── 발굴 단계(2-0~2-8) 산출물 파일 자동 탐색
    │   └── 탐색 키워드: *2-0*, *아이템*구체화*, *레퍼런스*, *TAM* 등
    │   └── section-mapping.md §2 "Step 1: 산출물 탐색" 패턴 사용
    ├── 어떤 단계까지 완료되었는지 파악 → 누락 단계 식별
    └── KT 연계 여부 선제 확인 (writing-rules.md §2.1 대전제)
        ↓
[2] 목차 확정
    ├── 20섹션 표준 목차에서 선택 섹션(01-5, 01-6) 포함 여부 결정
    ├── 고객 유형 확인 → 시나리오 톤 결정
    │   └── writing-rules.md §3 "고객 유형별 톤 자동 조정" 참조
    │   └── AskUserQuestion: "고객 유형이 기존/신규/B2C 중 어디인가요?"
    └── 선택 섹션 대체 가이드 적용 (아래 테이블 참조)
        ↓
[3] 핵심 정보 수집 — section-mapping.md §2 "Step 3: 섹션별 데이터 매핑" 참조
    ├── 발굴 산출물 → 섹션 자동 매핑 (정방향 매핑)
    │   └── 2-0→Hero/Exec/01-4, 2-1→01-8, 2-2→01-2/01-3/01-7, ...
    ├── 부족 정보 처리 (section-mapping.md §3):
    │   └── 산출물 없음 → AskUserQuestion으로 핵심만 보충
    │   └── 산출물 부족 → 있는 내용 + AskUserQuestion 보충
    └── 우선순위: 산출물 자동 매핑 > AskUserQuestion > 스킬 추론
        ↓
[4] 초안 생성 (v0.1) — writing-rules.md §1 체크리스트 자동 적용
    ├── base.html + 12종 컴포넌트 조합
    ├── design-tokens.md 기반 CSS variable 적용
    ├── writing-rules.md §1 경영 언어 10항목 자동 적용:
    │   └── 가능형 금지, 최초 금지, 금액 약 표기, 과대 표현 금지, 볼드 제한
    │   └── 기술 용어 최소화, KT 상태 솔직, TAM/수익 근거, URL 첨부
    ├── writing-rules.md §3 고객 유형별 톤 반영 (Step 2에서 결정된 톤)
    ├── KT 연계 3축 체크 (writing-rules.md §2.2):
    │   └── 01-1에 수익성/KT적합성/실행력 3축 모두 포함 확인
    │   └── 미충족 시 경고 메시지 + 보충 요청
    └── AX BD팀 표현 표준화 (writing-rules.md §4)
        ↓
[5] 피드백 반영 — writing-rules.md §7 참조
    ├── 피드백 → 섹션 자동 식별 → 수정
    ├── 고객 유형별 톤 유지하면서 수정
    ├── 수정된 부분에 <!-- CHANGED: {사유} --> 마커 삽입
    └── 수정 후 경영 언어 10항목 재검증
        ↓
[6] 교차검증 (자동)
    ├── cross-validation.md 참조 — 표준 질문 풀 7개 적용
    ├── 05-4 섹션에 추진론/반대론/판정 배지 자동 생성
    └── ogd-orchestrator 호출 (냉철한 톤 — "경영진 안심"이 아니라 "정확한 판단")
        ↓
[7] 최종 점검 (v0.5+) — writing-rules.md §6 "최종 점검 체크리스트" 실행
    ├── 경영 언어 10항목 전수 검토 (자동 검색 패턴):
    │   └── [1] "~할 수 있다" 검색 → [2] "최초" 검색 → [3] 금액 약 확인
    │   └── [4] 과대 표현 → [5] 볼드 과다 → [6] 기술 용어 → [7] KT 상태
    │   └── [8] TAM 근거 → [9] 수익 근거 → [10] 출처 URL
    ├── 위반 항목 표시 + 수정 제안
    └── 본부장/대표 보고 수준 확인
        ↓
[8] 최종 확정 (v1.0)
    └── 보고 대상·일정 확인 후 최종본
    └── 파일명: 사업기획서_{사업명}_v1.0_{YYMMDD}.html
```

## 표준 목차 — 20섹션 (가이드 §3 기준, Why→What→How→Proof→Next)

| # | 섹션 | 핵심 질문 | 필수 | 컴포넌트 |
|---|------|---------|------|----------|
| 0 | **Hero** | 사업의 한줄 요약 | ● | hero.html |
| 0.5 | **Executive Summary** | 3분 Go/No-Go 판단 | ● | exec-summary.html |
| **01** | **문제 정의** | Why | ● | section-header.html |
| 01-1 | 추진 배경 및 목적 | 왜 이 사업을 해야 하는가? (3축) | ● | three-axis.html + cta.html |
| 01-2 | 왜 이 '문제/영역'인가 | 시장·기술 트렌드 | ● | trend-grid.html |
| 01-3 | 왜 이 '기술/접근법'인가 | 기존 방식 대비 차별점 | ● | compare-grid.html |
| 01-4 | 왜 이 '고객/도메인'인가 | 고객 선정 근거 | ● | compare-table.html |
| 01-5 | 기존 사업/관계 현황 | 레버리지 자산은? | ○ | ba-grid.html |
| 01-6 | 현황 Gap 분석 | 현재 vs 목표의 차이 | ○ | compare-grid.html |
| 01-7 | 시장 분석 | TAM/SAM/SOM + 경쟁 비대칭 | ● | tam-card.html |
| 01-8 | 글로벌·국내 동향 | 경쟁사, 벤치마크, 트렌드 | ● | trend-grid.html |
| **02** | **제안 방향** | What | ● | section-header.html |
| 02-1 | 사업 개요 | 사업 한줄 정의 + 핵심 가치 3가지 | ● | kpi-card.html |
| 02-2 | To-Be 전환 | Before/After 시각화 | ● | ba-grid.html |
| 02-3 | 서비스 구성안 | 전체 서비스 아키텍처/구성도 | ● | flow-diagram.html |
| **03** | **실행 방안** | How | ● | section-header.html |
| 03-1 | 유저 시나리오 / Use Case | 고객이 어떻게 달라지는가? | ● | scenario-card.html |
| 03-2 | 사업 구도 | KT DS + 고객 + 파트너 역할 분담 | ● | silo-grid.html |
| 03-3 | 사업화 로드맵 | 단기(PoC) → 중기 → 장기 | ● | roadmap-track.html |
| **04** | **경쟁력 및 기대효과** | Proof | ● | section-header.html |
| 04-1 | 차별화 요소 | 경쟁사 대비 KT DS 핵심 차별점 3가지 | ● | option-card.html |
| 04-2 | 그룹 시너지 | KT 협력으로 얻는 시너지 2~3가지 | ● | ba-grid.html |
| 04-3 | 기대 효과 | 정량·정성 효과 + ROI 시뮬레이션 | ● | impact-list.html |
| **05** | **추진 계획** | Next | ● | section-header.html |
| 05-1 | 데이터 확보 방식 | 계층별 전략 (PoC/본사업 구분) | ● | step-block.html |
| 05-2 | 사업화 방향 및 매출 계획 | 단계별 + 3개년 시나리오 | ● | roadmap-track.html |
| 05-3 | 투자 계획 | 항목별 비용 산출 (PoC 기준) | ● | compare-table.html |
| 05-4 | 사업성 교차검증 | GAN 추진론/반대론/판정 | ● | gan-verdict.html |

> ● = 필수, ○ = 선택 (사업 특성에 따라 포함 여부 결정)

## 선택 섹션 대체 가이드 (Step 2에서 고객 유형 확인 후 적용)

| 고객 상황 | 01-5 처리 | 01-6 처리 |
|-----------|-----------|-----------|
| 기존 고객 후속 수주 | **포함** (레버리지 자산 명시) | **포함** (현재 vs 목표) |
| 신규 고객 개척 | "고객 접근 전략"으로 **대체** | 생략 가능 |
| 신규 시장 진입 | 생략 | "시장 진입 장벽 분석"으로 **대체** |

## Executive Summary 표준 불릿 풀 (§0.5)

**구조:** 경영진이 3분 안에 Go/No-Go 판단 가능해야 함. 5~6개 불릿 선택·조합.

| 불릿 역할 | 핵심 내용 | 포함 기준 |
|----------|----------|----------|
| **What** | 기존 고객 후속 수주 / 신규 고객 확보 | 항상 |
| **Why Now** | 왜 지금인가 (긴급성, 경쟁 압박, 데드라인) | 경쟁 압박·데드라인 있을 때 |
| **How much** | 수익성 — 예상 매출/수익 기여 | 항상 |
| **Why KT** | KT 적합성 — KT 전략 정합성 | 항상 |
| **Why Us** | 비대칭 우위 — 경쟁사 대비 KT DS 강점 | 경쟁 구도 있을 때 |
| **Scale** | 반복 가능한 사업 모델 — 확장 방향 | 항상 |

**작성 원칙:** 기술 용어 금지. "~할 수 있다" → "~를 추진". 볼드는 키워드에만 (1불릿당 2~3개).

## 추진 배경 3축 구조 (§01-1 필수)

**항상 3축 구조.** 라벨은 사업 특성에 따라 조정 가능:

```
┌──────────────────┬──────────────────┬──────────────────┐
│   축1: 수익성     │  축2: KT 적합성   │   축3: 실행력     │
│                  │                  │                  │
│ 이 사업이 매출·  │ KT 전략과 어떻게  │ 왜 우리(kt ds)가 │
│ 수익에 어떻게    │ 연결되는가?       │ 할 수 있는가?    │
│ 기여하는가?      │                  │                  │
└──────────────────┴──────────────────┴──────────────────┘
```

하단: "추진 목적" CTA 블랙 박스 — 1문장 + 3개 키워드 카드

> **핵심 원칙:** KT 연계가 없는 사업은 이 포맷으로 올리지 않는다.
> 3축 중 KT 적합성이 누락되면 경고 메시지 출력 후 보충 요청.

## KT 연계 원칙 체크 (Step 4에서 자동 적용)

```
[KT 연계 체크]
├── 01-1 추진배경 3축 검사:
│   ├── 축1 수익성: 매출/수익 기여 언급 있는가?
│   ├── 축2 KT 적합성: KT 전략/시너지 언급 있는가?
│   └── 축3 실행력: kt ds 기술/자산 레버리지 언급 있는가?
├── 미충족 축이 있으면:
│   └── ⚠️ "추진배경 3축 중 {축명}이 누락되었어요. 보충하시겠어요?"
└── KT 연계가 전혀 없으면:
    └── ⚠️ "KT 연계가 없는 사업은 이 기획서 포맷의 대상이 아니에요."
```

## 작성 원칙

> 상세: [writing-rules.md](writing-rules.md) (Sprint 199 F417에서 생성)

### 경영 언어 원칙 (10항목)

| # | 규칙 | ❌ 금지 | ✅ 사용 |
|---|------|---------|--------|
| 1 | 가능형 금지 | "~할 수 있다", "~가능하다" | "~를 추진", "~를 제안 예정" |
| 2 | 최초 표현 금지 | "최초", "첫" | "선도적 사례", "초기 시장" |
| 3 | 금액 약 표기 | "5억", "3억" | "약 5억", "약 3억" |
| 4 | 과대 표현 금지 | 검증 불가 주장 | 삭제 또는 근거 첨부 |
| 5 | 볼드 제한 | 문장 전체 볼드 | 키워드만 (1불릿 2~3개) |
| 6 | 기술 용어 최소화 | LLM, RAG, Embedding | 비교표로 설명 |
| 7 | KT 현재 상태 솔직 기술 | 협약 없는데 "협의 중" | "협약 없음" 명시 |
| 8 | TAM 과대 추정 금지 | 근거 없는 수치 | "약 {수치}" + 산출 근거 |
| 9 | 수익 추정 근거 표기 | "연 100억 예상" | "약 100억 (산출 근거: ...)" |
| 10 | URL 링크 | 근거 없는 주장 | 출처 URL 첨부 |

### 고객 유형별 시나리오 톤 (§03-1)

| 고객 유형 | 시나리오 톤 | AskUserQuestion 시점 |
|-----------|-----------|---------------------|
| 분석·보고 기관 (정책 지원) | "분석 근거 제공 + 대응 옵션 비교" | Step 2 목차 확정 시 |
| 의사결정 주체 (기업, 금융) | "추천안 제시" | Step 2 |
| B2C 서비스 대상 | "페르소나 기반 Use Case" | Step 2 |

## Output Format

### 파일명
```
사업기획서_{사업명}_v{버전}_{YYMMDD}.html
```
특정 고객 대상일 경우 사업명을 고객명으로 대체:
- `사업기획서_중소가전IoT플랫폼_v0.5_260404.html`
- `사업기획서_KOTRA_v0.1_260415.html`

### 버전 관리
| 버전 | 의미 |
|------|------|
| v0.1 | 초안 (목차 + 핵심 내용) |
| v0.2~0.4 | 피드백 반영 수정 (`<!-- CHANGED -->` 마커 포함) |
| v0.5+ | 본부장/대표 보고용 |
| v1.0 | 최종 확정본 |

## 디자인 시스템

- 토큰 정의: [design-tokens.md](design-tokens.md) (v2 — 가이드 §5 정합)
- 기반 템플릿: [templates/base.html](templates/base.html)
- 컴포넌트 (12종):

| 컴포넌트 | 파일 | 상태 | 주요 섹션 |
|---------|------|------|----------|
| Hero | hero.html | 기존 | §0 |
| Executive Summary | exec-summary.html | **신규** | §0.5 |
| 3축 카드 그리드 | three-axis.html | **신규** | §01-1 |
| TAM/SAM/SOM | tam-card.html | **신규** | §01-7 |
| Before/After | ba-grid.html | 기존 | §01-6, §02-2, §04-2 |
| 비교 그리드 | compare-grid.html | 기존 | §01-3, §01-6 |
| 비교 테이블 | compare-table.html | **신규** | §01-4, §05-3 |
| 트렌드 그리드 | trend-grid.html | 기존 | §01-2, §01-8 |
| 플로우 다이어그램 | flow-diagram.html | 기존 | §02-3 |
| 로드맵 | roadmap-track.html | 기존 | §03-3, §05-2 |
| 임팩트 리스트 | impact-list.html | 기존 | §04-3 |
| GAN 교차검증 판정 | gan-verdict.html | **신규** | §05-4 |

- 구현 예시: [examples/KOAMI_v0.5.html](examples/KOAMI_v0.5.html)

> **참조 문서**:
> - [section-mapping.md](section-mapping.md) — 발굴 산출물(2-0~2-8) → 섹션 매핑 (Sprint 199 F416 ✅)
> - [writing-rules.md](writing-rules.md) — 경영 언어 + KT 연계 + 고객 톤 규칙 상세 (Sprint 199 F417 ✅)
> - [cross-validation.md](cross-validation.md) — GAN 교차검증 질문 풀 + 판정 로직 (Sprint 200 F419 예정)

## 교차검증 체크리스트 (Step 7 — 최종 점검)

- [ ] Executive Summary가 경영 언어로 작성되었는가 (불릿 풀 5~6개 선택)
- [ ] 추진배경 3축이 모두 채워졌는가 (수익성 / KT 적합성 / 실행력)
- [ ] KT 연계 상태가 솔직하게 기술되었는가 (협약 없으면 "없음" 명시)
- [ ] 데이터 확보 방안이 구체적인가 (계층별, PoC/본사업 구분)
- [ ] TAM/SAM/SOM 추정 근거가 명시되었는가
- [ ] 교차검증이 냉철한가 (No-Go도 가능한 수준)
- [ ] 로드맵에 장기 방향이 있는가 (단기 매출이 적어도 전략 자산 명시)
- [ ] 금액에 "약" 표기가 되었는가
- [ ] "최초", "첫" 표현이 없는가
- [ ] 시나리오 톤이 고객 유형에 맞는가

## Examples

실제 구현 예시: [examples/KOAMI_v0.5.html](examples/KOAMI_v0.5.html)
- KOAMI Ontology 기반 산업 공급망 인과 예측 엔진
- 20섹션 구조 + 12종 컴포넌트 활용 (회귀 테스트용)
