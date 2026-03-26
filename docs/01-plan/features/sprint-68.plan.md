---
code: FX-PLAN-068
title: "Sprint 68 — F212 AX BD Discovery 스킬 체계 통합"
version: 1.0
status: Active
category: PLAN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 68
features: [F212]
req: [FX-REQ-204]
prd: docs/specs/axbd/AX_BD_COWORK_SETUP.md
depends-on: Sprint 67 (F209 AI Foundry 흡수 + F210 비밀번호 재설정)
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | AX BD팀의 2단계 발굴 프로세스(68개 스킬)가 Cowork 전용이라 Claude Code 환경에서 활용 불가. 팀원은 두 환경을 오가며 스킬을 수동 관리해야 함 |
| **Solution** | ai-biz 11스킬을 CC 스킬로 전환하고, 2-0~2-10 전체 프로세스를 오케스트레이팅하는 `ax-bd-discovery` 스킬을 신규 개발. AI/경영전략 16 프레임워크를 스킬 내 프롬프트로 내장 |
| **Function UX Effect** | `/ax-bd-discovery` 한 번의 호출로 5유형(I/M/P/T/S) 분류 → 강도 라우팅 → 단계별 분석 → 사업성 판단 → 패키징까지 CC 내에서 완결. 각 ai-biz 스킬도 `/ai-biz:moat-analysis` 등으로 독립 호출 가능 |
| **Core Value** | 듀얼 환경(Cowork+CC) 지원으로 팀 채택 장벽 해소. 프로세스 v8.2의 사업성 체크포인트 7단계 + Commit Gate + 누적 신호등을 자동 추적하여 사업 발굴 품질 일관성 확보 |

| 항목 | 값 |
|------|-----|
| Feature | F212 AX BD Discovery 스킬 체계 통합 |
| Sprint | 68 |
| PRD | AX_BD_COWORK_SETUP.md + AX_BD_SKILL_CLAUDE.md + AX_BD_SKILL_TABLE.md |
| 선행 조건 | Sprint 67 완료 (Phase 5d+5e ✅) |
| 코드 변경 대상 | 스킬 파일만 (API/Web/CLI 코드 변경 없음) |
| Worker 구성 | W1: ai-biz 11스킬 CC 전환, W2: 오케스트레이터 + 프레임워크 |

---

## 1. Feature 상세

### F212 — AX BD Discovery 스킬 체계 통합 (FX-REQ-204, P0)

**목표**: AX BD팀의 2단계 발굴 프로세스 v8.2를 Claude Code 스킬로 완전 구현하여, Cowork과 CC 양쪽에서 동일한 프로세스를 실행할 수 있게 함.

**배경**:
- 프로세스 v8.2: 5유형(I/M/P/T/S) 분류 + 강도 라우팅 + 사업성 체크포인트 7단계
- 현재: Cowork 전용 (ai-biz 플러그인 + pm-skills + 시스템 프롬프트)
- 목표: CC 스킬로 전환하여 개발자 환경에서도 동일 프로세스 실행 가능
- Cowork 플러그인은 병행 유지 (팀원별 선호 환경 존중)

**3가지 산출물 그룹**:

#### 그룹 A: ai-biz 11스킬 CC 전환

Cowork 플러그인의 11개 스킬을 CC 스킬 형태(SKILL.md)로 1:1 전환.

| # | 원본 (Cowork) | CC 스킬 디렉토리 | 용도 |
|---|---------------|-----------------|------|
| 1 | `ai-biz:build-vs-buy` | `ai-biz-build-vs-buy/` | Build vs Buy vs Partner 매트릭스 |
| 2 | `ai-biz:cost-model` | `ai-biz-cost-model/` | AI 원가 구조 분석 |
| 3 | `ai-biz:data-strategy` | `ai-biz-data-strategy/` | 데이터 확보/품질/파이프라인 전략 |
| 4 | `ai-biz:ecosystem-map` | `ai-biz-ecosystem-map/` | AI 생태계 맵핑 |
| 5 | `ai-biz:feasibility-study` | `ai-biz-feasibility-study/` | AI 사업 타당성 4축 평가 |
| 6 | `ai-biz:ir-deck` | `ai-biz-ir-deck/` | 투자심의/경영진 보고서 |
| 7 | `ai-biz:moat-analysis` | `ai-biz-moat-analysis/` | AI 경쟁 해자 분석 |
| 8 | `ai-biz:partner-scorecard` | `ai-biz-partner-scorecard/` | 기술 파트너 평가 |
| 9 | `ai-biz:pilot-design` | `ai-biz-pilot-design/` | PoC/파일럿 설계 |
| 10 | `ai-biz:regulation-check` | `ai-biz-regulation-check/` | AI 규제/컴플라이언스 체크 |
| 11 | `ai-biz:scale-playbook` | `ai-biz-scale-playbook/` | 파일럿→상용화 플레이북 |

**전환 규칙**:
- SKILL.md frontmatter: `name`, `description` 유지
- 프롬프트 본문: Cowork 원본 그대로 유지 (동일 출력 품질 보장)
- `$ARGUMENTS` 플레이스홀더 유지 (CC 스킬 인자 전달)
- 설치 위치: `.claude/skills/ai-biz/` (프로젝트 레벨)

#### 그룹 B: ax-bd-discovery 오케스트레이터 스킬

2-0 ~ 2-10 전체 프로세스를 단계적으로 안내하는 CC 스킬.

**핵심 기능**:
1. **2-0 사업 아이템 분류**: 자연어 대화 3턴 → I/M/P/T/S 유형 분류
2. **유형별 강도 라우팅**: 단계별 핵심/보통/간소 자동 결정
3. **단계 전환 관리**: `다음 단계로`, `현재 단계 요약`, `2-N 단계로 이동`
4. **사업성 체크포인트**: 2-1~2-7 매 단계 판단 질문 자동 출력
5. **2-5 Commit Gate**: 4개 심화 질문 순차 논의
6. **누적 신호등 추적**: Go/Pivot/Drop 이력 자동 기록
7. **2-8 패키징**: Discovery Summary 5문장 + 완료 게이트 체크리스트
8. **ai-biz 스킬 참조**: 각 단계에서 적절한 ai-biz 스킬 안내

**설치 위치**: `.claude/skills/ax-bd-discovery/`

**서브커맨드**:
| 커맨드 | 동작 |
|--------|------|
| `/ax-bd-discovery start [아이템명]` | 2-0 분류부터 시작 |
| `/ax-bd-discovery 2-N` | 특정 단계로 이동 |
| `/ax-bd-discovery status` | 전체 진행 상황 (완료/진행중/미착수) |
| `/ax-bd-discovery summary` | 현재까지 전체 산출물 정리 |

#### 그룹 C: AI/경영전략 16 프레임워크 프롬프트

`AX_BD_SKILL_CLAUDE.md`에 정의된 16개 프레임워크를 오케스트레이터 스킬 내부에 인라인 프롬프트로 내장.

| # | 프레임워크 | 출처 | 적용 단계 |
|---|-----------|------|----------|
| 1 | Value Chain Analysis | Porter (경영) | 2-1, 2-3 |
| 2 | AI 기회 매핑 | (자체) | 2-1 |
| 3 | Task-Based TAM | a16z/Sequoia (AI) | 2-2 |
| 4 | "Why Now" Timing Analysis | (자체) | 2-2 |
| 5 | Disruption Risk Analysis | (자체) | 2-3 |
| 6 | Imitation Difficulty Score | (자체) | 2-3 |
| 7 | a16z AI Value Chain | a16z (AI) | 2-4 |
| 8 | Three Horizons of Growth | McKinsey (경영) | 2-4 |
| 9 | BCG Growth-Share Matrix | BCG (경영) | 2-5 |
| 10 | NIST AI RMF | NIST (AI) | 2-5 |
| 11 | Gartner AI Maturity Model | Gartner (AI) | 2-6 |
| 12 | Data Flywheel | Andrew Ng (AI) | 2-7 |
| 13 | AI Margin Analysis | a16z (AI) | 2-7 |
| 14 | MIT Sloan AI Business Models | MIT (AI) | 2-7 |
| 15 | Balanced Scorecard | Kaplan/Norton (경영) | 2-8 |
| 16 | PwC AI Studio & ROI | PwC (AI) | 2-8 |

**참고**: 추가 4개 프레임워크(Agentic AI Process Redesign, AI Ethics Impact Assessment, McKinsey 7-S, WEF AI Workforce 5축)도 오케스트레이터 내 2-8/2-9/2-10 단계에 포함 → 총 20개 프레임워크 내장.

---

## 2. 파일 구조

### 전체 디렉토리 레이아웃

```
.claude/skills/
├── ai-biz/                          # 그룹 A: ai-biz 11스킬
│   ├── ai-biz-build-vs-buy/
│   │   └── SKILL.md
│   ├── ai-biz-cost-model/
│   │   └── SKILL.md
│   ├── ai-biz-data-strategy/
│   │   └── SKILL.md
│   ├── ai-biz-ecosystem-map/
│   │   └── SKILL.md
│   ├── ai-biz-feasibility-study/
│   │   └── SKILL.md
│   ├── ai-biz-ir-deck/
│   │   └── SKILL.md
│   ├── ai-biz-moat-analysis/
│   │   └── SKILL.md
│   ├── ai-biz-partner-scorecard/
│   │   └── SKILL.md
│   ├── ai-biz-pilot-design/
│   │   └── SKILL.md
│   ├── ai-biz-regulation-check/
│   │   └── SKILL.md
│   └── ai-biz-scale-playbook/
│       └── SKILL.md
├── ax-bd-discovery/                  # 그룹 B: 오케스트레이터
│   └── SKILL.md                     # 2-0~2-10 + 그룹 C 프레임워크 내장
└── npm-release/                      # (기존)
    └── SKILL.md
```

### 파일 수량 요약

| 그룹 | 파일 수 | 설명 |
|------|---------|------|
| A: ai-biz 스킬 | 11 SKILL.md | Cowork 원본 1:1 전환 |
| B: 오케스트레이터 | 1 SKILL.md | 2-0~2-10 프로세스 + 20 프레임워크 인라인 |
| **합계** | **12 파일** | 모두 `.claude/skills/` 하위 |

---

## 3. 기술 설계 요약

### 3.1 ai-biz 스킬 전환 (그룹 A)

**전환 방식**: 원본 SKILL.md를 그대로 복사하되, CC 스킬 규격에 맞게 frontmatter 보정.

```yaml
# CC 스킬 SKILL.md frontmatter 형식
---
name: moat-analysis
description: AI 경쟁 해자 분석 — 데이터/기술/네트워크 효과 평가
---
```

- Cowork 플러그인은 `skills/ai-biz-moat-analysis/SKILL.md` 구조
- CC 스킬은 `.claude/skills/ai-biz/ai-biz-moat-analysis/SKILL.md` 구조
- 프롬프트 본문 동일 → 양 환경에서 동일 출력 품질

### 3.2 오케스트레이터 스킬 (그룹 B)

**SKILL.md 구조**:

```markdown
---
name: ax-bd-discovery
description: AX BD 2단계 발굴 프로세스 오케스트레이터 — 5유형 분류, 강도 라우팅, 사업성 체크포인트
---

# AX BD 2단계 발굴 프로세스 (v8.2)

## 역할 정의
(AX_BD_COWORK_SETUP.md §역할 정의 인라인)

## 2-0. 사업 아이템 분류
(3턴 대화 프로토콜 + I/M/P/T/S 분류 로직)

## 유형별 강도 매트릭스
(AX_BD_COWORK_SETUP.md §유형별 분석 경로 테이블)

## 2-1 ~ 2-10 단계별 실행
(각 단계: 스킬 목록 + 프레임워크 프롬프트 인라인 + 사업성 질문)

## 사업성 판단 체크포인트
(7단계 질문 + 2-5 Commit Gate 4질문)

## 누적 신호등
(Go/Pivot/Drop 이력 추적 형식)

## 산출물 형식
(구조화된 출력 템플릿)

$ARGUMENTS
```

**크기 예상**: ~800줄 (AX_BD_COWORK_SETUP.md ~380줄 + AX_BD_SKILL_CLAUDE.md 프레임워크 발췌 ~350줄 + 오케스트레이션 로직 ~70줄)

### 3.3 프레임워크 내장 전략 (그룹 C)

프레임워크는 별도 스킬로 분리하지 않고 오케스트레이터 SKILL.md에 인라인으로 포함.

**이유**:
1. 프레임워크는 독립 호출보다 단계 컨텍스트 내에서 적용되어야 효과적
2. 별도 스킬로 분리하면 20개 추가 디렉토리 → 관리 복잡도 증가
3. 오케스트레이터가 유형별 강도에 따라 프레임워크 적용 여부를 판단해야 함

---

## 4. 리스크 & 완화

| # | 리스크 | 영향 | 완화 |
|---|--------|------|------|
| 1 | 오케스트레이터 SKILL.md가 ~800줄로 커서 CC 컨텍스트 윈도우 부담 | 중 | CC 스킬은 호출 시에만 로딩되므로 상시 부담 없음. 필요 시 단계별 분할 검토 |
| 2 | pm-skills는 CC에서 직접 호출 불가 (Cowork 전용) | 저 | 오케스트레이터가 pm-skills 프레임워크의 핵심 질문을 인라인 프롬프트로 내장하여 보완 |
| 3 | Cowork과 CC 버전 drift | 저 | 원본은 `docs/specs/axbd/` Git 관리, 양 환경 스킬은 동일 소스에서 생성 |
| 4 | 사업성 신호등 상태 영속화 불가 (CC 스킬은 stateless) | 중 | 대화 컨텍스트 내에서 추적. 장기 영속화는 Sprint 69 API 확장에서 해결 |

---

## 5. Worker 파일 매핑

### W1: ai-biz 11스킬 CC 전환 (그룹 A)

**수정/생성 파일**:
- `.claude/skills/ai-biz/ai-biz-build-vs-buy/SKILL.md` (신규)
- `.claude/skills/ai-biz/ai-biz-cost-model/SKILL.md` (신규)
- `.claude/skills/ai-biz/ai-biz-data-strategy/SKILL.md` (신규)
- `.claude/skills/ai-biz/ai-biz-ecosystem-map/SKILL.md` (신규)
- `.claude/skills/ai-biz/ai-biz-feasibility-study/SKILL.md` (신규)
- `.claude/skills/ai-biz/ai-biz-ir-deck/SKILL.md` (신규)
- `.claude/skills/ai-biz/ai-biz-moat-analysis/SKILL.md` (신규)
- `.claude/skills/ai-biz/ai-biz-partner-scorecard/SKILL.md` (신규)
- `.claude/skills/ai-biz/ai-biz-pilot-design/SKILL.md` (신규)
- `.claude/skills/ai-biz/ai-biz-regulation-check/SKILL.md` (신규)
- `.claude/skills/ai-biz/ai-biz-scale-playbook/SKILL.md` (신규)

### W2: 오케스트레이터 + 프레임워크 (그룹 B + C)

**수정/생성 파일**:
- `.claude/skills/ax-bd-discovery/SKILL.md` (신규)

---

## 6. 테스트 계획

이번 Sprint는 API/코드 변경이 아닌 CC 스킬 파일 생성이므로, 기존 테스트 영향 없음.

**검증 방법**:

| # | 검증 항목 | 방법 | 기준 |
|---|----------|------|------|
| 1 | ai-biz 스킬 11개 호출 가능 | CC에서 `/ai-biz:moat-analysis 테스트` 호출 | 프롬프트 로딩 + 분석 출력 확인 |
| 2 | 오케스트레이터 시작 | `/ax-bd-discovery start 테스트 아이템` | 2-0 분류 대화 시작 |
| 3 | 유형별 강도 라우팅 | Type T 선택 후 2-1 진입 | 2-1이 "핵심" 강도로 실행 |
| 4 | 사업성 체크포인트 | 2-1 완료 후 | 사업성 질문 자동 출력 |
| 5 | Commit Gate | 2-5 완료 후 | 4개 심화 질문 순차 출력 |
| 6 | 누적 신호등 | 여러 단계 Go/Pivot 후 | 이력 요약 정확 |
| 7 | 기존 테스트 회귀 없음 | `turbo test` | 전체 pass |
| 8 | typecheck 통과 | `turbo typecheck` | 0 errors |

---

## 7. 완료 기준

- [ ] ai-biz 11스킬 CC 전환 완료 (`.claude/skills/ai-biz/` 하위 11개 SKILL.md)
- [ ] ax-bd-discovery 오케스트레이터 스킬 생성 (`.claude/skills/ax-bd-discovery/SKILL.md`)
- [ ] 20개 프레임워크 프롬프트 오케스트레이터에 내장
- [ ] 5유형(I/M/P/T/S) 분류 로직 + 강도 매트릭스 구현
- [ ] 사업성 체크포인트 7단계 + Commit Gate 4질문 포함
- [ ] 누적 신호등(Go/Pivot/Drop) 추적 형식 포함
- [ ] 기존 테스트 회귀 없음 (turbo test pass)
- [ ] typecheck + lint 통과

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-26 | Initial draft | Sinclair Seo (AI-assisted) |
