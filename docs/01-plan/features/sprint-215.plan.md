---
code: FX-PLAN-215
title: Sprint 215 — 사업기획서 편집기 + 템플릿 다양화
version: 1.0
status: Draft
category: PLAN
system-version: Sprint 215
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
---

# Sprint 215 Plan — 사업기획서 편집기 + 템플릿 다양화

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 사업기획서가 AI로 자동 생성되지만 읽기 전용이라, 실무 활용 시 수동 보완이 불가능하고 용도별 형식을 선택할 수 없어요. |
| **Solution** | 섹션별 인라인 편집 + AI 재생성 기능으로 편집을 지원하고, 3종 템플릿(내부보고/제안서/IR피치)으로 용도에 맞는 기획서를 생성해요. |
| **Function UX Effect** | `BusinessPlanViewer`를 편집 가능한 컴포넌트로 확장하고, 생성 시작 시 템플릿 선택 UI를 제공해요. |
| **Core Value** | 생성 → 편집 → 내보내기(F446) 흐름을 완성하여 기획서를 "실무 가능한 문서"로 격상시켜요. |

## 1. 목표

F440에서 구현된 사업기획서 "생성 + 열람" 기능을 **편집 레이어**와 **템플릿 시스템**으로 고도화한다.

- **F444**: `BusinessPlanViewer` → `BusinessPlanEditor`로 확장. 섹션별 편집 + AI 재생성 버튼 + 버전 이력 diff UI
- **F445**: 생성 시 템플릿 3종 선택 + 톤/분량 파라미터. D1 `plan_templates` 테이블 추가

## 2. F-items

| F# | 제목 | REQ | 우선순위 |
|----|------|-----|---------|
| F444 | 사업기획서 편집기 — 섹션별 인라인 편집 + AI 재생성 + 버전 이력 | FX-REQ-436 | P0 |
| F445 | 기획서 템플릿 다양화 — 용도별 3종 + 톤/분량 커스텀 | FX-REQ-437 | P0 |

## 3. 현재 상태 (As-Is)

### 기획서 데이터 구조

```
business_plan_drafts (D1, 0042 마이그레이션)
  id, biz_item_id, version, content (전체 마크다운),
  sections_snapshot, model_used, tokens_used, generated_at
```

### 기존 코드 경로

| 파일 | 역할 |
|------|------|
| `packages/api/src/core/offering/services/business-plan-generator.ts` | 생성 서비스 (F180) |
| `packages/api/src/core/offering/services/business-plan-template.ts` | 10섹션 정의 + 마크다운 렌더링 (F180) |
| `packages/api/src/core/offering/services/bdp-service.ts` | BDP 버전 관리 (bdp_versions 테이블, F234) |
| `packages/api/src/core/offering/routes/bdp.ts` | BDP CRUD API (F234) |
| `packages/web/src/components/feature/discovery/BusinessPlanViewer.tsx` | 읽기 전용 뷰어 (F440) |
| `packages/web/src/routes/ax-bd/discovery-detail.tsx` | 기획서 생성 + 열람 진입점 (F440) |

### Gap 분석

1. `BusinessPlanViewer`는 읽기 전용 — 편집 불가
2. 섹션별 편집 UI 없음
3. "AI 재생성" 기능 없음
4. 버전 diff 비교 UI 없음 (버전 목록만 존재)
5. 생성 시 템플릿 선택 UI 없음 (항상 10섹션 고정 포맷)
6. `plan_templates` 테이블 없음

## 4. 목표 상태 (To-Be)

### F444: 사업기획서 편집기

```
기획서 뷰 (discovery-detail.tsx)
  ├── [편집 모드 진입 버튼]
  │     → BusinessPlanEditor 컴포넌트 활성화
  │
  ├── BusinessPlanEditor (신규)
  │     ├── SectionEditor[] — 10섹션 각각 textarea
  │     │     └── [AI 재생성] 버튼 → PATCH /api/biz-items/:id/business-plan/sections/:num
  │     ├── [저장] → POST /api/biz-items/:id/business-plan/versions (새 버전 생성)
  │     └── [취소] → 원본으로 복원
  │
  └── VersionHistoryPanel (신규)
        ├── 버전 목록 (GET /api/biz-items/:id/business-plan/versions)
        └── 버전 diff → GET /api/biz-items/:id/business-plan/versions/:v1/diff/:v2
```

**편집 저장 전략**: 섹션별 편집은 클라이언트에서 누적하다가 "저장" 시 `content` 전체를 재조합하여 새 버전으로 저장. `sections_json` 컬럼 추가로 섹션별 내용 별도 저장.

### F445: 기획서 템플릿 다양화

```
생성 버튼 클릭 시 → TemplateSelector 모달 (신규)
  ├── 내부보고: 요약 중심, 2~3페이지, 핵심 지표 강조
  ├── 제안서: 고객 관점, 5~7페이지, 문제→해결→효과
  └── IR피치: 투자자 관점, 10슬라이드, 시장→제품→비즈모델→팀
      + 톤: [공식] / [친근]
      + 분량: [짧게] / [보통] / [길게]

POST /api/biz-items/:id/business-plan/generate
  { templateType: 'internal'|'proposal'|'ir-pitch', tone: 'formal'|'casual', length: 'short'|'medium'|'long' }
```

**템플릿 구현 전략**: 별도 D1 테이블 대신 `business-plan-template.ts`에 템플릿별 섹션 구성을 코드로 정의. `plan_templates` 테이블은 커스텀 템플릿 저장 용도로만 최소화.

## 5. 변경 대상 파일

| 파일 | 변경 유형 | 담당 |
|------|----------|------|
| `packages/api/src/db/migrations/0117_bp_editor.sql` | **신규** | business_plan_sections + plan_templates 테이블 |
| `packages/api/src/core/offering/services/business-plan-generator.ts` | **수정** | 템플릿 파라미터 지원 + 섹션별 AI 재생성 메서드 |
| `packages/api/src/core/offering/services/business-plan-template.ts` | **수정** | 3종 템플릿 섹션 구성 추가 |
| `packages/api/src/core/offering/routes/business-plan.ts` | **신규** | PATCH /sections/:num, GET /versions, GET /diff |
| `packages/api/src/core/offering/schemas/business-plan.schema.ts` | **신규** | Zod 스키마 |
| `packages/api/src/core/discovery/routes/biz-items.ts` | **수정** | 기획서 생성 API에 templateType 파라미터 추가 |
| `packages/web/src/components/feature/discovery/BusinessPlanEditor.tsx` | **신규** | 편집기 컴포넌트 (F444) |
| `packages/web/src/components/feature/discovery/SectionEditor.tsx` | **신규** | 섹션별 textarea + AI 재생성 버튼 |
| `packages/web/src/components/feature/discovery/VersionHistoryPanel.tsx` | **신규** | 버전 목록 + diff UI |
| `packages/web/src/components/feature/discovery/TemplateSelector.tsx` | **신규** | 템플릿 선택 모달 (F445) |
| `packages/web/src/routes/ax-bd/discovery-detail.tsx` | **수정** | 편집기 진입 + 템플릿 선택 연결 |
| `packages/web/src/lib/api-client.ts` | **수정** | 신규 API 메서드 추가 |
| `packages/api/src/__tests__/business-plan-editor.test.ts` | **신규** | 편집 + AI 재생성 + 버전 diff 테스트 |
| `packages/api/src/__tests__/business-plan-template-types.test.ts` | **신규** | 3종 템플릿 생성 테스트 |

## 6. 구현 순서

```
Step 1: D1 마이그레이션 (0117)
  - business_plan_sections: id, draft_id, section_num, content, updated_at
  - plan_templates: id, org_id, name, template_type, tone, length, created_at

Step 2: API — 섹션 관리 (F444)
  - business-plan.schema.ts (Zod 스키마)
  - business-plan.ts 라우트: PATCH /sections/:num, GET /versions, GET /diff
  - business-plan-generator.ts: regenerateSection() 메서드 추가

Step 3: API — 템플릿 지원 (F445)
  - business-plan-template.ts: 3종 템플릿 섹션 구성 추가
  - business-plan-generator.ts: generate() 에 templateType/tone/length 파라미터
  - biz-items.ts: 기획서 생성 파라미터 확장

Step 4: Web — 편집 UI (F444)
  - SectionEditor.tsx (섹션 textarea + AI 재생성)
  - BusinessPlanEditor.tsx (10섹션 편집기 통합)
  - VersionHistoryPanel.tsx (버전 목록 + diff)
  - discovery-detail.tsx 연결

Step 5: Web — 템플릿 UI (F445)
  - TemplateSelector.tsx (3종 + 톤/분량 선택)
  - discovery-detail.tsx 연결 (생성 전 모달)

Step 6: 테스트
  - business-plan-editor.test.ts
  - business-plan-template-types.test.ts
```

## 7. 설계 결정

### D1: 섹션 편집 저장 방식
- **A) 섹션별 개별 저장** — `business_plan_sections` 테이블에 섹션번호별 row
- **B) 전체 재저장** — 편집 완료 시 content 전체를 새 버전으로 저장

**결정: A+B 혼합** — 편집 중엔 섹션별로 추적(A), 최종 저장 시 sections를 조합하여 `business_plan_drafts`에 새 버전으로 저장(B). 두 테이블을 모두 활용.

### D2: 템플릿 코드화 vs DB화
- **A) 코드 하드코딩** — `business-plan-template.ts`에 3종 섹션 구성 정의
- **B) DB 기반** — `plan_templates` 테이블에 템플릿 내용 저장

**결정: A** — 3종은 고정 포맷이므로 코드가 적합. `plan_templates` 테이블은 향후 사용자 정의 템플릿 저장용으로만 최소 생성.

### D3: AI 재생성 섹션 프롬프트
- 해당 섹션 컨텍스트(섹션 번호 + 제목 + 기존 내용 + bizItem 정보)를 OpenRouter에 전달
- 기존 `refineWithLlm()` 패턴을 단일 섹션에 적용

## 8. 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| AI 재생성 Workers CPU 시간 초과 | F444 섹션별 재생성 실패 | 섹션당 별도 API 호출 (짧은 프롬프트) + 타임아웃 30초 |
| Diff UI 복잡도 | 구현 시간 초과 | 단순 라인 비교(text diff)로 시작, 풍부한 diff는 F446 이후 |
| `business_plan_sections` 테이블과 `business_plan_drafts` 동기화 | 데이터 정합성 | 저장 시 트랜잭션으로 묶어 처리 |

## 9. 검증 기준

| 항목 | 기준 |
|------|------|
| 편집기 진입 | 기획서 뷰에서 "편집" 버튼 클릭 시 SectionEditor 표시 |
| 섹션 저장 | 편집 후 "저장" → 새 버전 생성 → `business_plan_drafts.version` 증가 |
| AI 재생성 | 섹션 "AI 재생성" → 해당 섹션 내용 갱신 |
| 버전 이력 | 버전 목록 + 두 버전 diff 표시 |
| 템플릿 선택 | 생성 클릭 → TemplateSelector 모달 → 3종 선택 가능 |
| 톤/분량 | formal/casual, short/medium/long 파라미터 생성 반영 |
| 테스트 pass | `turbo test` 신규 테스트 2파일 all pass |
