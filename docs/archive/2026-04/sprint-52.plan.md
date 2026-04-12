---
code: FX-PLAN-052
title: Sprint 52 — 5시작점 분류 + 경로 안내 (F182)
version: 0.1
status: Draft
category: PLAN
created: 2026-03-24
updated: 2026-03-24
author: Sinclair Seo
---

# Sprint 52 Planning Document

> **Summary**: 사업 아이템의 5가지 시작점(아이디어/시장·타겟/고객문제/기술/기존서비스)을 LLM 기반으로 분류하고, 시작점별 분석 경로(pm-skills 매핑)를 자동 안내하는 API + 대시보드 UI를 구현한다.
>
> **Project**: Foundry-X
> **Version**: Sprint 52 (api 0.1.0)
> **Author**: Sinclair Seo
> **Date**: 2026-03-24
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 사업 아이템을 등록한 뒤 "어디서부터 분석해야 하지?"라는 질문에 답이 없다. 담당자 경험에 따라 분석 시작점이 다르고, 어떤 pm-skills 스킬을 언제 실행해야 하는지 가이드가 없어 분석이 비체계적으로 진행된다. |
| **Solution** | F182: LLM 기반 5시작점 분류기(StartingPointClassifier) + 시작점별 분석 경로 매핑 API + 대시보드 경로 안내 UI. 기존 BizItem에 시작점 필드를 추가하고, 분류 결과에 따라 단계별 활동 + pm-skills 스킬 목록을 반환한다. |
| **Function/UX Effect** | 담당자가 사업 아이템을 등록하면 → LLM이 5시작점 중 하나를 자동 분류 → "기술에서 시작" 등 시작점 배지 표시 → "다음 단계: /market-scan으로 산업별 적용 분야 매핑" 같은 경로 가이드를 제공. 담당자 확인 후 분석 착수. |
| **Core Value** | "아이템 등록 즉시 분석 경로가 보인다" — 초급 담당자도 표준화된 Discovery 프로세스에 진입 가능, 분석 시작 시간 1~2일 → 즉시 |

---

## 1. Overview

### 1.1 Purpose

BDP-002 PRD §4.1 #1(5가지 시작점 분류) + #2(시작점별 분석 경로)를 Foundry-X API + 대시보드에 구현하여, 사업 아이템 등록 후 표준화된 분석 진입점과 경로를 자동으로 제공한다.

### 1.2 Background

- **BDP-001 (AX-Discovery-Process v0.8)**: 6단계 프로세스 정의. 2단계 발굴에서 Type A(벤치마크)/B(트렌드)/C(Pain) 3유형으로 분류
- **BDP-002 (Harness Engineering PRD)**: 5시작점 체계로 재정의 — 아이디어/시장·타겟/고객문제/기술/기존서비스
- **Sprint 51**: `ItemClassifier` (Type A/B/C 분류) + `BizItemService` (CRUD) + `biz_items` 테이블 구현 완료
- **기존 인프라**:
  - ✅ `biz_items` 테이블 (0033 마이그레이션)
  - ✅ `biz_item_classifications` 테이블 (item_type = type_a/b/c)
  - ✅ `ItemClassifier` 서비스 (3턴 대화 → LLM → JSON 파싱)
  - ✅ `AgentRunner` (LLM 호출 래퍼)
  - ✅ `biz-items` 라우트 (POST/GET/PATCH + classify/evaluate)
- **빠진 부분**:
  - ❌ 5시작점 분류 로직 (아이디어/시장·타겟/고객문제/기술/기존서비스)
  - ❌ 시작점별 분석 경로 데이터 (단계 × 활동 × pm-skills 매핑)
  - ❌ 경로 안내 API 엔드포인트
  - ❌ 대시보드 UI (시작점 배지 + 경로 스텝퍼)

### 1.3 Related Documents

- SPEC.md §5: F182 (FX-REQ-182, P0)
- [[FX-SPEC-BDP-002-PRD]]: `docs/specs/bizdevprocess-2/prd-final.md` §4.1 #1+#2
- [[FX-SPEC-BDP-002]]: `docs/specs/bizdevprocess-2/AX-Discovery-Harness-v1.0-summary.md` §4
- Sprint 51 Plan: `docs/archive/2026-03/sprint-51/sprint-51.plan.md`

---

## 2. Scope

### 2.1 In Scope (F182)

| # | 항목 | 설명 |
|---|------|------|
| 1 | **StartingPointClassifier 서비스** | LLM 기반 5시작점 분류기. 기존 ItemClassifier와 동일 패턴(AgentRunner 사용), 별도 서비스로 구현 |
| 2 | **분석 경로 데이터** | 5시작점 × 단계별 활동 × pm-skills 매핑을 정적 데이터로 정의 (BDP-002 §4 기반) |
| 3 | **D1 스키마 확장** | `biz_item_starting_points` 테이블 — 시작점 분류 결과 + 분석 경로 진행 상태 저장 |
| 4 | **API 엔드포인트** | `POST /biz-items/:id/starting-point` (분류), `GET /biz-items/:id/analysis-path` (경로 조회) |
| 5 | **대시보드 UI** | 시작점 배지 + 분석 경로 스텝퍼 (단계별 활동 + pm-skills 링크) |
| 6 | **담당자 확인 UX** | 자동 분류 후 담당자가 확인/수정 가능 (PRD §10.1 예외처리) |

### 2.2 Out of Scope

| 항목 | 사유 |
|------|------|
| Discovery 9기준 체크리스트 | F183 범위 |
| pm-skills 실행 가이드 + 컨텍스트 관리 | F184 범위 |
| PRD 자동 생성 | F185 범위 |
| Type A/B/C 분류기 대체 | 기존 분류기는 유지 (수집 유형 ≠ 분석 진입점) |
| pm-skills 실제 호출/연동 | Phase 5b 이후. 현재는 "어떤 스킬을 실행하세요" 가이드만 제공 |

---

## 3. Feature Design

### 3.1 5가지 시작점 정의

| ID | 시작점 | 설명 (BDP-002 §4) | 핵심 첫 단계 |
|----|--------|-------------------|-------------|
| `idea` | 아이디어에서 시작 | 솔루션 아이디어는 있지만 근거가 없다 | /brainstorm → Pain point 가설 |
| `market` | 시장 또는 타겟에서 시작 | 누구를 볼지는 알지만 무엇을 만들지 모른다 | /interview → JTBD 나열 |
| `problem` | 고객 문제에서 시작 | 고객 문제는 발견했지만 해결 방법이 없다 | /market-scan → 기술/트렌드 리서치 |
| `tech` | 기술에서 시작 | 강력한 기술은 있지만 어디에 쓸지 모른다 | /market-scan → 산업별 적용 분야 매핑 |
| `service` | 기존 서비스에서 시작 | 운영 중인 사업에서 시작하고 싶다 | /business-model → 가치 사슬 분석 |

### 3.2 분석 경로 데이터 구조

BDP-002 §4의 5개 시작점별 분석 경로를 정적 데이터로 정의:

```typescript
interface AnalysisStep {
  order: number;          // 단계 순서 (1-based)
  activity: string;       // 활동 설명
  pmSkills: string[];     // 매핑된 pm-skills (예: ["/brainstorm", "/interview"])
  discoveryMapping: number[]; // 관련 Discovery 9기준 번호
}

interface AnalysisPath {
  startingPoint: StartingPointType;
  description: string;    // 시작점 한 줄 설명
  steps: AnalysisStep[];  // 단계별 경로
}
```

### 3.3 StartingPointClassifier 서비스

기존 `ItemClassifier`와 동일 패턴:
- `AgentRunner`로 LLM 단일 호출
- 시스템 프롬프트: 5시작점 정의 + 분류 기준 제공
- 사용자 프롬프트: BizItem의 title + description + source 입력
- 출력: `{ startingPoint, confidence, reasoning }`
- confidence < 0.6이면 `needs_confirmation` 플래그 → 담당자 확인 요청

### 3.4 D1 스키마 확장

```sql
-- 0035_biz_starting_points.sql
CREATE TABLE IF NOT EXISTS biz_item_starting_points (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL UNIQUE,
  starting_point TEXT NOT NULL,  -- idea|market|problem|tech|service
  confidence REAL NOT NULL DEFAULT 0.0,
  reasoning TEXT,
  confirmed_by TEXT,             -- 담당자 확인 시 user_id
  confirmed_at TEXT,
  classified_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);
```

### 3.5 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/biz-items/:id/starting-point` | LLM 기반 5시작점 분류 실행 |
| `PATCH` | `/biz-items/:id/starting-point` | 담당자가 시작점 수정/확인 |
| `GET` | `/biz-items/:id/analysis-path` | 시작점 기반 분석 경로 조회 (단계별 활동 + pm-skills) |

### 3.6 대시보드 UI

- **BizItem 상세 페이지**: 시작점 배지 (예: 🔧 기술에서 시작) + confidence 표시
- **분석 경로 스텝퍼**: 세로 타임라인 UI, 각 단계에 활동 설명 + pm-skills 링크
- **담당자 확인 모달**: confidence < 0.6일 때 "이 시작점이 맞나요?" 확인 UI

---

## 4. Implementation Plan

### 4.1 구현 순서

| # | 항목 | 파일 | 의존성 |
|---|------|------|--------|
| 1 | 분석 경로 정적 데이터 | `packages/api/src/services/analysis-paths.ts` | 없음 |
| 2 | D1 마이그레이션 | `packages/api/src/db/migrations/0035_biz_starting_points.sql` | 없음 |
| 3 | StartingPointClassifier 서비스 | `packages/api/src/services/starting-point-classifier.ts` | #1 |
| 4 | StartingPointClassifier 프롬프트 | `packages/api/src/services/starting-point-prompts.ts` | #1 |
| 5 | Zod 스키마 | `packages/api/src/schemas/starting-point.ts` | 없음 |
| 6 | API 라우트 확장 | `packages/api/src/routes/biz-items.ts` (기존 파일 확장) | #2, #3, #5 |
| 7 | 테스트 | `packages/api/src/__tests__/starting-point*.test.ts` | #1~#6 |
| 8 | 대시보드 UI — 시작점 배지 | `packages/web/src/components/feature/StartingPointBadge.tsx` | #6 |
| 9 | 대시보드 UI — 경로 스텝퍼 | `packages/web/src/components/feature/AnalysisPathStepper.tsx` | #6 |
| 10 | 대시보드 UI — 확인 모달 | `packages/web/src/components/feature/StartingPointConfirm.tsx` | #8 |

### 4.2 예상 산출물

| 항목 | 수치 |
|------|------|
| 신규 서비스 | 2개 (StartingPointClassifier, analysis-paths) |
| 신규 테이블 | 1개 (biz_item_starting_points) |
| 신규 엔드포인트 | 3개 (POST/PATCH/GET starting-point) |
| 신규 Web 컴포넌트 | 3개 (Badge, Stepper, Confirm) |
| 예상 테스트 | ~30개 (서비스 15 + 라우트 10 + 웹 5) |

### 4.3 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| LLM 분류 정확도 부족 | 잘못된 경로 안내 | confidence 임계값(0.6) + 담당자 확인 UX |
| 5시작점 간 경계 모호 | 분류 혼란 | PRD §10.1 중복 분류 허용 + 수동 확인 |
| BDP-001 Type A/B/C와 혼동 | 사용자 UX 혼란 | UI에서 명확히 분리 (수집 유형 vs 분석 진입점) |

---

## 5. Success Criteria

| 항목 | 기준 |
|------|------|
| 5시작점 분류 API | 5종 시작점 모두 분류 가능, confidence 반환 |
| 분석 경로 조회 | 시작점별 단계 + pm-skills 매핑 정확히 반환 |
| 담당자 확인 | confidence < 0.6 시 확인 요청, PATCH로 수정 가능 |
| Match Rate | ≥ 90% |
| 테스트 커버리지 | 신규 코드 90% 이상 |
