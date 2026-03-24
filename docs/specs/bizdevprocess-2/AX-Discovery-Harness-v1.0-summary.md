---
code: FX-SPEC-BDP-002
title: AX BD팀 사업개발 Harness Engineering — pm-skills 기반 Discovery 실행 가이드
version: 1.0
status: Active
category: SPEC
created: 2026-03-23
updated: 2026-03-23
author: Sinclair Seo
source: 내부 문서 — Discovery-X-AXBD_01~02 (2026)
related: "[[FX-SPEC-BDP-001]]"
---

# AX BD팀 사업개발 Harness Engineering

## §1 개요

AX BD팀 사업개발의 2단계(발굴/Discovery)를 **Claude Desktop + pm-skills 플러그인**으로 실행하는 Harness Engineering 가이드.
[[FX-SPEC-BDP-001]]이 "무엇을 할 것인가"(프로세스 체계)를 정의한다면, 본 문서는 "어떻게 할 것인가"(도구·스킬·실행 경로)를 정의해요.

**출처**: 내부 문서 — Discovery-X-AXBD_01.pdf(전체 그림) + AXBD_02_0~2.pdf(실행 가이드)
**목적**: pm-skills 기반으로 Discovery 9개 완료 기준을 체계적으로 달성하여 PRD 단계 진입

**핵심 원칙**:
- 에이전트와 함께 Discovery 9개 요소를 **모두 채워야** PRD 단계로 진입 가능
- 5가지 시작점에 따라 분석 경로가 달라지지만, 최종 완료 기준은 동일
- 이 문서는 계속 디벨롭이 필요 (Discovery 완료 기준 9개 타당성, 완료 조건 검증 등)

## §2 사전 준비 (Phase 0)

### 필수

| 항목 | 설명 |
|------|------|
| 사외망 PC | 외부 SaaS 접근 가능한 PC |
| Claude Desktop | Anthropic Claude Desktop 앱 설치 |
| pm-skills 플러그인 | Claude Desktop → 사용자 지정 → 개인 플러그인 → `phuryn/pm-skills` 설치 |

### 옵션

| 항목 | 설명 |
|------|------|
| 한국어 응답 Skill | 스킬 이름: `korean-response`, 지침: "항상 한국어로 응답, 제품/전략 프레임워크 이름은 영어, 설명은 한국어" |

### pm-skills 설치 방법

1. Claude Desktop 설치 → AX BD팀 계정 로그인 (Pro, Max 구독 필요)
2. 좌상단 메뉴 바 → [사용자 지정] 클릭
3. [개인 플러그인] 오른쪽 [+] → [플러그인 탐색]
4. [개인] 탭 → [+] → [GitHub에서 마켓플레이스 추가] → `phuryn/pm-skills` 입력 → 동기화
5. 플러그인 목록에서 [설치] 버튼 클릭 → 완료

## §3 구조 개념

| 용어 | 정의 | 실행 방법 |
|------|------|----------|
| **스킬(Skill)** | 대화 중 자동으로 로드되는 PM 도메인 지식 단위 | `/스킬명`으로 직접 실행 |
| **명령어(Command)** | `/명령어`로 직접 실행하는 다단계 워크플로우 | 여러 스킬을 체이닝 |
| **플러그인(Plugin)** | 관련 스킬 + 명령어를 묶은 설치 단위 | pm-skills = 1개 플러그인 |

> 명령어 or 스킬은 Claude cowork 입력창에서 `/`(슬래시)를 통해 선택 및 실행.

### 참고사항

- 스킬(Skill)은 대화 중 필요에 따라 자동으로 PM 도메인 지식 단위, /스킬명으로 직접 실행 가능
- 명령어(Command): /명령어로 직접 실행하는 다단계 워크플로우 (여러 스킬을 체이닝)
- 플러그인(Plugin): 관련 스킬 + 명령어를 묶은 설치 단위
- GPT-4 / Claude의 pm-skills GPTs도 있지만 스킬/명령어 실행은 별도 확인이 필요
- 같은 명령어도 특히 외부 스킬/명령어의 경우 프롬프트나 데이터의 정의가 달라 다른 결과가 나올 수 있음
  (공통 프레임워크를 써도 데이터가 달라지면 다른 결과)

## §4 5가지 시작점 (Entry Points)

사업 아이템의 출발점에 따라 Discovery 경로가 달라져요. 각 시작점마다 핵심 분석 단계와 pm-skills 스킬이 매핑돼요.

### 4-1. 아이디어에서 시작

> "솔루션 아이디어는 있지만 말씀하심 근거가 없다."

| 단계 | 활동 | pm-skills |
|------|------|-----------|
| 1 | 아이디어/솔루션 입력 | — |
| 2 | 아이디어 핵심 파악 + 내재된 문제(Pain point) 가설 생성 | /brainstorm |
| 3 | 타깃 고객의 핵심 질문(Jobs-to-be-Done) 나열, 현재 해결 인터뷰 반영 | /interview |
| 4 | 해당 고객 세그먼트 최종 생성 및 세그먼트별 문제와 심도 측정 | /research-users |
| 5 | 타깃 고객 인터뷰 + 실질 문제 여부 확인 | /interview |
| 6 | 리서치결론 — 문제식 솔루션 방향 확정 or 피봇 | /strategy |
| 7 | 시장규모 · 경쟁사 분석 | /competitive-analysis, /market-scan |
| 8 | 수익 구조 · 리스크 기점 · 규제/기술적 제약 · 차별화 요소 병행 | /business-model, /value-proposition |

### 4-2. 시장 또는 타겟에서 시작

> "누구를 볼지는 알지만 무엇을 만들지는 모른다."

| 단계 | 활동 | pm-skills |
|------|------|-----------|
| 1 | 시장 또는 타겟 고객 입력 | — |
| 2 | 타깃 고객의 핵심 질문(Jobs-to-be-Done) 나열, 현재 해결 인터뷰 반영 | /interview |
| 3 | 해당 핵심 결정 및 검증(리서치 등) + 현장 대화 수집/수정 | /research-users |
| 4 | 리서치결론 — 문제 해결 우선순위 선정 (ex. 2×2 매트릭스) | /strategy |
| 5 | 문제 기반 솔루션 아이디에이션 · 컨셉 분석 | /brainstorm |
| 6 | 시장 규모 정량화 · 수익 구조 생성 | /market-scan, /business-model |
| 7 | 리스크 기점 · 규제/기술적 제약 · 차별화 요소 병행 | /value-proposition |

### 4-3. 고객 문제에서 시작

> "고객의 문제는 발견했지만, 해결 방법이 없다."

| 단계 | 활동 | pm-skills |
|------|------|-----------|
| 1 | 고객 문제 설명 및 무엇이 입력 | — |
| 2 | 기술 확산/트렌드 보고 및 산업별 시장 구조 입력 | /market-scan |
| 3 | 아이디어 형상 결정 및 고객 인터뷰 + 지원필요(WTP) 조사 | /interview, /research-users |
| 4 | 산업별 Use Case 목록 | /competitive-analysis |
| 5 | 해석결론 — Use Case 확인 (ex. 산업별 필터/검증분석) | /strategy |
| 6 | 문제 전환 근거 검토 + 정의(시뮬레이션/비즈해석) | /business-model |
| 7 | 고객 세그먼트 · 경쟁사 분석 | /beachhead-segment, /competitive-analysis |
| 8 | 새로운 가치 제안 · 수익 구조 변환 시뮬레이션 | /value-proposition |
| 9 | 수익 구조 · 가치 제안 · 리스크 기점 병행 | /business-model |

### 4-4. 기술에서 시작

> "강력한 기술은 있지만, 어디에 쓸지 모른다."

| 단계 | 활동 | pm-skills |
|------|------|-----------|
| 1 | 기술명/트렌드 보고 입력 | — |
| 2 | 기술 핵심 분석 + 산업별 적용 가능한 분야 매핑 체계 구축 | /market-scan |
| 3 | 산업별 Use Case 목록 | /brainstorm |
| 4 | 해석결론 — Use Case 확인 (산업별/비즈시나리오) | /strategy |
| 5 | 리서치결론 — 시장 규모 + AI 기회 변화와 수요 추정 | /market-scan |
| 6 | 신규 경쟁사 위주 수준 분석 및 흐름 타 확인 등록 | /competitive-analysis |
| 7 | 리서치결론 — 시장 전략 선택 항목 분류(기도화/신규확장) | /strategy |
| 8 | 핵심 리스크 기점 · 최소 검증 실험 설계 | /pre-mortem |

### 4-5. 기존 서비스에서 시작

> "운영 중인 사업에 시장에 시작하고 싶다."

| 단계 | 활동 | pm-skills |
|------|------|-----------|
| 1 | 기존 서비스 현황 및 비즈니스 구조 입력 | — |
| 2 | 서비스 가치 사슬 분석 및 가치 포착 구조 분석 | /business-model |
| 3 | 고객 고착화(인터뷰) + AI 기회 변화와 수요 추정 | /interview, /research-users |
| 4 | 기존 서비스 정량을 기반으로 나아가 모형 형상 설정 | /market-scan |

## §5 Discovery 완료 기준 (총 9개)

PRD 생성을 위한 최소 조건. 각 항목별 완료 조건이 존재해요.

| # | 항목 | 핵심 질문 | 완료 조건 | 관련 pm-skills |
|---|------|----------|----------|---------------|
| 1 | **문제/고객 정의** | 누가, 어떤 문제를 갖고 있는가 | 고객 세그먼트 1개 이상 + 문제 1문장 (JTBD 형식) | /interview, /research-users |
| 2 | **시장 기회** | TAM/SAM/SOM, 성장률, 왜 지금인가 | SOM 기준 시장 규모 수치 + 연간 성장률 + why now 이유 1개 | /market-scan |
| 3 | **경쟁 환경** | 직접/간접 경쟁사, 시장 공백 위치 | 직접 경쟁사 3개 이상 + 차별화 포지셔닝 맵 또는 비교표 | /competitive-analysis |
| 4 | **가치 제안 가설** | 무엇을, 누구에게, 왜 우리 것을 | JTBD 1문장 + 기존 대비 명확한 차별화 1가지 서술 | /value-proposition |
| 5 | **수익 구조 가설** | 누가, 얼마나, 어떤 방식으로 돈을 내는가 | 과금 모델 명시 + WTP 추정 근거 + 핵심 원가/마진/유닛 구조 초안 | /business-model |
| 6 | **핵심 리스크 가정** | 사업 성패를 가를 미검증 가정 | 우선순위화된 가정 목록 + 각 가정의 검증 방법과 결과 기준 | /pre-mortem |
| 7 | **규제/기술 제약** | 진입 장벽, 법적/윤리적 리스크 | 관련 규제 목록 + 대응 방향 명시 (해당 없으면 '없음' 명시) | /market-scan |
| 8 | **차별화 근거** | 왜 우리가 이길 수 있는가 | 경쟁사 대비 지속 가능한 우위 요소 2가지 이상 + 모방 난이도 | /competitive-analysis, /value-proposition |
| 9 | **검증 실험 계획** | 가장 싸고 빠른 가설 검증 방법 | 최소 실험 3개 + 각 실험의 성공/실패 판단 기준 명시 | /pre-mortem |

### 완료 판정

- **PRD 진입 가능**: 9개 항목 모두 완료 조건 충족
- **부분 완료**: 완료 조건 미충족 항목이 있으면 해당 항목 보완 후 재판정

## §6 pm-skills 전체 스킬 목록

### 6개 카테고리 · 18개 스킬

#### pm-product-discovery (신사업 발굴)

| 스킬 | 용도 | Discovery 기준 매핑 |
|------|------|---------------------|
| `/discovery` | 전체 제품 Discovery 프로세스 시작 | 전체 |
| `/brainstorm` | 아이디어 발산 · 솔루션 아이디에이션 | #1 문제/고객, #4 가치 제안 |
| `/interview` | 고객 인터뷰 가이드 생성 · 인사이트 추출 | #1 문제/고객, #8 차별화 |

#### pm-product-strategy (제품 전략)

| 스킬 | 용도 | Discovery 기준 매핑 |
|------|------|---------------------|
| `/strategy` | 제품 전략 수립 · 우선순위 결정 | #2 시장 기회, #6 리스크 |
| `/business-model` | 비즈니스 모델 캔버스 · 수익 구조 설계 | #5 수익 구조 |
| `/value-proposition` | 가치 제안 캔버스 · 차별화 포인트 도출 | #4 가치 제안, #8 차별화 |
| `/market-scan` | 시장 트렌드 · 기회 탐색 | #2 시장 기회, #7 규제/기술 |

#### pm-execution (실행)

| 스킬 | 용도 | Discovery 기준 매핑 |
|------|------|---------------------|
| `/write-prd` | PRD 작성 (Discovery 완료 후) | PRD 단계 |
| `/pre-mortem` | 사전 실패 분석 · 리스크 도출 | #6 리스크, #9 검증 실험 |
| `/stakeholder-map` | 이해관계자 맵핑 · 영향력 분석 | (보조) |

#### pm-market-research (시장 조사)

| 스킬 | 용도 | Discovery 기준 매핑 |
|------|------|---------------------|
| `/research-users` | 사용자 리서치 · 페르소나 생성 | #1 문제/고객 |
| `/competitive-analysis` | 경쟁사 분석 · 포지셔닝 맵 | #3 경쟁 환경, #8 차별화 |
| `/analyze-feedback` | 기존 피드백 분석 · 인사이트 추출 | #1 문제/고객 |

#### pm-go-to-market (시장 진입)

| 스킬 | 용도 | Discovery 기준 매핑 |
|------|------|---------------------|
| `/beachhead-segment` | Beachhead 시장 선정 · 집중 공략 대상 | #2 시장 기회 |
| `/ideal-customer-profile` | 이상적 고객 프로필(ICP) 정의 | #1 문제/고객 |
| `/growth-loops` | 성장 루프 설계 · 바이럴/네트워크 효과 | (PRD 이후) |

#### pm-marketing-growth (마케팅/성장)

| 스킬 | 용도 | Discovery 기준 매핑 |
|------|------|---------------------|
| `/positioning-ideas` | 포지셔닝 아이디어 · 메시지 프레임 | #4 가치 제안, #8 차별화 |
| `/product-name` | 제품 네이밍 · 브랜드 후보 | (PRD 이후) |

## §7 BDP-001 프로세스 ↔ BDP-002 스킬 매핑

[[FX-SPEC-BDP-001]]의 6단계 프로세스와 본 문서의 pm-skills 매핑:

| BDP-001 단계 | BDP-001 세부 | BDP-002 pm-skills | 비고 |
|-------------|-------------|-------------------|------|
| 2단계 발굴 | 2-0. 아이템 분류 (Type A/B/C) | §4 시작점 5가지로 확장 | 3유형 → 5시작점 |
| 2단계 발굴 | 2-1. 레퍼런스 분석 | /competitive-analysis | Type A 핵심 |
| 2단계 발굴 | 2-2. 수요 시장 검증 | /market-scan, /research-users | Type B 핵심 |
| 2단계 발굴 | 2-3. 경쟁·자사 분석 | /competitive-analysis | — |
| 2단계 발굴 | 2-4. 사업 아이템 도출 | /brainstorm, /strategy | — |
| 2단계 발굴 | 2-5. 핵심 아이템 선정 | /strategy | Type B 핵심 |
| 2단계 발굴 | 2-6. 타겟 고객 정의 | /research-users, /interview, /ideal-customer-profile | Type C 핵심 |
| 2단계 발굴 | 2-7. 비즈니스 모델 정의 | /business-model, /value-proposition | Type C 핵심 |
| 2단계 발굴 | 2-8. 결과 패키징 | /write-prd, /beachhead-segment | — |
| 2단계 발굴 | 2-9. AI 멀티 페르소나 평가 | (pm-skills에 없음) | 별도 Agent 구현 필요 |
| 2단계 발굴 | 2-10. 팀 검토 | /stakeholder-map | — |
| 3단계 형상화 | 3-3. PRD 생성 | /write-prd | Discovery 9개 완료 후 |
| 6단계 GTM | — | /positioning-ideas, /product-name, /growth-loops | — |

### BDP-001 Type A/B/C → BDP-002 시작점 매핑

| BDP-001 유형 | BDP-002 시작점 | 설명 |
|-------------|--------------|------|
| Type A (서비스 벤치마크형) | 기존 서비스에서 시작 | 실존 서비스를 KT DS형으로 전환 |
| Type B (기술·트렌드 탐색형) | 기술에서 시작 / 시장·타겟에서 시작 | 2가지로 세분화 |
| Type C (고객 Pain 기반형) | 고객 문제에서 시작 | 직접 대응 |
| (없음) | 아이디어에서 시작 | BDP-002에서 신규 추가 |

## §8 Foundry-X 반영 포인트

### 기존 F-item과의 관계

| F-item | 제목 | BDP-002 연관 |
|--------|------|-------------|
| F175 | 사업 아이템 분류 Agent | §4 시작점 5가지 분류 로직 반영 |
| F176 | 유형별 분석 파이프라인 | §4 시작점별 경로 + pm-skills 체이닝 |
| F178 | AI 멀티 페르소나 사전 평가 | pm-skills에 없음 — 별도 구현 |

### 추가 검토 필요 사항

1. **Discovery 완료 기준 9개의 타당성 검증** — 현재 기준이 맞는지 팀 논의 필요 (원문 언급)
2. **pm-skills 스킬 실제 프롬프트 품질** — 플러그인 내부 스킬 프롬프트가 AX BD팀 맥락에 최적화되어 있는지 확인
3. **5가지 시작점 경로의 완결성** — 각 경로가 9개 완료 기준을 모두 커버하는지 매핑 검증
4. **GPT/Claude 간 스킬 실행 차이** — 같은 명령어라도 플랫폼별 결과 차이 발생 가능

## §9 참고 자료

- [[FX-SPEC-BDP-001]]: AX BD팀 사업개발 프로세스 정의 (v0.8)
- PDF 원본: `docs/specs/bizdevprocess-2/` (4개 파일)
  - `Discovery-X-AXBD_01.pdf` — 전체 그림 (시작점 5가지 + 완료 기준 9개)
  - `Discovery-X-AXBD_02_0.pdf` — 준비: Claude Desktop + pm-skills 설치
  - `Discovery-X-AXBD_02_1.pdf` — 명령어/스킬 목록 (6카테고리 18스킬)
  - `Discovery-X-AXBD_02_2.pdf` — 활용 시나리오 예시 (Skill/Command/Plugin 개념)
- pm-skills 플러그인: `phuryn/pm-skills` (GitHub)
