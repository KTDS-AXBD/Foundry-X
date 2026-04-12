---
code: FX-PLAN-053
title: Sprint 53 — Discovery 9기준 체크리스트 + pm-skills 가이드 + PRD 자동생성 (F183~F185)
version: 0.1
status: Draft
category: PLAN
created: 2026-03-24
updated: 2026-03-24
author: Sinclair Seo
---

# Sprint 53 Planning Document

> **Summary**: Discovery 9개 완료기준 체크리스트로 분석 완료를 게이팅하고, pm-skills 실행 가이드+컨텍스트 자동 전달로 분석 프로세스를 안내하며, 9기준 충족 시 분석 결과→PRD 템플릿 자동 매핑을 구현한다.
>
> **Project**: Foundry-X
> **Version**: Sprint 53 (api 0.1.0)
> **Author**: Sinclair Seo
> **Date**: 2026-03-24
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | F182로 "어디서 시작하지?"는 해결했지만, 분석 경로를 따라가도 "9개 기준을 다 충족했나?", "이 스킬은 어떻게 실행하지?", "분석 끝나면 PRD는 어떻게 만들지?"에 대한 답이 없다. 담당자가 분석을 완주해도 완료 판단이 주관적이고, 스킬 간 데이터가 연결되지 않아 같은 정보를 반복 입력하게 된다. |
| **Solution** | F183: 9기준 체크리스트 서비스 + 미달성 시 루프백/재분석 안내. F184: 18개 pm-skills 단계별 실행 가이드 + 분석 컨텍스트 저장/전달 자동화. F185: 9기준 충족 시 분석 결과→PRD 템플릿 자동 매핑 + PRD 생성 API. |
| **Function/UX Effect** | 대시보드에서 9개 기준 진행률 바를 실시간으로 확인 → 각 단계에서 "다음: /market-scan 실행" 가이드 + 이전 단계 결과 자동 첨부 → 9/9 달성 시 "PRD 생성" 버튼 활성화 → 원클릭 PRD 생성. |
| **Core Value** | "분석 완주율 100% + PRD 품질 일관성" — 초급 담당자도 9기준을 빠짐없이 충족하고, 일관된 품질의 PRD를 자동 산출할 수 있다. 분석 소요 시간 1~2일 → 0.5일 목표. |

---

## 1. Overview

### 1.1 Purpose

BDP-002 PRD §4.1 #3(9기준 체크리스트+예외처리), #4(pm-skills 실행 가이드), #5(PRD 자동생성), #6(예외처리/루프백), #7(분석 컨텍스트 관리)을 Foundry-X API + 대시보드에 구현한다.

### 1.2 Background

- **F182 (Sprint 52, ✅)**: 5시작점 분류 + 분석 경로 정적 데이터 완성
  - `StartingPointClassifier` 서비스, `analysis-paths.ts` (5경로 × 단계 × pmSkills 매핑)
  - `biz_item_starting_points` 테이블, 3개 API 엔드포인트
  - 대시보드: 시작점 배지 + 경로 스텝퍼 UI
- **기존 인프라**:
  - ✅ `biz_items` + `biz_item_starting_points` 테이블 (0033, 0035 마이그레이션)
  - ✅ `analysis-paths.ts`: 이미 `discoveryMapping: number[]` 필드로 9기준 매핑 존재
  - ✅ `AgentRunner` (LLM 호출 래퍼)
  - ✅ `biz-items` 라우트 (7 엔드포인트)
- **빠진 부분**:
  - ❌ 9기준 체크리스트 상태 저장/조회/업데이트 (F183)
  - ❌ pm-skills 실행 가이드 + 컨텍스트 저장/전달 (F184)
  - ❌ PRD 자동 생성 로직 (F185)

### 1.3 Related Documents

- SPEC.md §5: F183 (FX-REQ-183, P0), F184 (FX-REQ-184, P0), F185 (FX-REQ-185, P0)
- [[FX-SPEC-BDP-002-PRD]]: `docs/specs/bizdevprocess-2/prd-final.md` §4.1 #3~#7, 부록 B
- [[FX-SPEC-BDP-001]]: `docs/specs/bizdevprocess/AX-Discovery-Process-v0.8-summary.md`
- Sprint 52 Plan: `docs/01-plan/features/sprint-52.plan.md`

---

## 2. Scope

### 2.1 In Scope

#### F183: Discovery 9기준 체크리스트 + 예외처리

| # | 항목 | 설명 |
|---|------|------|
| 1 | **Discovery 9기준 데이터 모델** | 9개 완료기준 정의 (BDP-002 부록 B 기반) — 정적 데이터 + D1 진행 상태 |
| 2 | **D1 스키마 확장** | `biz_discovery_criteria` 테이블 — 아이템별 9기준 충족 상태 저장 |
| 3 | **체크리스트 API** | `GET /biz-items/:id/discovery-criteria` (조회), `PATCH /biz-items/:id/discovery-criteria/:criterionId` (업데이트) |
| 4 | **자동 매핑** | `analysis-paths.ts`의 `discoveryMapping`에서 각 단계 완료 시 관련 기준 자동 체크 제안 |
| 5 | **미달성 루프백** | 9기준 중 미충족 항목 감지 → 재분석 안내 메시지 + 보완 입력 유도 |
| 6 | **게이트 로직** | 9/9 충족 시에만 PRD 생성 단계 진입 허용 (7/9 이상이면 미충족 별도 표시 후 진행 가능) |

#### F184: pm-skills 실행 가이드 + 컨텍스트 관리

| # | 항목 | 설명 |
|---|------|------|
| 1 | **pm-skills 가이드 데이터** | 18개 스킬별 실행 안내 (목적, 입력 예시, 출력 기대값, 팁) — 정적 데이터 |
| 2 | **D1 스키마 확장** | `biz_analysis_contexts` 테이블 — 단계별 분석 결과(텍스트) 저장 |
| 3 | **컨텍스트 저장 API** | `POST /biz-items/:id/analysis-context` — 단계별 분석 결과 저장 |
| 4 | **컨텍스트 조회 API** | `GET /biz-items/:id/analysis-context` — 전체 분석 컨텍스트 조회 |
| 5 | **다음 단계 가이드 API** | `GET /biz-items/:id/next-guide` — 현재 진행 상태 기반 다음 실행할 pm-skills + 이전 단계 데이터 자동 포함 |
| 6 | **컨텍스트 자동 전달** | 다음 단계 가이드에 이전 단계 분석 결과를 자동 첨부하여 pm-skills 프롬프트에 복사 가능 |

#### F185: PRD 자동 생성

| # | 항목 | 설명 |
|---|------|------|
| 1 | **PRD 템플릿 정의** | BDP-002 §4.1 #5 기반 PRD 템플릿 — 9기준 항목별 섹션 매핑 |
| 2 | **PRD 생성 서비스** | 9기준 충족 데이터 + 분석 컨텍스트를 PRD 템플릿에 매핑하는 로직 |
| 3 | **LLM 보강** | 템플릿 매핑 후 LLM으로 문장 다듬기 + 누락 보완 (AgentRunner 활용) |
| 4 | **PRD 생성 API** | `POST /biz-items/:id/generate-prd` — 9기준 게이트 통과 후 PRD 마크다운 반환 |
| 5 | **PRD 조회/이력** | `GET /biz-items/:id/prd` — 생성된 PRD 조회 + 버전 이력 |

### 2.2 Out of Scope

| 항목 | 사유 |
|------|------|
| 다중 AI 검토 (F186) | P1 — Sprint 54+ |
| 멀티 페르소나 평가 (F187) | P1 — Sprint 54+ |
| Six Hats 토론 (F188) | P2 |
| 진행률 대시보드 시각화 (F189) | P2 — 이번 Sprint에서 API만 제공, 대시보드 UI는 기본 수준 |
| 외부 데이터 API 연동 (F190) | P2 |

---

## 3. Architecture

### 3.1 서비스 구조

```
packages/api/src/
├── services/
│   ├── discovery-criteria.ts       # [NEW] F183: 9기준 체크리스트 서비스
│   ├── pm-skills-guide.ts          # [NEW] F184: pm-skills 가이드 정적 데이터 + 로직
│   ├── analysis-context.ts         # [NEW] F184: 분석 컨텍스트 CRUD
│   ├── prd-generator.ts            # [NEW] F185: PRD 생성 서비스
│   ├── prd-template.ts             # [NEW] F185: PRD 템플릿 정의
│   ├── starting-point-classifier.ts  # [EXIST] F182
│   ├── analysis-paths.ts             # [EXIST] F182 — discoveryMapping 활용
│   └── agent-runner.ts               # [EXIST] LLM 래퍼
├── schemas/
│   ├── discovery-criteria.ts       # [NEW] F183: Zod 스키마
│   ├── analysis-context.ts         # [NEW] F184: Zod 스키마
│   └── prd.ts                      # [NEW] F185: Zod 스키마
├── routes/
│   └── biz-items.ts                # [MODIFY] F183~F185 엔드포인트 추가
└── db/migrations/
    ├── 0036_discovery_criteria.sql  # [NEW] F183
    └── 0037_analysis_contexts.sql   # [NEW] F184 + F185
```

### 3.2 D1 스키마

#### 0036_discovery_criteria.sql (F183)

```sql
CREATE TABLE IF NOT EXISTS biz_discovery_criteria (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  criterion_id INTEGER NOT NULL CHECK (criterion_id BETWEEN 1 AND 9),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'needs_revision')),
  evidence TEXT,              -- 충족 근거 (분석 결과 요약)
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE,
  UNIQUE(biz_item_id, criterion_id)
);

CREATE INDEX idx_discovery_criteria_item ON biz_discovery_criteria(biz_item_id);
```

#### 0037_analysis_contexts.sql (F184 + F185)

```sql
CREATE TABLE IF NOT EXISTS biz_analysis_contexts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  pm_skill TEXT NOT NULL,           -- 실행한 pm-skill 이름 (예: '/market-scan')
  input_summary TEXT,               -- 입력 요약
  output_text TEXT NOT NULL,        -- 분석 결과 텍스트
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_analysis_contexts_item ON biz_analysis_contexts(biz_item_id);

CREATE TABLE IF NOT EXISTS biz_generated_prds (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,            -- PRD 마크다운
  criteria_snapshot TEXT,           -- 생성 시점 9기준 상태 JSON
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_generated_prds_item ON biz_generated_prds(biz_item_id);
```

### 3.3 데이터 흐름

```
[사업 아이템 등록]
       ↓
[F182] 5시작점 분류 → analysis-paths.ts 경로 결정
       ↓
[F184] 경로 Step 1 실행 → pm-skills 가이드 제공 + 컨텍스트 저장
       ↓ (반복)
[F184] Step N 실행 → 이전 컨텍스트 자동 첨부 + 결과 저장
       ↓ (각 Step 완료 시)
[F183] discoveryMapping으로 9기준 자동 체크 제안
       ↓
[F183] 9기준 진행률 확인 → 미달성 시 루프백 안내
       ↓ (9/9 또는 7/9+ 달성)
[F185] PRD 생성 → 분석 컨텍스트 + 9기준 evidence → PRD 템플릿 매핑 → LLM 보강
       ↓
[F185] PRD 마크다운 반환 + 이력 저장
```

### 3.4 API 엔드포인트 목록 (신규 8개)

| Method | Path | F-item | 설명 |
|--------|------|--------|------|
| GET | `/biz-items/:id/discovery-criteria` | F183 | 9기준 체크리스트 조회 |
| PATCH | `/biz-items/:id/discovery-criteria/:criterionId` | F183 | 기준 상태 업데이트 |
| POST | `/biz-items/:id/analysis-context` | F184 | 분석 컨텍스트 저장 |
| GET | `/biz-items/:id/analysis-context` | F184 | 분석 컨텍스트 조회 |
| GET | `/biz-items/:id/next-guide` | F184 | 다음 단계 가이드 |
| POST | `/biz-items/:id/generate-prd` | F185 | PRD 자동 생성 |
| GET | `/biz-items/:id/prd` | F185 | 생성된 PRD 조회 |
| GET | `/biz-items/:id/prd/:version` | F185 | PRD 특정 버전 조회 |

---

## 4. Discovery 9기준 상세 (BDP-002 부록 B)

| # | 항목 | 완료 조건 | pm-skills 매핑 |
|---|------|----------|---------------|
| 1 | 문제/고객 정의 | 고객 세그먼트 1개+ + 문제 1문장 (JTBD) | /interview, /research-users |
| 2 | 시장 기회 | SOM 시장 규모 수치 + 연간 성장률 + why now 1개 | /market-scan |
| 3 | 경쟁 환경 | 직접 경쟁사 3개+ + 차별화 포지셔닝 | /competitive-analysis |
| 4 | 가치 제안 가설 | JTBD 1문장 + 차별화 1가지 | /value-proposition |
| 5 | 수익 구조 가설 | 과금 모델 + WTP 추정 + 유닛 이코노믹스 초안 | /business-model |
| 6 | 핵심 리스크 가정 | 우선순위 가정 목록 + 각 검증 방법·기준 | /pre-mortem |
| 7 | 규제/기술 제약 | 규제 목록 + 대응 방향 (없으면 '없음' 명시) | /market-scan |
| 8 | 차별화 근거 | 지속 가능한 우위 요소 2가지+ + 모방 난이도 | /competitive-analysis, /value-proposition |
| 9 | 검증 실험 계획 | 최소 실험 3개 + 성공/실패 판단 기준 | /pre-mortem |

### 4.1 게이트 로직

- **9/9 충족**: PRD 생성 버튼 활성화 (정상 흐름)
- **7~8/9 충족**: 미충족 항목 경고 표시 + "보완 없이 진행" 옵션 (담당자 판단)
- **6/9 이하**: PRD 생성 차단 + 미충족 항목별 보완 가이드 제공
- **needs_revision**: 특정 기준이 충족 후 관련 분석이 변경되면 재검토 필요 상태로 전환

---

## 5. pm-skills 가이드 데이터 (F184)

### 5.1 18개 스킬 목록 (pm-skills 플러그인)

| 카테고리 | 스킬명 | 설명 | 관련 9기준 |
|----------|--------|------|-----------|
| 리서치 | /interview | 고객 인터뷰 설계 + 분석 | 1 |
| 리서치 | /research-users | 사용자 리서치 + 세그먼트 | 1 |
| 시장 | /market-scan | 시장 규모 + 트렌드 분석 | 2, 7 |
| 경쟁 | /competitive-analysis | 경쟁사 분석 + 포지셔닝 | 3, 8 |
| 전략 | /strategy | 전략 수립 + 우선순위 결정 | 4, 6 |
| 가치 | /value-proposition | 가치 제안 설계 | 4, 8 |
| BM | /business-model | 비즈니스 모델 캔버스 | 5 |
| 리스크 | /pre-mortem | 사전 부검 + 리스크 식별 | 6, 9 |
| 아이디에이션 | /brainstorm | 아이디어 발산 + 수렴 | — |
| 세그먼트 | /beachhead-segment | 비치헤드 시장 선정 | 1, 3 |
| (기타 8개) | /prioritize, /roadmap, ... | 우선순위, 로드맵 등 | — |

### 5.2 가이드 구조 (각 스킬별)

```typescript
interface PmSkillGuide {
  skill: string;           // '/market-scan'
  name: string;            // '시장 규모 + 트렌드 분석'
  purpose: string;         // '이 스킬을 왜 실행하는지'
  inputExample: string;    // '예시 입력 프롬프트'
  expectedOutput: string;  // '기대되는 출력 형식'
  tips: string[];          // '초급자를 위한 팁'
  relatedCriteria: number[]; // [2, 7]
}
```

---

## 6. PRD 템플릿 매핑 (F185)

### 6.1 PRD 섹션 ↔ 9기준 매핑

| PRD 섹션 | 9기준 소스 | 자동 매핑 방식 |
|----------|-----------|-------------|
| 1. 요약 | 전체 | LLM 요약 (전체 컨텍스트) |
| 2. 문제 정의 | #1 문제/고객 정의 | evidence + 분석 컨텍스트(/interview, /research-users 결과) |
| 3. 타겟 고객 | #1 문제/고객 정의 | 세그먼트 + 페르소나 + JTBD |
| 4. 시장 기회 | #2 시장 기회 | SOM/TAM + 성장률 + why now |
| 5. 경쟁 환경 | #3 경쟁 환경, #8 차별화 | 경쟁사 목록 + 포지셔닝 + 차별화 근거 |
| 6. 가치 제안 | #4 가치 제안 | JTBD 문장 + 차별화 |
| 7. 수익 구조 | #5 수익 구조 | 과금 모델 + 유닛 이코노믹스 |
| 8. 리스크 & 제약 | #6 리스크, #7 규제/기술 | 리스크 목록 + 규제 + 대응 |
| 9. 검증 계획 | #9 검증 실험 | 실험 목록 + 판단 기준 |
| 10. 오픈 이슈 | LLM 분석 | 미충족/보완 필요 항목 자동 추출 |

### 6.2 생성 흐름

1. 9기준 충족 데이터 수집 (`biz_discovery_criteria` → evidence)
2. 분석 컨텍스트 수집 (`biz_analysis_contexts` → 단계별 결과)
3. PRD 템플릿 섹션별 데이터 매핑
4. LLM 호출: 매핑된 데이터를 문장으로 다듬기 + 누락 보완
5. PRD 마크다운 반환 + `biz_generated_prds`에 저장

---

## 7. Implementation Plan

### 7.1 구현 순서

| 순서 | 항목 | F-item | 예상 테스트 |
|------|------|--------|-----------|
| 1 | D1 마이그레이션 0036, 0037 | F183, F184 | — |
| 2 | `discovery-criteria.ts` 서비스 + 9기준 정적 데이터 | F183 | ~12 tests |
| 3 | `discovery-criteria.ts` Zod 스키마 | F183 | — |
| 4 | 9기준 API (GET + PATCH) + 게이트 로직 | F183 | ~8 tests |
| 5 | `pm-skills-guide.ts` 정적 가이드 데이터 | F184 | ~6 tests |
| 6 | `analysis-context.ts` 서비스 | F184 | ~8 tests |
| 7 | 컨텍스트 API (POST + GET) + 다음 단계 가이드 API | F184 | ~10 tests |
| 8 | `prd-template.ts` PRD 템플릿 정의 | F185 | ~4 tests |
| 9 | `prd-generator.ts` 서비스 (매핑 + LLM 보강) | F185 | ~8 tests |
| 10 | PRD 생성 API (POST + GET) | F185 | ~6 tests |
| 11 | 대시보드 UI (9기준 진행률 + 가이드 패널 + PRD 뷰어) | F183~185 | ~6 Web tests |
| **합계** | | | **~68 tests** |

### 7.2 Worker 분배 (Agent Team 2-Worker)

| Worker | 담당 | 범위 |
|--------|------|------|
| Worker 1 | F183 + F184 (백엔드) | 순서 1~7 (서비스 + API + 마이그레이션) |
| Worker 2 | F185 (백엔드) + 대시보드 UI | 순서 8~11 (PRD 생성 + Web 컴포넌트) |

> Worker 2는 Worker 1의 마이그레이션(순서 1)과 9기준 서비스(순서 2)에 의존하므로, 순서 1~2 완료 후 병렬 시작.

---

## 8. Testing Strategy

### 8.1 API 테스트

- **단위 테스트**: 서비스 로직 (9기준 게이트, 컨텍스트 CRUD, PRD 매핑)
- **통합 테스트**: Hono `app.request()` 직접 호출, D1 mock (in-memory SQLite)
- **LLM 테스트**: `AgentRunner` mock — 고정 응답으로 PRD 생성 흐름 검증

### 8.2 Web 테스트

- **컴포넌트 테스트**: 9기준 진행률 바, 가이드 패널, PRD 뷰어
- **E2E**: 9기준 체크 → PRD 생성 플로우 (Playwright)

---

## 9. Risks & Mitigations

| 리스크 | 영향 | 대응 |
|--------|------|------|
| PRD LLM 품질 편차 | PRD 일관성 저하 | 템플릿 구조화로 LLM 의존도 최소화 + 프롬프트 튜닝 |
| 9기준 자동 체크 오탐 | 사용자 혼란 | 자동 체크는 "제안"으로만 표시, 최종 확인은 담당자 |
| pm-skills 프롬프트 호환성 | 가이드와 실제 실행 불일치 | 가이드 데이터를 정적으로 관리, pm-skills 버전 변경 시 수동 업데이트 |
| 대시보드 UI 복잡도 | Sprint 내 완료 어려움 | 기본 UI만 구현, 시각화 고도화는 F189(P2)로 이관 |

---

## 10. Success Criteria

| 지표 | 목표 |
|------|------|
| API 테스트 통과율 | 100% (신규 ~62 tests) |
| Web 테스트 통과율 | 100% (신규 ~6 tests) |
| Match Rate (Gap Analysis) | ≥ 90% |
| 9기준 → PRD 매핑 정확도 | 9/9 섹션 모두 데이터 포함 |
| PRD 생성 E2E | 시작점 분류 → 9기준 충족 → PRD 원클릭 생성 성공 |
