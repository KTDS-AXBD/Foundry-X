# Offering Skill v2 Design Document

> **Summary**: 기존 offering-html 스킬을 가이드 기반으로 고도화 — 목차 엔진 + 작성 원칙 내장 + 교차검증 자동화
>
> **Project**: Foundry-X
> **Author**: AX BD팀
> **Date**: 2026-04-07
> **Status**: Draft
> **Planning Doc**: [offering-skill-v2.plan.md](../../01-plan/features/offering-skill-v2.plan.md)
> **PRD**: [prd-final.md](../../specs/axbd-offering/prd-final.md)

---

## 1. Overview

### 1.1 Design Goals

1. **품질 균일화**: 누가 실행해도 동일 구조/톤/포맷의 사업기획서 생성
2. **가이드 100% 반영**: `AX BD팀 사업기획서 생성 스킬.md` §3~§6 전체 내장
3. **최소 변경**: 기존 v1 구조(SKILL.md + design-tokens + base.html + 17종 컴포넌트)를 유지하면서 확장

### 1.2 Design Principles

- **기존 v1 호환**: 8단계 생성 프로세스 유지, 파일/폴더 구조 변경 없음
- **참조 문서 분리**: 작성 원칙/매핑/교차검증은 별도 .md 파일로 분리하여 SKILL.md 비대화 방지
- **프롬프트 중심**: 코드 로직이 아닌 프롬프트 + 참조 문서로 품질 통제

---

## 2. Architecture

### 2.1 파일 구조 (v1 → v2 변경)

```
docs/specs/axbd/shape/offering-html/
├── SKILL.md                     # [변경] 목차 엔진 + 프로세스 강화
├── design-tokens.md             # [변경] 가이드 §5 완전 반영
├── section-mapping.md           # [신규] 가이드 §2 발굴→섹션 매핑
├── writing-rules.md             # [신규] 가이드 §6 작성 원칙 상세
├── cross-validation.md          # [신규] 가이드 §4(05-4) 교차검증
├── templates/
│   ├── base.html                # [변경] CSS variable 갱신
│   └── components/              # [변경] 12종 갱신 + 신규 추가
│       ├── hero.html            # [유지]
│       ├── exec-summary.html    # [신규] Executive Summary 전용
│       ├── three-axis.html      # [신규] 추진배경 3축 카드
│       ├── compare-grid.html    # [유지]
│       ├── compare-table.html   # [신규] 데이터 비교 테이블
│       ├── ba-grid.html         # [유지]
│       ├── trend-grid.html      # [유지]
│       ├── step-block.html      # [유지]
│       ├── flow-diagram.html    # [유지]
│       ├── impact-list.html     # [유지]
│       ├── option-card.html     # [유지]
│       ├── roadmap-track.html   # [유지]
│       ├── scenario-card.html   # [유지]
│       ├── kpi-card.html        # [유지]
│       ├── bottom-note.html     # [유지]
│       ├── cta.html             # [유지]
│       ├── section-header.html  # [유지]
│       ├── silo-grid.html       # [유지]
│       ├── vuln-list.html       # [유지]
│       ├── nav.html             # [유지]
│       ├── gan-verdict.html     # [신규] 교차검증 추진론/반대론/판정
│       └── tam-card.html        # [신규] TAM/SAM/SOM 3개 카드
└── examples/
    └── KOAMI_v0.5.html          # [유지] 회귀 테스트용
```

### 2.2 데이터 플로우

```
[사용자 발화] "사업기획서 만들어줘"
       │
       ▼
[1] SKILL.md — 아이템 확인
       │  발굴 산출물(2-0~2-8) 파일 탐색
       │  section-mapping.md 참조하여 매핑
       ▼
[2] SKILL.md — 목차 확정
       │  고객 유형 질문 (AskUserQuestion)
       │  필수/선택 섹션 자동 결정
       ▼
[3] SKILL.md — 핵심 정보 수집
       │  매핑 결과에서 부족한 정보 AskUserQuestion
       │  writing-rules.md 참조하여 톤 결정
       ▼
[4] base.html + components/ — 초안 생성 (v0.1)
       │  design-tokens.md 기반 CSS variable
       │  경영 언어 원칙 적용 (writing-rules.md)
       │  KT 연계 3축 체크 → 미충족 시 경고
       ▼
[5] 피드백 반영 — 섹션별 수정 (v0.2~v0.4)
       │  <!-- CHANGED --> 마커 삽입
       ▼
[6] cross-validation.md — 교차검증 자동 생성
       │  GAN 표준 질문 풀(7개)
       │  ogd-orchestrator 호출
       │  추진론/반대론/판정 배지
       ▼
[7] writing-rules.md — 최종 점검
       │  경영 언어 체크리스트 10항목
       ▼
[8] 최종 확정 (v1.0)
       └── 파일명: 사업기획서_{사업명}_v{버전}_{YYMMDD}.html
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| SKILL.md | section-mapping.md | 발굴 산출물→섹션 자동 매핑 |
| SKILL.md | writing-rules.md | 경영 언어 + KT 연계 + 고객 톤 규칙 |
| SKILL.md | cross-validation.md | GAN 교차검증 질문 풀 + 판정 로직 |
| SKILL.md | ax-bd-offering-agent | 에이전트 호출 |
| Step 6 | ogd-orchestrator | GAN 추진론/반대론 생성 |
| Step 6 | six-hats-moderator | 6색 모자 토론 (선택) |
| F420 | offering-pptx 스킬 | HTML→PPTX 변환 체이닝 |

---

## 3. Detailed Design

### 3.1 F414: 표준 목차 엔진

**현재 (v1)**: SKILL.md에 18섹션 목차가 하드코딩. 선택 섹션(02-4, 02-5) 분기 로직 있음.

**변경**: 가이드 §3의 20섹션으로 목차 확장 + 선택 섹션 대체 가이드 반영.

| v1 섹션 | v2 섹션 (가이드 기준) | 변경 |
|---------|---------------------|------|
| 0. Hero | 0. Hero | 유지 |
| 0.5 Exec Summary | 0.5 Executive Summary | **불릿 풀 6종 표준화** |
| 01 추진배경 | 01-1 추진 배경 및 목적 | **3축 구조 필수화** |
| — | 01-2 왜 이 문제/영역 | **신규 분리** |
| — | 01-3 왜 이 기술/접근법 | **신규 분리** |
| — | 01-4 왜 이 고객/도메인 | **신규 분리** |
| 02-4 기존 사업 현황 | 01-5 (선택) | 이동 |
| 02-5 Gap 분석 | 01-6 (선택) | 이동 |
| 02-6 글로벌 동향 | 01-7 시장 분석 + 01-8 동향 | **2개로 분리** |
| 03-1 솔루션 개요 | 02-1 사업 개요 + 02-2 To-Be + 02-3 서비스 구성안 | **3개로 분리** |
| 03-2 시나리오 | 03-1 유저 시나리오 | 유지 |
| 03-3 로드맵 | 03-2 사업 구도 + 03-3 로드맵 | **구도 분리** |
| 04-1~04-4 | 04-1~04-3 + 05-1~05-4 | **재배치** |
| 05 KT 연계 | 제거 (01-1 3축에 통합) | **축소** |

**선택 섹션 대체 가이드** (SKILL.md Step 2에 추가):

```markdown
## 선택 섹션 분기 로직

| 고객 유형 | 01-5 (기존 사업) | 01-6 (Gap 분석) |
|-----------|-----------------|----------------|
| 기존 고객 | 포함 | 포함 |
| 신규 고객 | → "고객 접근 전략" | 생략 |
| 신규 시장 | 생략 | → "시장 진입 장벽" |
```

### 3.2 F415: 디자인 시스템 v2

**현재 (v1)**: design-tokens.md가 이미 가이드 §5와 **거의 일치** (KOAMI v0.5에서 추출).

**변경 범위** (최소):
- 가이드에 명시된 `max-width: 1200px`, 섹션 패딩 `120px 40px 80px` 확인/보정
- 반응형 900px 이하 1컬럼 확인
- IntersectionObserver `.fade-in` 애니메이션 확인
- 컴포넌트 12종 매핑: 기존 17종 중 가이드에 명시된 12종 강조

**신규 컴포넌트 4종:**

| 컴포넌트 | 파일 | 용도 |
|---------|------|------|
| `exec-summary.html` | Executive Summary 불릿 풀 레이아웃 | 6종 표준 불릿 |
| `three-axis.html` | 추진배경 3축 카드 그리드 | 수익성/KT적합성/실행력 |
| `gan-verdict.html` | 교차검증 판정 카드 | 추진론/반대론/배지 |
| `tam-card.html` | TAM/SAM/SOM 3개 카드 | 시장 규모 |
| `compare-table.html` | 비교 테이블 (v1의 vuln-list 대체) | 데이터 비교 |

### 3.3 F416: 발굴 산출물 자동 매핑

**신규 파일**: `section-mapping.md`

가이드 §2의 매핑 테이블을 스킬이 참조할 수 있는 형태로 정리:

```markdown
## 발굴 단계 → 섹션 매핑

| 발굴 단계 | 산출물 키워드 | 매핑 섹션 |
|-----------|-------------|----------|
| 2-0 | 아이템 개요, 고객, 도메인 | Hero, Exec Summary, 01-4 |
| 2-1 | 레퍼런스, 경쟁사 | 01-8 |
| 2-2 | TAM/SAM/SOM, Pain Point | 01-2, 01-3, 01-7 |
| 2-3 | KT 시너지, 경쟁 구도 | 01-8, 04-1, 04-2 |
| 2-4 | AI 체크리스트 | 01 전체 |
| 2-5 | KT 방향, 숏리스트 | 01-1, 02-1, 02-3, 04-1, 04-2, 05-1 |
| 2-6 | 페르소나, Value | 01-4, 03-1 |
| 2-7 | BM, 수익 시뮬 | 03-2, 05-2, 05-3 |
| 2-8 | Input Deck 종합 | 전체 기초 자료 |
```

**SKILL.md Step 3 변경**: `section-mapping.md`를 참조하여 발굴 산출물 파일을 자동 탐색 + 섹션별 데이터 매핑.

### 3.4 F417: 경영 언어 원칙

**신규 파일**: `writing-rules.md`

가이드 §6의 작성 원칙을 체계적으로 정리:

```markdown
## 경영 언어 체크리스트 (생성 시 자동 적용)

| # | 규칙 | Bad | Good |
|---|------|-----|------|
| 1 | 가능형 금지 | "~할 수 있다" | "~를 제안 예정", "~를 추진" |
| 2 | 최초 금지 | "최초", "첫" | "선도적 사례", "초기 시장" |
| 3 | 금액 약 표기 | "5억" | "약 5억" |
| 4 | 과대 표현 금지 | 검증 불가 주장 | 삭제 또는 근거 첨부 |
| 5 | 볼드 제한 | 문장 전체 볼드 | 키워드만 (1불릿 2~3개) |

## KT 연계 원칙

- KT 연계 없는 사업은 이 포맷의 대상이 아님 → **경고 메시지 출력**
- 추진배경 3축 필수: 수익성 / KT 적합성 / 실행력
- KT 현재 상태 솔직 기술 (협약 없으면 "없음" 명시)

## 고객 유형별 톤 자동 조정

| 고객 유형 | 시나리오 톤 | AskUserQuestion 시점 |
|-----------|-----------|---------------------|
| 분석·보고 기관 | "분석 근거 + 대응 옵션 비교" | Step 2 목차 확정 시 |
| 의사결정 주체 | "추천안 제시" | Step 2 |
| B2C 서비스 | "페르소나 기반 Use Case" | Step 2 |
```

### 3.5 F418: KT 연계 원칙 강제

**SKILL.md Step 4에 추가할 로직**:

```
[KT 연계 체크]
├── 01-1 추진배경 3축 검사:
│   ├── 축1 수익성: 매출/수익 기여 언급 있는가?
│   ├── 축2 KT적합성: KT 전략/시너지 언급 있는가?
│   └── 축3 실행력: kt ds 기술/자산 레버리지 있는가?
├── 미충족 축이 있으면:
│   └── ⚠️ "추진배경 3축 중 {축명}이 누락되었어요. 보충하시겠어요?"
└── KT 연계가 전혀 없으면:
    └── ⚠️ "KT 연계가 없는 사업은 이 기획서 포맷의 대상이 아니에요."
```

### 3.6 F419: GAN 교차검증 자동화

**신규 파일**: `cross-validation.md`

```markdown
## 표준 질문 풀 (7개)

| # | 질문 | 유형 | 적용 조건 |
|---|------|------|----------|
| 1 | 올해 매출·수익에 어떻게 기여하는가? | 수익성 | 항상 |
| 2 | 이 시장/기술이 정말 새로운 기회인가? | 시장성 | 항상 |
| 3 | 필요한 데이터를 안정적으로 확보할 수 있는가? | 실행력 | 항상 |
| 4 | KT와 연계 논의가 된 것인가? | KT 적합성 | 항상 |
| 5 | 기존 인프라/자산 레버리지가 실제로 가능한가? | 실행력 | 기존 자산 있을 때 |
| 6 | 금번 미진행 시 기회비용은 무엇인가? | 긴급성 | 경쟁 압박 있을 때 |
| 7 | 핵심 기술/역량은 외부 의존 리스크가 있는가? | 리스크 | 항상 |

## 판정 배지

| 배지 | 색상 | 의미 |
|------|------|------|
| ✅ 유효 | 초록 (#16a34a) | 근거 충분, 리스크 낮음 |
| ⚠️ 조건부 | 주황 (#ea580c) | 일부 리스크, 보완 필요 |
| ❌ 주의 | 빨강 (#dc2626) | 근거 부족, 높은 리스크 |

## 교차검증 생성 프로세스

1. 사업기획서 전체 내용을 기반으로 7개 질문 자동 적용
2. 각 질문에 대해 **추진론** (이 사업을 해야 하는 이유) 생성
3. 각 질문에 대해 **반대론** (이 사업을 하면 안 되는 이유) 생성
4. 추진론/반대론 균형을 분석하여 **판정 배지** 부여
5. 원칙: "경영진이 안심하도록"이 아니라 "정확히 판단하도록" — **냉철한 톤**
```

### 3.7 F420: PPTX 변환 (P1)

**기존 offering-pptx 스킬과 체이닝**:
- SKILL.md Step 8 이후에 "PPTX로도 변환할까요?" AskUserQuestion 추가
- 승인 시 offering-pptx 스킬 호출 → HTML 파일 경로 전달

### 3.8 F421: 버전 이력 추적 (P1)

**SKILL.md에 추가할 로직**:
- 매 버전 생성 시(v0.1, v0.2, ...) `review-history.md`에 자동 append
- 형식: `| v{N} | {날짜} | {변경 요약} | {변경 섹션 목록} |`
- diff 요청 시 이전 버전과 현재 버전의 섹션별 차이 표시

### 3.9 F422: 피드백 반영 자동화 (P1)

**SKILL.md Step 5 강화**:
- 사용자가 피드백 텍스트 입력 → 해당 섹션 식별 → 자동 수정
- 수정된 부분에 `<!-- CHANGED: {사유} -->` 마커 삽입
- 고객 유형별 톤 자동 조정 (writing-rules.md 참조)

---

## 4. Implementation Checklist

### Sprint 198 (M1-A: 기반 구조)

- [ ] SKILL.md 목차 섹션을 가이드 §3 기준 20섹션으로 갱신
- [ ] 선택 섹션 대체 가이드 로직 추가 (고객 유형별 분기)
- [ ] design-tokens.md를 가이드 §5와 diff → 차이 보정
- [ ] base.html CSS variable 갱신
- [ ] 신규 컴포넌트 5종 생성 (exec-summary, three-axis, gan-verdict, tam-card, compare-table)

### Sprint 199 (M1-B: 입력/출력 품질)

- [ ] section-mapping.md 생성 (가이드 §2 매핑 테이블)
- [ ] writing-rules.md 생성 (가이드 §6 작성 원칙 + KT 연계 + 고객 톤)
- [ ] SKILL.md Step 3에 section-mapping.md 참조 로직 추가
- [ ] SKILL.md 프롬프트에 writing-rules.md 규칙 내장

### Sprint 200 (M2: 검증 계층 — MVP 완료)

- [ ] SKILL.md Step 4에 KT 연계 3축 체크 + 경고 로직 추가
- [ ] cross-validation.md 생성 (표준 질문 풀 7개 + 판정 로직)
- [ ] SKILL.md Step 6에 cross-validation.md 참조 + ogd-orchestrator 연동
- [ ] KOAMI 예시로 회귀 테스트 (v1 대비 품질 동등 이상)

### Sprint 201 (M3-A: 확장 기능)

- [ ] SKILL.md Step 8 이후 PPTX 변환 AskUserQuestion + 체이닝
- [ ] 버전 이력 자동 기록 로직 (review-history.md 자동 append)

### Sprint 202 (M3-B: 피드백 루프)

- [ ] SKILL.md Step 5 강화 — 피드백→섹션 식별→자동 수정→마커 삽입
- [ ] 고객 유형별 톤 자동 조정 통합

---

## 5. Verification Criteria

### Gap Analysis 기준 (90% 목표)

| 항목 | 검증 방법 | 통과 기준 |
|------|----------|----------|
| 목차 20섹션 | 생성 HTML 섹션 수 | 필수 섹션 전체 존재 |
| 디자인 시스템 | CSS variable 적용 여부 | design-tokens.md 토큰 100% 사용 |
| 경영 언어 | 체크리스트 10항목 | 위반 0건 |
| KT 3축 | 3축 존재 여부 | 3축 모두 채워짐 |
| 교차검증 | 판정 배지 존재 | 7개 질문 전체 판정 |
| 신규 컴포넌트 | HTML 내 사용 여부 | 5종 중 해당 컴포넌트 사용 |
| 회귀 | KOAMI 예시 비교 | v1 대비 품질 동등 이상 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-07 | Plan 기반 초안 | AX BD팀 |
