---
name: offering-pptx
domain: ax-bd
stage: shape
version: "1.0"
description: "AX BD팀 사업기획서(PPTX) 생성 스킬 — 18섹션 표준 슬라이드, 디자인 토큰 기반 렌더링"
input_schema: DiscoveryPackage + OfferingConfig
output_schema: OfferingPPTX
upstream: [ax-bd/discover/packaging]
downstream: [ax-bd/validate/gan-cross-review]
agent: ax-bd-offering-agent
status: Active
triggers:
  - 사업기획서 PPT
  - offering pptx
  - 형상화 PPTX
  - business proposal pptx
  - PPT 만들어줘
evolution:
  track: DERIVED
  registry_id: null
---

# Offering PPTX — AX BD 사업기획서 생성 스킬 (PPTX)

AX BD팀이 발굴한 사업 아이템을 KT 연계 AX 사업기획서(PPTX)로 형상화하는 스킬.
KT 연계 AX 사업개발 체계의 **3. 형상화** 단계를 자동화한다.

> offering-html과 대칭 구조. 동일 DiscoveryPackage + OfferingConfig를 입력으로 받아 PPTX로 출력한다.

## When

- 발굴 단계(2-0~2-8) 산출물이 **2-8 Packaging**까지 완료된 후
- 사용자가 "사업기획서 PPT 만들어줘" 또는 "offering pptx" 요청 시
- OfferingConfig.format = "pptx" 인 경우

### 3가지 트리거 시나리오

| 시나리오 | purpose | 특성 |
|---------|---------|------|
| 대외 제안용 | proposal | 고객/파트너 제출, 기술 상세 + 솔루션 강조 |
| 경영회의 보고용 | report | 본부장/대표 보고, 경영 언어 + Exec Summary 강조 |
| 팀 내부 검토용 | review | 진행상황 공유, 리스크 중심 + No-Go 기준 강조 |

## How (8단계 생성 프로세스)

```
[1] 아이템 확인
    └── 발굴 단계(2-0~2-8) 산출물 확인
    └── 어떤 단계까지 완료되었는지 파악
        ↓
[2] 슬라이드 목차 확정
    └── 18섹션 표준 목차에서 필수/선택 결정
    └── 선택 섹션(02-4, 02-5) 포함 여부 판단:
        - 기존 고객: 02-4 포함 (레버리지 자산)
        - 신규 고객: 02-4 → "고객 접근 전략"으로 대체
        - 신규 시장: 02-5 → "시장 진입 장벽 분석"으로 대체
    └── 섹션→슬라이드 매핑 (§표준 슬라이드 목차)
        ↓
[3] 핵심 정보 수집
    └── DiscoveryPackage에서 슬라이드별 데이터 매핑
    └── 부족한 정보는 사용자에게 AskUserQuestion
        ↓
[4] 초안 생성 (v0.1)
    └── PPTX 엔진으로 슬라이드 생성 (§PPTX 엔진)
    └── design-tokens.md 기반 슬라이드 스타일 적용
    └── OfferingConfig.purpose에 따라 톤 결정:
        - report:   경영 언어, Exec Summary 강조, 발표 노트 간결
        - proposal: 기술 상세, 솔루션 아키텍처 다이어그램 포함
        - review:   리스크 매트릭스, No-Go 판정 기준 강조
        ↓
[5] 피드백 반영
    └── 슬라이드별 수정 요청 반영 → 버전 업 (v0.2~v0.4)
    └── 발표 노트 추가/수정
        ↓
[6] 교차검증 (자동)
    └── §04-5 사업성 교차검증 슬라이드 자동 구성
    └── ax-bd-offering-agent → validate_orchestration 호출
    └── GAN 추진론/반대론 + Six Hats + Expert 5인 결과 → 슬라이드 반영
        ↓
[7] 보고용 마무리 (v0.5+)
    └── 본부장/대표 보고 수준 품질 확인
    └── 경영 언어 원칙 최종 점검
    └── 발표 노트 완성 (슬라이드당 2~3문장)
        ↓
[8] 최종 확정 (v1.0)
    └── 보고 대상·일정 확인 후 최종본
```

## 표준 슬라이드 목차 (18섹션→슬라이드 매핑)

| 섹션 # | 섹션명 | 슬라이드 수 | 슬라이드 유형 | 필수 |
|--------|--------|------------|-------------|------|
| — | 표지 | 1 | title-slide | ● |
| — | 목차 | 1 | toc-slide | ● |
| 0 | Hero | 1 | hero-slide (KPI 3개 포함) | ● |
| 0.5 | Executive Summary | 2 | exec-summary (텍스트+도표) | ● |
| 01 | 추진 배경 및 목적 | 2 | content-slide (3축 구조) | ● |
| 02-1 | 왜 이 문제/영역 | 1 | content-slide | ● |
| 02-2 | 왜 이 기술/접근법 | 1 | content-slide | ● |
| 02-3 | 왜 이 고객/도메인 | 1 | content-slide | ● |
| 02-4 | 기존 사업 현황 | 1 | data-slide (레버리지 차트) | ○ |
| 02-5 | Gap 분석 | 1 | compare-slide (현재 vs 목표) | ○ |
| 02-6 | 글로벌·국내 동향 | 2 | data-slide (경쟁사 매트릭스) | ● |
| 03-1 | 솔루션 개요 | 2 | before-after-slide | ● |
| 03-2 | 시나리오/Use Case | 2 | scenario-slide (PoC + 본사업) | ● |
| 03-3 | 사업화 로드맵 | 1 | roadmap-slide (타임라인) | ● |
| 04-1 | 데이터 확보 방식 | 1 | content-slide (계층별) | ● |
| 04-2 | 시장 분석 및 경쟁 환경 | 2 | data-slide (TAM/SAM/SOM) | ● |
| 04-3 | 사업화 방향 및 매출 계획 | 2 | data-slide (3개년 시나리오) | ● |
| 04-4 | 추진 체계 및 투자 계획 | 1 | org-slide (조직·비용) | ● |
| 04-5 | 사업성 교차검증 | 2 | gan-slide (추진론/반대론) | ● |
| 04-6 | 기대효과 | 1 | impact-slide | ● |
| 05 | KT 연계 GTM 전략(안) | 2 | strategy-slide | ● |
| — | 마무리 | 1 | closing-slide | ● |

> ● = 필수, ○ = 선택
> **총 슬라이드**: 필수 31장 + 선택 2장 = 33장 (최대)

### 슬라이드 유형별 레이아웃

| 유형 | 레이아웃 | 디자인 토큰 매핑 |
|------|---------|-----------------|
| title-slide | 중앙 정렬, 고객명 + 프로젝트명 + 날짜 | typography.hero, color.bg.default |
| toc-slide | 2열 목차, 섹션 번호 + 제목 | typography.section, color.text.primary |
| hero-slide | 한줄 요약 + KPI 3개 카드 | typography.hero, typography.kpi |
| exec-summary | 좌: 텍스트 요약 / 우: 핵심 도표 | typography.body, layout.maxWidth |
| content-slide | 제목 + 본문 + 보조 그래픽 | typography.section, typography.body |
| data-slide | 제목 + 차트/테이블 + 범례 | color.data.*, typography.label |
| compare-slide | 좌: Before / 우: After | color.border.strong |
| before-after-slide | 상: Before / 하: After (화살표) | color.data.positive/negative |
| scenario-slide | 시나리오 카드 2~3개 | layout.cardRadius, spacing.grid.gap |
| roadmap-slide | 타임라인 (단기→중기→장기) | color.data.*, typography.label |
| org-slide | 조직도 + 비용 테이블 | typography.body, color.border.default |
| gan-slide | 좌: 추진론 / 우: 반대론 + 판정 | color.data.positive/negative |
| impact-slide | 기대효과 리스트 + 수치 | typography.kpi, color.data.positive |
| strategy-slide | GTM 전략 + KT 연계 구조 | typography.section |
| closing-slide | 감사 인사 + 연락처 | typography.hero |

## 작성 원칙

### 경영 언어 (HTML과 동일)
- "~할 수 있다" → "~를 제안 예정", "~를 추진"
- 금액에 반드시 "약" 표기
- "최초", "첫" 표현 금지 → "선도적 사례", "초기 시장"
- 볼드는 핵심 키워드에만 (슬라이드당 2~3개)

### PPTX 특화 원칙
- **발표 노트**: 슬라이드당 2~3문장, 발표자가 읽는 용도
- **글자 크기**: 본문 최소 14pt, 제목 최소 24pt (가독성)
- **슬라이드당 핵심 메시지**: 1개 (한줄로 요약 가능해야 함)
- **애니메이션**: 기본 없음 (필요 시 Fade-In만 허용)
- **차트/테이블**: 색상은 data-tokens만 사용, 불필요한 장식 배제

### KT 연계 (HTML과 동일)
- KT 연계 없는 사업은 이 포맷의 대상이 아님
- KT와의 현재 상태를 솔직하게 기술
- 단계적: kt ds 주도 → KT 사전 협의 → KT 공동 제안

## Output Format

### 파일명
```
AX Discovery_사업기획서_{고객명}_v{버전}_{YYMMDD}.pptx
```

### 버전 관리
| 버전 | 의미 |
|------|------|
| v0.1 | 초안 (목차 + 핵심 슬라이드) |
| v0.2~0.4 | 피드백 반영 수정 |
| v0.5+ | 본부장/대표 보고용 |
| v1.0 | 최종 확정본 |

## PPTX 엔진

> Sprint 172 F380에서 최종 선택. 여기서는 비교 매트릭스만 제공한다.

| 기준 | pptxgenjs | python-pptx |
|------|----------|-------------|
| 언어 | TypeScript/JS | Python |
| 런타임 | Node.js / Browser | Python subprocess |
| 차트 지원 | ● 내장 | ● 내장 |
| 슬라이드 마스터 | ○ 제한적 | ● 완전 지원 |
| 한국어 폰트 | ● Pretendard embed 가능 | ● 가능 |
| Workers 호환 | ✅ (ESM) | ❌ (subprocess 필요) |
| 패키지 크기 | ~300KB | ~50MB (Python 환경) |

**유력 후보**: pptxgenjs — Workers 환경에서 직접 실행 가능, ESM 호환, 가벼움.
**대안**: python-pptx — 슬라이드 마스터 복잡도가 높을 경우.

## Cowork PPTX 연동

PPTX 공유·편집을 위한 Cowork 연동 인터페이스 설계:

```
CoworkPPTXInterface:
  upload(pptxBuffer, metadata) → CoworkDocId
  share(docId, users[])       → ShareLink
  getComments(docId)           → Comment[]
  exportVersion(docId, ver)    → Buffer
```

### 워크플로우

```
[1] Offering PPTX 생성 (이 스킬)
        ↓
[2] Cowork 업로드 (CoworkPPTXInterface.upload)
        ↓
[3] 팀/고객 공유 (CoworkPPTXInterface.share)
        ↓
[4] 코멘트 수집 (CoworkPPTXInterface.getComments)
        ↓
[5] 피드백 반영 → v0.2+ 재생성
        ↓
[6] 최종본 export (CoworkPPTXInterface.exportVersion)
```

> 실구현은 Cowork MCP 연동 시점에 확정. 현재는 인터페이스 정의.

## Dependencies

- **offering-html** — 동일 DiscoveryPackage + OfferingConfig 구조 공유
- **design-tokens.md** — PPTX 슬라이드 스타일링에 동일 토큰 적용
- **ax-bd-offering-agent** — 형상화 라이프사이클 오케스트레이션 (Sprint 166 F368)
- **PPTX 엔진** — Sprint 172 F380에서 선택 + 구현
