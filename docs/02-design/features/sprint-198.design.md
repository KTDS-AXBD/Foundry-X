---
code: FX-DSGN-S198
title: Sprint 198 Design — Phase 22 M1-A (Offering Skill v2 표준화)
version: 1.0
status: Active
category: DESIGN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 198 Design Document

## Overview

- **Sprint**: 198
- **Phase**: Phase 22-A (표준화 + MVP)
- **Features**: F414 (표준 목차 엔진), F415 (디자인 시스템 v2)
- **Objective**: Offering Skill v2 기초 구조 완성 — 가이드 §3 기준 20섹션 표준 목차 + KT 연계 자동 검증 + 신규 컴포넌트 5종
- **Target Match Rate**: 90%+

---

## Architecture Overview

### System Context

```
발굴 단계 (2-0~2-8)
        ↓
    [Offering Skill v2]
    ├── F414: 표준 목차 엔진
    │   ├── 20섹션 목차 (가이드 §3)
    │   ├── KT 연계 3축 검증
    │   └── 8단계 생성 프로세스
    │
    ├── F415: 디자인 시스템 v2
    │   ├── design-tokens.md v2 (30개 토큰)
    │   └── 신규 컴포넌트 5종
    │
        ↓
    사업기획서 HTML (v0.1~v1.0)
        ↓
    [Next: F416 발굴 산출물 매핑]
```

---

## F414: 표준 목차 엔진 Design

### Requirements

#### 1. 20섹션 표준 목차 구조

**기준**: Phase 22 공식 가이드 (§3 - 표준 목차)

```
§0    Hero — 사업 한줄 요약
§0.5  Executive Summary — 3분 판단 요약
┌─────────────────────────────────┐
│ §01 문제 정의 (Why)              │
│  ├─ 01-1 추진배경 및 목적        │ ← 3축 필수
│  ├─ 01-2 시장·기술 트렌드        │
│  ├─ 01-3 차별점                  │
│  ├─ 01-4 고객 선정               │
│  ├─ 01-5 레버리지 자산 (선택)    │
│  ├─ 01-6 Gap 분석 (선택)         │
│  ├─ 01-7 TAM/SAM/SOM            │
│  └─ 01-8 동향 분석               │
│ §02 제안 방향 (What)             │
│  ├─ 02-1 사업 개요              │
│  ├─ 02-2 To-Be 전환             │
│  └─ 02-3 서비스 구성            │
│ §03 실행 방안 (How)              │
│  ├─ 03-1 유저 시나리오          │
│  ├─ 03-2 사업 구도              │
│  └─ 03-3 로드맵                 │
│ §04 경쟁력 (Proof)               │
│  ├─ 04-1 차별화 요소            │
│  ├─ 04-2 그룹 시너지            │
│  └─ 04-3 기대 효과              │
│ §05 추진 계획 (Next)             │
│  ├─ 05-1 데이터 확보            │
│  ├─ 05-2 사업화 방향            │
│  ├─ 05-3 투자 계획              │
│  └─ 05-4 교차검증 (GAN)         │
└─────────────────────────────────┘
```

**구현 형식**: SKILL.md §2 테이블 (20행 × 5열: #, 섹션, 핵심질문, 필수/선택, 컴포넌트)

#### 2. Why/What/How/Proof/Next 5그룹 구조

5개 그룹 간 논리적 흐름 명시:

| 그룹 | 섹션 | 목적 |
|------|------|------|
| Why | §01 (01-1~01-8) | 왜 이 사업을 해야 하는가? (시장+기술+고객+경쟁 근거) |
| What | §02 (02-1~02-3) | 무엇을 제안하는가? (사업 정의+To-Be+구성) |
| How | §03 (03-1~03-3) | 어떻게 실행하는가? (시나리오+역할+로드맵) |
| Proof | §04 (04-1~04-3) | 왜 우리가 할 수 있는가? (차별점+시너지+효과) |
| Next | §05 (05-1~05-4) | 다음 단계는? (데이터+사업화+투자+교차검증) |

#### 3. Exec Summary 표준 불릿 풀 (§0.5)

**목표**: 경영진이 3분 안에 Go/No-Go 판단 가능

**표준 6가지 불릿 역할**:

| 역할 | 핵심 내용 | 예시 |
|------|----------|------|
| **What** | 기존 고객 후속 vs 신규 고객 확보 | "OO 사업 후속 수주 가능성 검토" |
| **Why Now** | 긴급성, 경쟁 압박, 데드라인 | "2026 경쟁사 진입 가능성 높아, 선제 대응 필요" |
| **How much** | 수익성 — 예상 매출/수익 | "연 50억대 매출 기대 (초기) → 100억+ 확장" |
| **Why KT** | KT 전략 정합성 | "KT 신사업 5G IoT 전략과 100% 정합" |
| **Why Us** | KT DS 비대칭 우위 | "기존 고객사 관계+기술(AI 분석) 결합" |
| **Scale** | 반복 가능한 사업 모델 | "산업별 적용 확대 가능 (헬스케어→금융→제조)" |

**구현 형식**: design-tokens.md와 별도로, SKILL.md §135 표로 정의. 실제 불릿은 exec-summary.html 컴포넌트가 렌더링.

#### 4. 추진배경 3축 필수 구조 (§01-1)

항상 3축 구조. 라벨은 조정 가능:

```
┌──────────────────┬──────────────────┬──────────────────┐
│  축1: 수익성      │ 축2: KT 적합성    │ 축3: 실행력       │
│                  │                  │                  │
│ 이 사업이 매출·  │ KT 전략과 어떻게 │ 왜 우리(kt ds)가 │
│ 수익에 어떻게    │ 연결되는가?      │ 할 수 있는가?    │
│ 기여하는가?      │                  │                  │
└──────────────────┴──────────────────┴──────────────────┘
     ↓↓↓
   [CTA 블랙박스]
   "추진 목적: {1문장} + 3개 키워드"
```

**자동 검증** (Step 4): KT 연계 3축 검사
- 축1(수익성): 매출/수익 기여 언급 확인 ✅
- 축2(KT적합성): KT 전략/시너지 언급 확인 ✅
- 축3(실행력): KT DS 기술/자산 레버리지 언급 확인 ✅

미충족 시 경고 + 보충 요청.

#### 5. 선택 섹션 고객 유형별 분기 (01-5, 01-6)

| 고객 상황 | 01-5 처리 | 01-6 처리 |
|-----------|-----------|-----------|
| 기존 고객 후속 수주 | **포함** (레버리지 자산 명시) | **포함** (현재 vs 목표) |
| 신규 고객 개척 | "고객 접근 전략"으로 **대체** | 생략 가능 |
| 신규 시장 진입 | 생략 | "시장 진입 장벽 분석"으로 **대체** |

**구현 시점**: Step 2 (목차 확정)에서 AskUserQuestion으로 고객 유형 확인 → 자동 분기.

#### 6. 8단계 생성 프로세스

```
[1] 아이템 확인
    └── 발굴 단계(2-0~2-8) 산출물 확인
        ↓
[2] 목차 확정
    └── 20섹션 중 선택 섹션(01-5, 01-6) 포함 여부 결정
    └── 고객 유형 확인 (Step 2에서 분기)
        ↓
[3] 핵심 정보 수집
    └── section-mapping.md 기반 자동 매핑
    └── 부족한 정보 AskUserQuestion으로 보충
        ↓
[4] 초안 생성 (v0.1)
    └── base.html + 컴포넌트 조합
    └── design-tokens CSS variable 적용
    └── 경영 언어 원칙 자동 검사
    └── KT 연계 3축 검증 (미충족 시 경고)
        ↓
[5] 피드백 반영
    └── 섹션별 수정 → 버전 업
    └── <!-- CHANGED: {사유} --> 마커 삽입
        ↓
[6] 교차검증 (자동)
    └── cross-validation.md 표준 질문 풀 적용
    └── 05-4에 추진론/반대론/판정 생성
        ↓
[7] 최종 점검
    └── 경영 언어 체크리스트 10항목 검토
    └── 본부장/대표 보고 수준 확인
        ↓
[8] 최종 확정 (v1.0)
    └── 파일명: 사업기획서_{사업명}_v1.0_{YYMMDD}.html
```

#### 7. KT 연계 원칙 체크 (Step 4 자동 적용)

```
[KT 연계 체크]
├── 01-1 추진배경 3축 검사:
│   ├── 축1 수익성: 매출/수익 기여 언급 있는가?
│   ├── 축2 KT 적합성: KT 전략/시너지 언급 있는가?
│   └── 축3 실행력: kt ds 기술/자산 레버리지 언급 있는가?
├── 미충족 축이 있으면:
│   └── ⚠️ "추진배경 3축 중 {축명}이 누락되었어요. 보충하시겠어요?"
│       AskUserQuestion: [예] → 텍스트 입력 | [아니오] → 계속
└── KT 연계가 전혀 없으면:
    └── ⚠️ "KT 연계가 없는 사업은 이 기획서 포맷의 대상이 아니에요."
        중단.
```

---

### Implementation Details

**SKILL.md v2.0 파일 구조**:

```
SKILL.md
├── [Frontmatter] version: "2.0", sprint: 198, F414~F415
├── # Offering HTML v2 (제목)
├── ## When (사용 시점)
├── ## How (8단계 프로세스) ← Step 1~8 상세
├── ## 표준 목차 — 20섹션 (테이블)
├── ## 선택 섹션 대체 가이드 (테이블)
├── ## Executive Summary 표준 불릿 풀 (테이블 + 작성 원칙)
├── ## 추진 배경 3축 구조 (다이어그램 + 설명)
├── ## KT 연계 원칙 체크 (Step 4, 플로우 다이어그램)
├── ## 작성 원칙 (경영 언어 10항목 + 고객 유형별 톤)
├── ## Output Format (파일명 + 버전 관리)
├── ## 디자인 시스템 (토큰 + 컴포넌트 12종 테이블)
└── [Changelog] v1.0→v2.0 변경 항목 명시
```

---

## F415: 디자인 시스템 v2 Design

### Requirements

#### 1. Design Tokens v2 (30개 토큰)

**색상 토큰** (14개):
- 텍스트: primary(#111) / secondary(#666) / muted(#999) / subtle(#444)
- 배경: default(#fff) / alt(#f8f9fa) / subtle(#f0f0f0)
- 보더: default(#e5e5e5) / strong(#111) / muted(#ccc)
- 데이터: positive(#16a34a) / negative(#dc2626) / warning(#ea580c) / caution(#d97706)

**타이포그래피 토큰** (8개):
- hero (48px, weight 900)
- section (36px, weight 800)
- subsection (17px, weight 400)
- body (15px, weight 400)
- card-title (14px, weight 700)
- label (12px, weight 600, uppercase)
- footnote (12px, weight 400)
- kpi (32px, weight 900)

**레이아웃 토큰** (8개):
- maxWidth: 1200px
- sectionPadding: 120px 40px 80px
- cardRadius: 16px / cardRadiusSmall: 12px
- breakpoint: 900px
- navHeight: 56px
- cardPadding: 28px 24px / cardPaddingLarge: 36px

**컴포넌트 스페이싱** (5개):
- grid.gap: 20px / grid.gapLarge: 32px
- section.marginTop: 48px
- card.marginBottom: 32px
- label.marginBottom: 12px

**구현 형식**: design-tokens.md v2 (§1~§4, 30개 토큰 테이블)

#### 2. 가이드 §5 정합성 검증

**검증 항목**:
- base.html의 모든 CSS variable 정의가 design-tokens.md 토큰과 1:1 매칭
- 색상/크기/간격 값이 가이드 공식 정의와 일치

**결과 기록**: design-tokens.md v2 서두에 "검증 완료" 문구 추가

#### 3. 12종 컴포넌트 참조 테이블

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

#### 4. 신규 컴포넌트 5종 상세 설계

**exec-summary.html** (§0.5)
```html
목적: 경영진 3분 판단용
구조:
  - 섹션 레이블 + 제목 + 설명
  - 3열 그리드 (.exec-summary-grid)
  - 각 불릿 카드 (.exec-bullet)
    ├─ 역할 라벨 (.exec-bullet-role) — 11px, uppercase
    ├─ 본문 텍스트 (.exec-bullet-text) — 15px, line-height 1.6
    └─ 강조 키워드 (strong 태그)
  - 반응형: 900px 이하 1열로 변환
변수: {{bullets[]}} 루프 (role, text, bold[])
```

**three-axis.html** (§01-1)
```html
목적: 추진배경 3축 시각화
구조:
  - 3열 카드 그리드
  - 각 카드: 축 제목 + 설명 + 아이콘 (옵션)
  - 하단: CTA 블랙박스 (배경 검은색, 텍스트 흰색)
    - 추진 목적 1문장 + 3개 키워드 카드
변수: {{axes[]}} with title, description, icon, keyword[]
```

**gan-verdict.html** (§05-4)
```html
목적: GAN 추진론/반대론/판정 배지
구조:
  - 3열 카드 그리드
  - 좌측: 추진론 (배경 green/positive)
  - 중앙: 반대론 (배경 red/negative)
  - 우측: 판정 배지 (배경 amber/warning 또는 green)
    - 판정 텍스트 + 확신도 (%)
변수: {{verdict.pros[], cons[], judge.decision, confidence}}
```

**tam-card.html** (§01-7)
```html
목적: TAM/SAM/SOM 3가지 규모 표시
구조:
  - 3열 카드 그리드
  - 각 카드: 라벨 + 수치 (큰 폰트) + 설명
  - 하단: 경쟁 비대칭 가설 (선택)
변수: {{tam, sam, som}} with value, unit, description
```

**compare-table.html** (§01-4, §05-3)
```html
목적: 동적 비교 테이블 (기존 vs 신규, 경쟁사 비교 등)
구조:
  - thead: 비교 항목 (열: 항목명, 우리, 경쟁사A, 경쟁사B 등)
  - tbody: 각 행별 비교
  - 강조: 우리 강점은 green 배경, 약점은 red 배경
변수: {{rows[]}} with item, columns[]
       {{columns[]}} with label, value, highlight
```

---

### Implementation Structure

**design-tokens.md v2 파일 구조**:

```
design-tokens.md
├── [Frontmatter] v2 (Sprint 198 F415)
├── # Offering HTML 디자인 토큰 (v2)
│   └── "v2 검증 결과: base.html CSS variable = 가이드 §5 완전 일치"
├── ## 1. Color Tokens
│   ├── 1.1 텍스트 (4개 테이블)
│   ├── 1.2 배경 (3개)
│   ├── 1.3 보더 (3개)
│   └── 1.4 데이터 시각화 (4개)
├── ## 2. Typography Tokens (8개 테이블)
├── ## 3. Layout Tokens (8개 테이블)
├── ## 4. Component Spacing Tokens (5개 테이블)
└── [Changelog] v1→v2 변경사항
```

**신규 컴포넌트 파일들**:

```
templates/components/
├── exec-summary.html (신규)
│   └── 경영진 3분 판단용 3열 그리드 불릿
├── three-axis.html (신규)
│   └── 3축 카드 + CTA 블랙박스
├── gan-verdict.html (신규)
│   └── 추진론/반대론/판정 배지
├── tam-card.html (신규)
│   └── TAM/SAM/SOM 3카드
├── compare-table.html (신규)
│   └── 동적 비교 테이블
└── [기존 7개 파일 유지]
    ├── hero.html
    ├── ba-grid.html
    ├── compare-grid.html
    ├── trend-grid.html
    ├── flow-diagram.html
    ├── roadmap-track.html
    ├── impact-list.html
    └── ... (기타)
```

---

## Integration Points

### F414 → F415 연동

1. **SKILL.md v2.0의 섹션별 컴포넌트 참조**
   - §0 → hero.html
   - §0.5 → exec-summary.html (신규)
   - §01-1 → three-axis.html (신규)
   - 등...

2. **design-tokens.md v2의 컴포넌트 참조 테이블**
   - 12종 컴포넌트를 모두 나열하여, 어떤 섹션에서 사용되는지 매핑

### F414 → F416 (다음 Sprint)

- F414에서 정의한 20섹션 목차
- F416에서 발굴 산출물(2-0~2-8)을 이 목차의 어느 섹션에 매핑할지 정의

---

## Success Criteria

| 기준 | 타겟 | 판정 |
|------|------|------|
| SKILL.md v2.0 완성도 | 20섹션 목차 + 8단계 프로세스 + KT 연계 검증 모두 명시 | ✅ 100% |
| design-tokens.md v2 완성도 | 30개 토큰 + 가이드 정합성 검증 + 12종 컴포넌트 참조 | ✅ 100% |
| 신규 컴포넌트 5종 | 모두 생성 + HTML 구문 검증 | ✅ 100% |
| Design ↔ Implementation 매칭 | 100% 일치 (Gap 0%) | ✅ 100% |
| 다음 Sprint 호환성 | F416/F417/F418 선행 요구사항 모두 충족 | ✅ OK |

---

## Risks & Mitigations

| 위험 | 영향 | 대응 |
|------|------|------|
| F416 매핑 기준 미정 | F416 설계 지연 | F414에서 20섹션을 명확히 정의하여, F416에서 참조만 하도록 준비 |
| 경영 언어 원칙 미완 | F417 의존 | SKILL.md §183에 참조 표시, F417에서 상세 작성 |
| 고객 유형별 톤 부족 | 사용자 혼란 | SKILL.md §202에 3가지 시나리오 기본 정의, 사용 사례 추가는 F417/F419에서 |

---

## Next Phase

**F416 (Sprint 199)**: 발굴 산출물 자동 매핑
- section-mapping.md 신규 작성
- 2-0~2-8 단계별 → 20섹션 매핑 테이블

**F417 (Sprint 199)**: 경영 언어 원칙 적용
- writing-rules.md 신규 작성
- F414 10항목 원칙 → 스킬 로직 내장

**F418~F419 (Sprint 200)**: KT 연계 + GAN 교차검증
- KT 연계 3축 자동 검증 강화
- GAN 추진론/반대론/판정 자동 생성

---

**Design Completed**: 2026-04-07
