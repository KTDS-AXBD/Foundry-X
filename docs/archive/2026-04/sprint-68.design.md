---
code: FX-DSGN-068
title: "Sprint 68 Design — F212 AX BD Discovery 스킬 체계 통합"
version: 1.0
status: Active
category: DSGN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 68
features: [F212]
req: [FX-REQ-204]
plan: "[[FX-PLAN-068]]"
---

## Executive Summary

| 관점 | 결과 |
|------|------|
| **Match Rate 목표** | 95% (스킬 파일 전환이므로 높은 정확도 가능) |
| **신규 파일** | 12 (ai-biz SKILL.md 11 + 오케스트레이터 SKILL.md 1) |
| **수정 파일** | 0 (API/Web/CLI 코드 변경 없음) |
| **총 산출물 줄 수** | ~1,400줄 (ai-biz 602줄 + 오케스트레이터 ~800줄) |

---

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────────┐
│  .claude/skills/                                     │
│                                                      │
│  ax-bd-discovery/SKILL.md  ← 오케스트레이터 (2-0~2-10)│
│    ├─ 5유형 분류 (I/M/P/T/S)                          │
│    ├─ 강도 라우팅 매트릭스                               │
│    ├─ 사업성 체크포인트 7단계 + Commit Gate              │
│    ├─ 20 프레임워크 인라인 프롬프트                       │
│    └─ ai-biz 스킬 참조 안내                             │
│                                                      │
│  ai-biz/                   ← 11 독립 스킬              │
│    ├─ ai-biz-moat-analysis/SKILL.md                   │
│    ├─ ai-biz-feasibility-study/SKILL.md               │
│    ├─ ai-biz-cost-model/SKILL.md                      │
│    ├─ ai-biz-build-vs-buy/SKILL.md                    │
│    ├─ ai-biz-data-strategy/SKILL.md                   │
│    ├─ ai-biz-ecosystem-map/SKILL.md                   │
│    ├─ ai-biz-ir-deck/SKILL.md                         │
│    ├─ ai-biz-partner-scorecard/SKILL.md               │
│    ├─ ai-biz-pilot-design/SKILL.md                    │
│    ├─ ai-biz-regulation-check/SKILL.md                │
│    └─ ai-biz-scale-playbook/SKILL.md                  │
│                                                      │
│  npm-release/SKILL.md      ← (기존)                    │
└─────────────────────────────────────────────────────┘

호출 관계:
  사용자 ──▶ /ax-bd-discovery start [아이템]
              │
              ├── 2-0: 3턴 분류 대화
              ├── 2-1: "레퍼런스 분석에 /ai-biz:ecosystem-map 사용 가능"
              ├── 2-3: "경쟁분석에 /ai-biz:moat-analysis 사용 가능"
              ├── ...
              └── 2-10: 최종 패키징

  사용자 ──▶ /ai-biz:moat-analysis [아이템]
              └── 독립 실행 (오케스트레이터 없이)
```

---

## 2. ai-biz 11스킬 CC 전환 상세 (그룹 A)

### 2.1 전환 규칙

**원본 위치**: `docs/specs/axbd/ai-biz-plugin/skills/{name}/SKILL.md`
**대상 위치**: `.claude/skills/ai-biz/{name}/SKILL.md`

**전환 작업**:
1. 원본 SKILL.md 내용을 그대로 복사
2. frontmatter `name`, `description` 유지 (CC 스킬 규격과 동일)
3. `$ARGUMENTS` 플레이스홀더 유지
4. 변경 없이 1:1 복사 (프롬프트 품질 보장)

### 2.2 스킬별 상세

| # | 스킬명 | 줄 수 | 핵심 출력물 |
|---|--------|------|-----------|
| 1 | `build-vs-buy` | 47 | 5-Factor 매트릭스, 종합 판정 |
| 2 | `cost-model` | 49 | AI 원가 4축 분석, 월간/연간 비용 추정 |
| 3 | `data-strategy` | 48 | 데이터 파이프라인 설계, 품질 기준 |
| 4 | `ecosystem-map` | 51 | 밸류체인 맵, 경쟁구도 시각화 |
| 5 | `feasibility-study` | 51 | 4축 타당성 점수, Go/Hold/Drop 권고 |
| 6 | `ir-deck` | 75 | 10섹션 사업계획서, 투자 포인트 |
| 7 | `moat-analysis` | 62 | 5유형 해자 평가표, 구축 로드맵 |
| 8 | `partner-scorecard` | 48 | 파트너 4축 평가, 제휴 전략 |
| 9 | `pilot-design` | 51 | PoC 설계, 성공/실패 기준 |
| 10 | `regulation-check` | 52 | 규제 체크리스트, 리스크 수준 |
| 11 | `scale-playbook` | 68 | 4단계 스케일업 로드맵 |

---

## 3. ax-bd-discovery 오케스트레이터 상세 (그룹 B+C)

### 3.1 SKILL.md 구조

```markdown
---
name: ax-bd-discovery
description: AX BD 2단계 발굴 프로세스 오케스트레이터 (v8.2) — 5유형 분류,
  11단계 분석, 사업성 체크포인트, 68스킬 통합 가이드
---

# [섹션 1] 역할 정의 & 핵심 원칙           (~30줄)
# [섹션 2] 2-0 사업 아이템 분류             (~80줄)
#   - AX BD팀 미션 컨텍스트
#   - Turn 1/2/3 대화 프로토콜
#   - 분류 결과 테이블 (I/M/P/T/S)
# [섹션 3] 유형별 강도 매트릭스              (~25줄)
#   - 7단계 × 5유형 핵심/보통/간소 테이블
# [섹션 4] 2-1 ~ 2-7 유형별 단계            (~300줄)
#   - 각 단계: 적용 스킬 + 프레임워크 + 사업성 질문
#   - 인라인 프레임워크 프롬프트 (20개)
# [섹션 5] 2-5 Commit Gate                  (~25줄)
#   - 4개 심화 질문
# [섹션 6] 2-8 ~ 2-10 공통 단계             (~60줄)
#   - 패키징 + 멀티페르소나 + 팀 공유
# [섹션 7] 사업성 판단 체크포인트 종합       (~30줄)
#   - 누적 신호등 형식
# [섹션 8] 단계 전환 명령                    (~15줄)
# [섹션 9] 산출물 형식                       (~30줄)
# [부록] 프레임워크 상세 프롬프트             (~200줄)
#   - 20개 프레임워크 인라인 (압축)
```

### 3.2 유형별 강도 매트릭스 (오케스트레이터 핵심 로직)

오케스트레이터가 2-0에서 유형이 결정되면, 이 매트릭스에 따라 각 단계의 분석 깊이를 조정:

```
| 단계 | I | M | P | T | S |
|------|---|---|---|---|---|
| 2-1  | 간 | 보 | 간 | 핵 | 핵 |
| 2-2  | 핵 | 핵 | 핵 | 핵 | 간 |
| 2-3  | 보 | 핵 | 핵 | 핵 | 핵 |
| 2-4  | 핵 | 보 | 핵 | 핵 | 핵 |
| 2-5  | 핵 | 핵 | 핵 | 핵 | 보 |
| 2-6  | 핵 | 핵 | 핵 | 보 | 보 |
| 2-7  | 보 | 보 | 핵 | 보 | 핵 |
```

**강도별 행동**:
- **핵심**: 모든 관련 스킬/프레임워크를 적용하고 상세 분석
- **보통**: 주요 스킬만 적용, 표준 수준 분석
- **간소**: 핵심 발견 3~5개 bullet으로 축약

### 3.3 프레임워크 인라인 전략

20개 프레임워크를 오케스트레이터에 인라인할 때, 각 프레임워크를 **압축 형태**로 포함:

```markdown
#### Porter Value Chain Analysis
> 1차 활동: 내부물류→운영→외부물류→마케팅영업→서비스
> 지원 활동: 인프라, HRM, 기술개발, 조달
> 적용: 레퍼런스 가치사슬 분해 → KT DS 대체·보강 영역 도출
```

- 원본(`AX_BD_SKILL_CLAUDE.md`)의 상세 프롬프트(코드블록 포함)를 **30~40%로 압축**
- 핵심 질문과 적용 방법만 유지
- 출처 참조는 보존

### 3.4 사업성 체크포인트 설계

```markdown
## 사업성 판단 체크포인트

각 단계 분석 완료 후 AI가 자동으로 질문:

| 단계 | 질문 | 판단 |
|------|------|------|
| 2-1 후 | "우리가 뭔가 다르게 할 수 있는 부분이 보이나요?" | Go/Pivot/Drop |
| 2-2 후 | "우리 팀이 이걸 지금 추진할 만한 이유가 있나요?" | Go/시장재정의/Drop |
| 2-3 후 | "우리만의 자리가 있을까요?" | Go/포지셔닝재검토/Drop |
| 2-4 후 | "30초로 설명하면 듣는 사람이 고개를 끄덕일까요?" | Go/아이템재도출/Drop |
| 2-5 후 | (Commit Gate 4질문) | Commit/대안탐색/Drop |
| 2-6 후 | "이 고객이 진짜 존재하고 이 문제를 겪고 있다는 확신?" | Go/고객재정의/Drop |
| 2-7 후 | "이 BM으로 돈을 벌 수 있다고 믿나요?" | Go/BM재설계/Drop |

누적 기록: 🟢Go N회 · 🟡Pivot N회 · 🔴Drop N회
```

---

## 4. 구현 순서

### Phase 1: ai-biz 11스킬 복사 (W1, ~15분)

1. `.claude/skills/ai-biz/` 디렉토리 생성
2. `docs/specs/axbd/ai-biz-plugin/skills/` 원본 11개를 1:1 복사
3. 각 스킬 호출 테스트

### Phase 2: 오케스트레이터 SKILL.md 작성 (W2, ~30분)

1. `.claude/skills/ax-bd-discovery/` 디렉토리 생성
2. SKILL.md 작성:
   - 섹션 1: 역할 정의 (AX_BD_COWORK_SETUP.md §역할 인용)
   - 섹션 2: 2-0 분류 프로토콜 (3턴 대화 + 5유형)
   - 섹션 3: 강도 매트릭스 (7×5 테이블)
   - 섹션 4: 2-1~2-7 단계별 (스킬 목록 + 프레임워크 + 사업성 질문)
   - 섹션 5: 2-5 Commit Gate (4질문)
   - 섹션 6: 2-8~2-10 (패키징 + 평가 + 팀 공유)
   - 섹션 7: 사업성 판단 종합 (누적 신호등)
   - 섹션 8: 단계 전환 명령
   - 섹션 9: 산출물 형식 템플릿
   - 부록: 프레임워크 압축 프롬프트 20개
3. 오케스트레이터 호출 테스트

### Phase 3: 통합 검증 (~10분)

1. `turbo typecheck` — 기존 코드 영향 없음 확인
2. `turbo test` — 기존 테스트 회귀 없음 확인
3. 전체 스킬 목록 확인 (`ls .claude/skills/`)

---

## 5. Worker 파일 매핑

### W1: ai-biz 11스킬 CC 전환

**소스 → 대상 매핑**:

| 소스 (docs/specs/axbd/ai-biz-plugin/skills/) | 대상 (.claude/skills/ai-biz/) |
|----------------------------------------------|-------------------------------|
| `ai-biz-build-vs-buy/SKILL.md` | `ai-biz-build-vs-buy/SKILL.md` |
| `ai-biz-cost-model/SKILL.md` | `ai-biz-cost-model/SKILL.md` |
| `ai-biz-data-strategy/SKILL.md` | `ai-biz-data-strategy/SKILL.md` |
| `ai-biz-ecosystem-map/SKILL.md` | `ai-biz-ecosystem-map/SKILL.md` |
| `ai-biz-feasibility-study/SKILL.md` | `ai-biz-feasibility-study/SKILL.md` |
| `ai-biz-ir-deck/SKILL.md` | `ai-biz-ir-deck/SKILL.md` |
| `ai-biz-moat-analysis/SKILL.md` | `ai-biz-moat-analysis/SKILL.md` |
| `ai-biz-partner-scorecard/SKILL.md` | `ai-biz-partner-scorecard/SKILL.md` |
| `ai-biz-pilot-design/SKILL.md` | `ai-biz-pilot-design/SKILL.md` |
| `ai-biz-regulation-check/SKILL.md` | `ai-biz-regulation-check/SKILL.md` |
| `ai-biz-scale-playbook/SKILL.md` | `ai-biz-scale-playbook/SKILL.md` |

### W2: 오케스트레이터 + 프레임워크

**생성 파일**:
- `.claude/skills/ax-bd-discovery/SKILL.md` (신규, ~800줄)

**참조 소스** (읽기 전용):
- `docs/specs/axbd/AX_BD_COWORK_SETUP.md` — 프로세스 정의, 단계별 흐름
- `docs/specs/axbd/AX_BD_SKILL_CLAUDE.md` — 프레임워크 상세 프롬프트
- `docs/specs/axbd/AX_BD_SKILL_TABLE.md` — 스킬 매핑표

---

## 6. 완료 기준

- [ ] `.claude/skills/ai-biz/` 하위 11개 스킬 디렉토리 + SKILL.md 생성
- [ ] `.claude/skills/ax-bd-discovery/SKILL.md` 생성 (~800줄)
- [ ] 오케스트레이터에 5유형 분류 + 강도 매트릭스 포함
- [ ] 20개 프레임워크 인라인 (압축 형태)
- [ ] 사업성 체크포인트 7단계 + Commit Gate 4질문
- [ ] 누적 신호등 추적 형식
- [ ] 기존 테스트 회귀 없음
- [ ] typecheck + lint 통과

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-26 | Initial draft | Sinclair Seo (AI-assisted) |
